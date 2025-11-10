// =============================================================================
// Sync Database Videos to Blockchain
// =============================================================================
// Creates on-chain video accounts for videos that exist in the database
// =============================================================================

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Solplay402 } from "../target/types/solplay_402";
import { PublicKey } from "@solana/web3.js";
import pg from "pg";
import * as dotenv from "dotenv";

// Load backend environment variables
dotenv.config({ path: "./backend/.env" });

const { Pool } = pg;

async function main() {
  console.log("🔄 Syncing Database Videos to Blockchain");
  console.log("=========================================\n");
  console.log("⚠️  WARNING: This script will create videos with the authority");
  console.log("   as the creator, not the original DB creators.");
  console.log("   This is for testing/migration only.\n");
  console.log(
    "   For production, creators should sign their own video uploads.\n"
  );

  // Set up Anchor provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solplay402 as Program<Solplay402>;
  const authority = provider.wallet as anchor.Wallet;

  console.log("📋 Configuration:");
  console.log(`   Program ID: ${program.programId.toString()}`);
  console.log(`   Authority: ${authority.publicKey.toString()}`);
  console.log(`   Network: ${provider.connection.rpcEndpoint}\n`);

  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get all videos from database
    console.log("📊 Fetching videos from database...");
    const result = await pool.query(`
      SELECT 
        id, 
        title, 
        creator_pubkey, 
        ipfs_cid,
        price,
        duration,
        status
      FROM videos 
      WHERE status = 'ready'
      ORDER BY id ASC
    `);

    const videos = result.rows;
    console.log(`   Found ${videos.length} videos\n`);

    if (videos.length === 0) {
      console.log("ℹ️  No videos to sync");
      return;
    }

    // Platform PDA
    const [platformPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      program.programId
    );

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    // Process each video
    for (const video of videos) {
      console.log(`\n📹 Processing Video #${video.id}: "${video.title}"`);
      console.log(`   Creator: ${video.creator_pubkey}`);
      console.log(`   IPFS CID: ${video.ipfs_cid}`);

      try {
        // Derive video PDA using video_id as string (not bytes)
        const videoIdStr = video.id.toString();

        const [videoPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("video"), Buffer.from(videoIdStr)],
          program.programId
        );

        console.log(`   Video PDA: ${videoPda.toString()}`);

        // Check if video already exists on-chain
        try {
          const existingVideo = await program.account.video.fetch(videoPda);
          console.log(`   ⏭️  Video already exists on-chain, skipping`);
          skipCount++;
          continue;
        } catch (err) {
          // Video doesn't exist, we'll create it
        }

        // Derive creator earnings PDA (based on the video account, not creator pubkey)
        const [creatorEarningsPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("creator_earnings"), videoPda.toBuffer()],
          program.programId
        );

        // Prepare video data
        const pricePerChunk = new BN(
          Math.floor(parseFloat(video.price || "0.001") * 1_000_000)
        ); // Convert to lamports (6 decimals)
        const totalChunks = video.duration
          ? Math.ceil(video.duration / 5)
          : 100; // 5 seconds per chunk
        const title = video.title.substring(0, 200); // Max 200 chars
        const description = ""; // Empty description for now

        console.log(`   Price per chunk: ${pricePerChunk.toString()} tokens`);
        console.log(`   Total chunks: ${totalChunks}`);

        // Create video on-chain using authority wallet as payer
        // The creator field in the video struct will be set from the instruction
        console.log(`   🚀 Creating video on blockchain...`);
        console.log(
          `   📝 Note: Using authority as payer, creator will be: ${video.creator_pubkey}`
        );

        const tx = await program.methods
          .createVideo(
            videoIdStr,
            video.ipfs_cid,
            totalChunks,
            pricePerChunk,
            title,
            description
          )
          .accountsPartial({
            video: videoPda,
            platform: platformPda,
            creatorEarnings: creatorEarningsPda,
            creator: authority.publicKey, // Authority pays and signs
          })
          .rpc();

        console.log(`   ✅ Success! Transaction: ${tx}`);
        successCount++;
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        failCount++;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Sync Complete!");
    console.log("=".repeat(50));
    console.log(`✅ Created: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount} (already exist)`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📈 Total: ${videos.length}`);
  } catch (error: any) {
    console.error("\n❌ Sync failed:");
    console.error(error);
    throw error;
  } finally {
    await pool.end();
  }
}

main()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:");
    console.error(error);
    process.exit(1);
  });
