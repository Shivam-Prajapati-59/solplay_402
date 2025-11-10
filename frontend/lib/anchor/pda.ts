// =============================================================================
// PDA (Program Derived Address) Utilities
// =============================================================================
// Helper functions to derive PDAs for the SolPlay 402 program
// =============================================================================

import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./program";

// Seeds constants (must match Rust program)
export const PLATFORM_SEED = Buffer.from("platform");
export const VIDEO_SEED = Buffer.from("video");
export const VIEWER_SESSION_SEED = Buffer.from("viewer_session");
export const CREATOR_EARNINGS_SEED = Buffer.from("creator_earnings");

/**
 * Derive Platform PDA
 * Seeds: [b"platform"]
 */
export function derivePlatformPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([PLATFORM_SEED], PROGRAM_ID);
}

/**
 * Derive Video PDA
 * Seeds: [b"video", video_id]
 * @param videoId - Unique video identifier (string)
 */
export function deriveVideoPda(videoId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VIDEO_SEED, Buffer.from(videoId)],
    PROGRAM_ID
  );
}

/**
 * Derive ViewerSession PDA
 * Seeds: [b"viewer_session", viewer_pubkey, video_pda]
 * @param viewerPubkey - Viewer's wallet public key
 * @param videoPda - Video PDA
 */
export function deriveViewerSessionPda(
  viewerPubkey: PublicKey,
  videoPda: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VIEWER_SESSION_SEED, viewerPubkey.toBuffer(), videoPda.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive CreatorEarnings PDA
 * Seeds: [b"creator_earnings", video_pda]
 * @param videoPda - Video PDA
 */
export function deriveCreatorEarningsPda(
  videoPda: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [CREATOR_EARNINGS_SEED, videoPda.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive ProgramData PDA for upgrade authority verification
 * Used during platform initialization
 */
export function deriveProgramDataPda(): [PublicKey, number] {
  const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey(
    "BPFLoaderUpgradeab1e11111111111111111111111"
  );

  return PublicKey.findProgramAddressSync(
    [PROGRAM_ID.toBuffer()],
    BPF_LOADER_UPGRADEABLE_PROGRAM_ID
  );
}

// Export all derivation functions
export const pdaHelpers = {
  derivePlatformPda,
  deriveVideoPda,
  deriveViewerSessionPda,
  deriveCreatorEarningsPda,
  deriveProgramDataPda,
};

export default pdaHelpers;
