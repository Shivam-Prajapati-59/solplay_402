// =============================================================================
// Anchor Instruction Wrappers
// =============================================================================
// High-level functions to interact with the SolPlay 402 program
// =============================================================================

import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  derivePlatformPda,
  deriveVideoPda,
  deriveViewerSessionPda,
  deriveCreatorEarningsPda,
  deriveProgramDataPda,
} from "./pda";

// =============================================================================
// Platform Instructions
// =============================================================================

/**
 * Initialize the platform (one-time setup)
 * Only the program upgrade authority can call this
 */
export async function initializePlatform(
  program: any,
  tokenMint: PublicKey,
  platformFeeBasisPoints: number,
  minPricePerChunk: BN,
  authority: PublicKey
) {
  const [platformPda] = derivePlatformPda();
  const [programDataPda] = deriveProgramDataPda();

  return await program.methods
    .initializePlatform(platformFeeBasisPoints, minPricePerChunk)
    .accounts({
      platform: platformPda,
      tokenMint,
      programData: programDataPda,
      authority,
      systemProgram: PublicKey.default,
    })
    .rpc();
}

// =============================================================================
// Video Instructions
// =============================================================================

/**
 * Create a new video on the blockchain
 */
export async function createVideo(
  program: any,
  params: {
    videoId: string;
    ipfsHash: string;
    totalChunks: number;
    pricePerChunk: BN;
    title: string;
    description: string;
    creator: PublicKey;
  }
) {
  const [videoPda] = deriveVideoPda(params.videoId);
  const [creatorEarningsPda] = deriveCreatorEarningsPda(videoPda);
  const [platformPda] = derivePlatformPda();

  return await program.methods
    .createVideo(
      params.videoId,
      params.ipfsHash,
      params.totalChunks,
      params.pricePerChunk,
      params.title,
      params.description
    )
    .accounts({
      video: videoPda,
      creatorEarnings: creatorEarningsPda,
      platform: platformPda,
      creator: params.creator,
      systemProgram: PublicKey.default,
    })
    .rpc();
}

/**
 * Update video metadata or pricing
 */
export async function updateVideo(
  program: any,
  params: {
    videoId: string;
    pricePerChunk?: BN;
    isActive?: boolean;
    creator: PublicKey;
  }
) {
  const [videoPda] = deriveVideoPda(params.videoId);
  const [platformPda] = derivePlatformPda();

  return await program.methods
    .updateVideo(params.pricePerChunk || null, params.isActive ?? null)
    .accounts({
      video: videoPda,
      platform: platformPda,
      creator: params.creator,
    })
    .rpc();
}

// =============================================================================
// Streaming / Payment Instructions
// =============================================================================

/**
 * Approve streaming delegate - allows platform to spend tokens
 */
export async function approveStreamingDelegate(
  program: any,
  params: {
    videoId: string;
    maxChunks: number;
    viewer: PublicKey;
    viewerTokenAccount: PublicKey;
    platformTokenAccount: PublicKey;
    tokenMint: PublicKey;
  }
) {
  const [videoPda] = deriveVideoPda(params.videoId);
  const [viewerSessionPda] = deriveViewerSessionPda(params.viewer, videoPda);
  const [creatorEarningsPda] = deriveCreatorEarningsPda(videoPda);
  const [platformPda] = derivePlatformPda();

  return await program.methods
    .approveStreamingDelegate(params.maxChunks)
    .accounts({
      viewerSession: viewerSessionPda,
      video: videoPda,
      creatorEarnings: creatorEarningsPda,
      platform: platformPda,
      tokenMint: params.tokenMint,
      viewerTokenAccount: params.viewerTokenAccount,
      platformTokenAccount: params.platformTokenAccount,
      viewer: params.viewer,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: PublicKey.default,
    })
    .rpc();
}

/**
 * Pay for a single chunk (DEPRECATED - use settleSession for batch settlement)
 */
export async function payForChunk(
  program: any,
  params: {
    videoId: string;
    chunkIndex: number;
    viewer: PublicKey;
    viewerTokenAccount: PublicKey;
    creatorTokenAccount: PublicKey;
    platformTokenAccount: PublicKey;
  }
) {
  const [videoPda] = deriveVideoPda(params.videoId);
  const [viewerSessionPda] = deriveViewerSessionPda(params.viewer, videoPda);
  const [creatorEarningsPda] = deriveCreatorEarningsPda(videoPda);
  const [platformPda] = derivePlatformPda();

  return await program.methods
    .payForChunk(params.chunkIndex)
    .accounts({
      viewerSession: viewerSessionPda,
      video: videoPda,
      creatorEarnings: creatorEarningsPda,
      platform: platformPda,
      viewerTokenAccount: params.viewerTokenAccount,
      creatorTokenAccount: params.creatorTokenAccount,
      platformTokenAccount: params.platformTokenAccount,
      viewer: params.viewer,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Settle session - batch payment for multiple chunks (x402 flow)
 */
export async function settleSession(
  program: any,
  params: {
    videoId: string;
    chunkCount: number;
    settlementTimestamp: BN;
    viewer: PublicKey;
    platformAuthority: PublicKey; // Platform PDA authority
  }
) {
  const [videoPda] = deriveVideoPda(params.videoId);
  const [viewerSessionPda] = deriveViewerSessionPda(params.viewer, videoPda);
  const [creatorEarningsPda] = deriveCreatorEarningsPda(videoPda);
  const [platformPda] = derivePlatformPda();

  return await program.methods
    .settleSession(new BN(params.chunkCount), params.settlementTimestamp)
    .accounts({
      viewer: params.viewer,
      video: videoPda,
      viewerSession: viewerSessionPda,
      creatorEarnings: creatorEarningsPda,
      platform: platformPda,
      platformAuthority: params.platformAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Revoke streaming delegation
 */
export async function revokeStreamingDelegate(
  program: any,
  params: {
    videoId: string;
    viewer: PublicKey;
    viewerTokenAccount: PublicKey;
  }
) {
  const [videoPda] = deriveVideoPda(params.videoId);
  const [viewerSessionPda] = deriveViewerSessionPda(params.viewer, videoPda);
  const [platformPda] = derivePlatformPda();

  return await program.methods
    .revokeStreamingDelegate()
    .accounts({
      viewerSession: viewerSessionPda,
      video: videoPda,
      platform: platformPda,
      viewerTokenAccount: params.viewerTokenAccount,
      viewer: params.viewer,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

/**
 * Close viewer session (cleanup)
 */
export async function closeViewerSession(
  program: any,
  params: {
    videoId: string;
    viewer: PublicKey;
  }
) {
  const [videoPda] = deriveVideoPda(params.videoId);
  const [viewerSessionPda] = deriveViewerSessionPda(params.viewer, videoPda);

  return await program.methods
    .closeViewerSession()
    .accounts({
      viewerSession: viewerSessionPda,
      video: videoPda,
      viewer: params.viewer,
    })
    .rpc();
}

// =============================================================================
// Export all instruction wrappers
// =============================================================================

export const instructions = {
  initializePlatform,
  createVideo,
  updateVideo,
  approveStreamingDelegate,
  payForChunk, // Deprecated
  settleSession, // NEW: Batch settlement
  revokeStreamingDelegate,
  closeViewerSession,
};

export default instructions;
