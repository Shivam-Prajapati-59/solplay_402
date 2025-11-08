// =============================================================================
// Constants
// =============================================================================

use anchor_lang::prelude::*;

// Platform configuration
pub const PLATFORM_SEED: &[u8] = b"platform";
pub const VIDEO_SEED: &[u8] = b"video";
pub const VIEWER_SESSION_SEED: &[u8] = b"viewer_session";
pub const CREATOR_EARNINGS_SEED: &[u8] = b"creator_earnings";

// Limits and constraints
// These limits protect against event serialization bloat and tx/log size failures
pub const MAX_VIDEO_ID_LENGTH: usize = 64; // Video identifier max length
pub const MAX_IPFS_HASH_LENGTH: usize = 128; // IPFS CID max length (CIDv0=46, CIDv1=59, buffer for future)
pub const MAX_TITLE_LENGTH: usize = 200; // Video title max length
pub const MAX_DESCRIPTION_LENGTH: usize = 1000; // Video description max length (not in events)
pub const MAX_CHUNKS_PER_APPROVAL: u32 = 1000; // Max chunks per single approval
pub const MAX_TOTAL_CHUNKS: u32 = 10000; // Max chunks per video

// Time constants (in seconds)
pub const SESSION_EXPIRY_DURATION: i64 = 24 * 60 * 60; // 24 hours
pub const SESSION_INACTIVITY_DURATION: i64 = 60 * 60; // 1 hour

// Fee constants
pub const BASIS_POINTS: u64 = 10000; // 100.00% = 10000 basis points
pub const MAX_PLATFORM_FEE_BPS: u64 = 1000; // Max 10% platform fee
pub const DEFAULT_PLATFORM_FEE_BPS: u64 = 250; // Default 2.5% platform fee

// Minimum pricing
pub const MIN_PRICE_PER_CHUNK: u64 = 1000; // 0.001 USDC (assuming 6 decimals)
