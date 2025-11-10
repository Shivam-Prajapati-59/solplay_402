// =============================================================================
// Blockchain Service
// =============================================================================
// High-level service for all blockchain operations
// =============================================================================

import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getProgram, PROGRAM_ID, SOLANA_RPC_URL } from "./program";
import {
  derivePlatformPda,
  deriveVideoPda,
  deriveViewerSessionPda,
  deriveCreatorEarningsPda,
} from "./pda";
import {
  createVideo as createVideoInstruction,
  approveStreamingDelegate,
  payForChunk,
  settleSession,
  revokeStreamingDelegate,
  closeViewerSession,
  updateVideo,
} from "./instructions";
import {
  getOrCreateAssociatedTokenAccount,
  getTokenBalance,
  formatTokenAmount,
  parseTokenAmount,
} from "./token-utils";

// Get token mint from environment
const TOKEN_MINT_STR = process.env.NEXT_PUBLIC_TOKEN_MINT;

if (!TOKEN_MINT_STR || TOKEN_MINT_STR === "") {
  console.error("❌ NEXT_PUBLIC_TOKEN_MINT not configured!");
  console.error("📚 Please follow the setup guide in SETUP_GUIDE.md");
  console.error("   1. Run: anchor run initialize-platform");
  console.error("   2. Copy the Token Mint address");
  console.error(
    "   3. Add to frontend/.env.local: NEXT_PUBLIC_TOKEN_MINT=<address>"
  );
  console.error("   4. Restart the frontend dev server");
}

const TOKEN_MINT = TOKEN_MINT_STR
  ? new PublicKey(TOKEN_MINT_STR)
  : new PublicKey("So11111111111111111111111111111111111111112"); // Fallback (will fail)

export class BlockchainService {
  private connection: Connection;
  private program: Program<any> | null = null;
  private wallet: any = null;

  constructor(wallet?: any) {
    this.connection = new Connection(SOLANA_RPC_URL, "confirmed");
    if (wallet) {
      this.setWallet(wallet);
    }
  }

  /**
   * Set wallet and initialize program
   */
  setWallet(wallet: any) {
    this.wallet = wallet;
    if (wallet) {
      this.program = getProgram(wallet, this.connection);
    }
  }

  /**
   * Get platform configuration
   */
  async getPlatformConfig() {
    const [platformPda] = derivePlatformPda();
    const program = this.program || getProgram({} as any, this.connection);

    try {
      const platform = await (program.account as any).platform.fetch(
        platformPda
      );
      return {
        authority: platform.authority,
        tokenMint: platform.tokenMint,
        platformFeeBasisPoints: platform.platformFeeBasisPoints,
        minPricePerChunk: platform.minPricePerChunk,
        totalVideos: platform.totalVideos,
        totalSessions: platform.totalSessions,
        totalRevenue: platform.totalRevenue,
      };
    } catch (error) {
      console.error("Error fetching platform config:", error);
      throw new Error("Platform not initialized");
    }
  }

  /**
   * Create video on blockchain
   */
  async createVideo(params: {
    videoId: string;
    ipfsHash: string;
    totalChunks: number;
    pricePerChunk: number; // In tokens (e.g., 0.001)
    title: string;
    description: string;
  }) {
    if (!this.program || !this.wallet?.publicKey) {
      throw new Error("Wallet not connected");
    }

    const pricePerChunkBN = new BN(
      parseTokenAmount(params.pricePerChunk.toString()).toString()
    );

    const signature = await createVideoInstruction(this.program, {
      videoId: params.videoId,
      ipfsHash: params.ipfsHash,
      totalChunks: params.totalChunks,
      pricePerChunk: pricePerChunkBN,
      title: params.title,
      description: params.description,
      creator: this.wallet.publicKey,
    });

    // Get video PDA
    const [videoPda] = deriveVideoPda(params.videoId);
    const [creatorEarningsPda] = deriveCreatorEarningsPda(videoPda);

    return {
      signature,
      videoPda: videoPda.toString(),
      creatorEarningsPda: creatorEarningsPda.toString(),
    };
  }

  /**
   * Get video details from blockchain
   */
  async getVideo(videoId: string) {
    const program = this.program || getProgram({} as any, this.connection);
    const [videoPda] = deriveVideoPda(videoId);

    try {
      const video = await (program.account as any).video.fetch(videoPda);
      return {
        creator: video.creator,
        videoId: video.videoId,
        ipfsHash: video.ipfsHash,
        totalChunks: video.totalChunks,
        pricePerChunk: video.pricePerChunk,
        title: video.title,
        description: video.description,
        isActive: video.isActive,
        totalSessions: video.totalSessions,
        totalChunksServed: video.totalChunksServed,
        createdAt: new Date(video.createdAt.toNumber() * 1000),
      };
    } catch (error) {
      console.error("Error fetching video:", error);
      return null;
    }
  }

  /**
   * Update video (creator only)
   */
  async updateVideo(params: {
    videoId: string;
    pricePerChunk?: number;
    isActive?: boolean;
  }) {
    if (!this.program || !this.wallet?.publicKey) {
      throw new Error("Wallet not connected");
    }

    const pricePerChunkBN = params.pricePerChunk
      ? new BN(parseTokenAmount(params.pricePerChunk.toString()).toString())
      : undefined;

    const signature = await updateVideo(this.program, {
      videoId: params.videoId,
      pricePerChunk: pricePerChunkBN,
      isActive: params.isActive,
      creator: this.wallet.publicKey,
    });

    return signature;
  }

  /**
   * Approve streaming (viewer creates session and approves tokens)
   */
  async approveStreaming(params: { videoId: string; maxChunks: number }) {
    if (!this.program || !this.wallet?.publicKey) {
      throw new Error("Wallet not connected");
    }

    console.log("🔐 Starting streaming approval...");
    console.log("  Video ID:", params.videoId);
    console.log("  Max Chunks:", params.maxChunks);
    console.log("  Viewer:", this.wallet.publicKey.toString());
    console.log("  Token Mint:", TOKEN_MINT.toString());

    try {
      // Get or create viewer token account
      console.log("📝 Getting viewer token account...");
      const viewerTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        this.connection,
        TOKEN_MINT,
        this.wallet.publicKey,
        this.wallet.publicKey
      );
      console.log(
        "  Viewer Token Account:",
        viewerTokenAccountInfo.address.toString()
      );
      console.log("  Needs Creation:", viewerTokenAccountInfo.needsCreation);

      // Get platform token account
      console.log("📝 Getting platform config...");
      const platformConfig = await this.getPlatformConfig();
      console.log("  Platform Authority:", platformConfig.authority.toString());

      const platformTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        this.connection,
        TOKEN_MINT,
        platformConfig.authority,
        this.wallet.publicKey
      );
      console.log(
        "  Platform Token Account:",
        platformTokenAccountInfo.address.toString()
      );
      console.log("  Needs Creation:", platformTokenAccountInfo.needsCreation);

      // Build transaction
      const tx = new Transaction();

      // Add create token account instructions if needed
      if (
        viewerTokenAccountInfo.needsCreation &&
        viewerTokenAccountInfo.instruction
      ) {
        console.log("  Adding viewer token account creation instruction");
        tx.add(viewerTokenAccountInfo.instruction);
      }
      if (
        platformTokenAccountInfo.needsCreation &&
        platformTokenAccountInfo.instruction
      ) {
        console.log("  Adding platform token account creation instruction");
        tx.add(platformTokenAccountInfo.instruction);
      }

      // Get video PDA
      const [videoPda] = deriveVideoPda(params.videoId);
      console.log("📹 Video PDA:", videoPda.toString());

      // Approve streaming delegate
      console.log("🚀 Calling approve_streaming_delegate instruction...");
      const signature = await approveStreamingDelegate(this.program, {
        videoId: params.videoId,
        maxChunks: params.maxChunks,
        viewer: this.wallet.publicKey,
        viewerTokenAccount: viewerTokenAccountInfo.address,
        platformTokenAccount: platformTokenAccountInfo.address,
        tokenMint: TOKEN_MINT,
      });

      console.log("✅ Approval successful! Signature:", signature);

      const [sessionPda] = deriveViewerSessionPda(
        this.wallet.publicKey,
        videoPda
      );

      return {
        signature,
        sessionPda: sessionPda.toString(),
        viewerTokenAccount: viewerTokenAccountInfo.address.toString(),
      };
    } catch (error: any) {
      console.error("❌ Approval failed:", error);
      console.error("  Error message:", error.message);
      console.error("  Error logs:", error.logs);
      throw new Error(
        `Failed to approve streaming: ${error.message || "Unknown error"}`
      );
    }
  }

  /**
   * Pay for a chunk (DEPRECATED - use settleSession for batch settlement)
   */
  async payForChunk(params: { videoId: string; chunkIndex: number }) {
    if (!this.program || !this.wallet?.publicKey) {
      throw new Error("Wallet not connected");
    }

    console.warn(
      "payForChunk is deprecated. Use settleSession for batch settlement."
    );
    throw new Error(
      "Per-chunk payment is deprecated. Use settleSession for x402 batch settlement."
    );
  }

  /**
   * Settle session - batch payment for chunks consumed (x402 flow)
   */
  async settleSessionBatch(params: {
    videoId: string;
    chunkCount: number;
    platformAuthority: PublicKey;
  }) {
    if (!this.program || !this.wallet?.publicKey) {
      throw new Error("Wallet not connected");
    }

    const settlementTimestamp = new BN(Math.floor(Date.now() / 1000));

    const signature = await settleSession(this.program, {
      videoId: params.videoId,
      chunkCount: params.chunkCount,
      settlementTimestamp,
      viewer: this.wallet.publicKey,
      platformAuthority: params.platformAuthority,
    });

    return {
      signature,
      chunkCount: params.chunkCount,
      settlementTimestamp: settlementTimestamp.toNumber(),
    };
  }

  /**
   * Get viewer session
   */
  async getViewerSession(videoId: string, viewerPubkey?: PublicKey) {
    const program = this.program || getProgram({} as any, this.connection);
    const viewer = viewerPubkey || this.wallet?.publicKey;

    if (!viewer) {
      throw new Error("No viewer pubkey provided");
    }

    const [videoPda] = deriveVideoPda(videoId);
    const [sessionPda] = deriveViewerSessionPda(viewer, videoPda);

    try {
      const session = await (program.account as any).viewerSession.fetch(
        sessionPda
      );
      return {
        sessionPda: sessionPda.toString(),
        viewer: session.viewer,
        video: session.video,
        maxApprovedChunks: session.maxApprovedChunks,
        chunksConsumed: session.chunksConsumed,
        totalSpent: session.totalSpent,
        approvedPricePerChunk: session.approvedPricePerChunk,
        sessionStart: new Date(session.sessionStart.toNumber() * 1000),
        lastActivity: new Date(session.lastActivity.toNumber() * 1000),
      };
    } catch (error) {
      console.error("Error fetching viewer session:", error);
      return null;
    }
  }

  /**
   * Get creator earnings
   */
  async getCreatorEarnings(videoId: string) {
    const program = this.program || getProgram({} as any, this.connection);
    const [videoPda] = deriveVideoPda(videoId);
    const [earningsPda] = deriveCreatorEarningsPda(videoPda);

    try {
      const earnings = await (program.account as any).creatorEarnings.fetch(
        earningsPda
      );
      return {
        creator: earnings.creator,
        video: earnings.video,
        totalEarned: earnings.totalEarned,
        totalSessions: earnings.totalSessions,
        totalChunksSold: earnings.totalChunksSold,
      };
    } catch (error) {
      console.error("Error fetching creator earnings:", error);
      return null;
    }
  }

  /**
   * Get token balance for wallet
   */
  async getWalletTokenBalance(walletPubkey?: PublicKey) {
    const wallet = walletPubkey || this.wallet?.publicKey;
    if (!wallet) {
      throw new Error("No wallet provided");
    }

    const tokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      this.connection,
      TOKEN_MINT,
      wallet,
      wallet
    );

    if (tokenAccountInfo.needsCreation) {
      return {
        balance: BigInt(0),
        formatted: "0",
        tokenAccount: tokenAccountInfo.address.toString(),
        needsCreation: true,
      };
    }

    const balance = await getTokenBalance(
      this.connection,
      tokenAccountInfo.address
    );

    return {
      balance,
      formatted: formatTokenAmount(balance),
      tokenAccount: tokenAccountInfo.address.toString(),
      needsCreation: false,
    };
  }

  /**
   * Revoke streaming delegate
   */
  async revokeStreaming(videoId: string) {
    if (!this.program || !this.wallet?.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Get viewer token account
    const viewerTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      this.connection,
      TOKEN_MINT,
      this.wallet.publicKey,
      this.wallet.publicKey
    );

    const signature = await revokeStreamingDelegate(this.program, {
      videoId,
      viewer: this.wallet.publicKey,
      viewerTokenAccount: viewerTokenAccountInfo.address,
    });

    return signature;
  }

  /**
   * Close viewer session (cleanup)
   */
  async closeSession(videoId: string) {
    if (!this.program || !this.wallet?.publicKey) {
      throw new Error("Wallet not connected");
    }

    const signature = await closeViewerSession(this.program, {
      videoId,
      viewer: this.wallet.publicKey,
    });

    return signature;
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();

export default BlockchainService;
