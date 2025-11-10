// =============================================================================
// Platform Initialization Script
// =============================================================================
// This script creates a token mint and initializes the SolPlay 402 platform
// Run this once after deploying the program
// =============================================================================

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Solplay402 } from "../target/types/solplay_402";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "fs";
import path from "path";

async function main() {
  // Set up provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solplay402 as Program<Solplay402>;
  const payer = provider.wallet as anchor.Wallet;

  console.log("🚀 SolPlay 402 Platform Initialization");
  console.log("=====================================\n");

  console.log("📋 Configuration:");
  console.log(`   Program ID: ${program.programId.toString()}`);
  console.log(`   Authority: ${payer.publicKey.toString()}`);
  console.log(`   Network: ${provider.connection.rpcEndpoint}\n`);

  // Step 1: Derive PDAs
  console.log("🔑 Step 1: Deriving PDAs...");
  const [platformPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform")],
    program.programId
  );
  console.log(`   Platform PDA: ${platformPda.toString()}`);

  const BPF_LOADER_UPGRADEABLE = new PublicKey(
    "BPFLoaderUpgradeab1e11111111111111111111111"
  );
  const [programDataPda] = PublicKey.findProgramAddressSync(
    [program.programId.toBuffer()],
    BPF_LOADER_UPGRADEABLE
  );
  console.log(`   Program Data PDA: ${programDataPda.toString()}\n`);

  // Step 2: Check if platform already exists
  console.log("🔍 Step 2: Checking if platform already exists...");
  let tokenMint: PublicKey;
  let platformExists = false;

  try {
    const existingPlatform = await program.account.platform.fetch(platformPda);
    platformExists = true;
    tokenMint = existingPlatform.tokenMint;
    console.log(`   ✅ Platform already initialized!`);
    console.log(`   Token Mint: ${tokenMint.toString()}\n`);
  } catch (err) {
    console.log(`   ℹ️  Platform not initialized yet\n`);
  }

  // Step 3: Create Token Mint (if needed)
  if (!platformExists) {
    console.log("🪙 Step 3: Creating SPL Token Mint...");
    console.log("   Creating token mint with 6 decimals (like USDC)...");

    tokenMint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey, // Mint authority
      null, // Freeze authority (null = not freezable)
      6 // Decimals (USDC standard)
    );

    console.log(`   ✅ Token Mint created: ${tokenMint.toString()}\n`);

    // Step 4: Create Platform Token Account
    console.log("💰 Step 4: Creating platform token account...");
    const platformTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      tokenMint,
      payer.publicKey // Platform authority owns this
    );
    console.log(
      `   ✅ Platform Token Account: ${platformTokenAccount.address.toString()}\n`
    );

    // Step 5: Initialize Platform
    console.log("🏗️  Step 5: Initializing platform...");
    const platformFeeBps = 250; // 2.5%
    const minPricePerChunk = new BN(1000); // 0.001 tokens (with 6 decimals)

    try {
      const tx = await program.methods
        .initializePlatform(platformFeeBps, minPricePerChunk)
        .accountsPartial({
          platform: platformPda,
          tokenMint: tokenMint,
          programData: programDataPda,
          authority: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`   ✅ Platform initialized!`);
      console.log(`   Transaction: ${tx}\n`);
    } catch (err: any) {
      console.error(`   ❌ Failed to initialize platform:`);
      console.error(`   ${err.message}\n`);
      throw err;
    }
  }

  // Step 6: Mint test tokens (optional, for testing)
  console.log("🎁 Step 6: Minting test tokens (optional)...");
  const shouldMintTestTokens = process.env.MINT_TEST_TOKENS === "true";

  if (shouldMintTestTokens && !platformExists) {
    const authorityTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      tokenMint,
      payer.publicKey
    );

    const testAmount = 1_000_000_000_000; // 1,000,000 tokens
    await mintTo(
      provider.connection,
      payer.payer,
      tokenMint,
      authorityTokenAccount.address,
      payer.publicKey,
      testAmount
    );

    console.log(
      `   ✅ Minted ${testAmount / 1_000_000} test tokens to authority\n`
    );
  } else {
    console.log(`   ⏭️  Skipping test token minting\n`);
  }

  // Step 7: Save configuration
  console.log("💾 Step 7: Saving configuration...");
  const config = {
    programId: program.programId.toString(),
    platformPda: platformPda.toString(),
    tokenMint: tokenMint.toString(),
    platformAuthority: payer.publicKey.toString(),
    network: provider.connection.rpcEndpoint,
    platformFeeBps: 250,
    minPricePerChunk: "1000",
    timestamp: new Date().toISOString(),
  };

  const configPath = path.join(__dirname, "..", "platform-config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`   ✅ Configuration saved to: platform-config.json\n`);

  // Step 8: Display summary
  console.log("✅ Platform Initialization Complete!");
  console.log("====================================\n");
  console.log("📋 Configuration Summary:");
  console.log(`   Program ID: ${config.programId}`);
  console.log(`   Platform PDA: ${config.platformPda}`);
  console.log(`   Token Mint: ${config.tokenMint}`);
  console.log(`   Platform Fee: ${config.platformFeeBps / 100}%`);
  console.log(
    `   Min Price/Chunk: ${config.minPricePerChunk} (0.001 tokens)\n`
  );

  console.log("🔧 Next Steps:");
  console.log("   1. Update frontend/.env.local with NEXT_PUBLIC_TOKEN_MINT");
  console.log("   2. Update backend/.env with TOKEN_MINT");
  console.log("   3. Run the frontend and backend servers");
  console.log("   4. Test video upload and streaming\n");

  console.log("💡 Frontend .env.local:");
  console.log(`   NEXT_PUBLIC_TOKEN_MINT=${config.tokenMint}\n`);

  console.log("💡 Backend .env:");
  console.log(`   TOKEN_MINT=${config.tokenMint}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Initialization failed:");
    console.error(error);
    process.exit(1);
  });
