// =============================================================================
// Events - Used for audit trail instead of storing expensive account data
// =============================================================================
//
// IMPORTANT: String fields in events must be bounded to prevent Solana
// transaction/log size failures. All String fields are validated before
// event emission in their respective instruction handlers.
//
// String length limits (enforced in constants.rs):
// - video_id: 64 chars
// - ipfs_hash: 128 chars (CIDv0=46, CIDv1=59)
// - title: 200 chars
// =============================================================================

use anchor_lang::prelude::*;

#[event]
pub struct PlatformInitialized {
    pub platform: Pubkey,
    pub token_mint: Pubkey,
    pub platform_fee_basis_points: u16,
    pub min_price_per_chunk: u64,
    pub timestamp: i64,
}

// Event emitted when a new video is registered
// NOTE: String fields are bounded to prevent event serialization bloat:
// - video_id: max 64 chars (validated in create_video)
// - ipfs_hash: max 128 chars (typically 46 for CIDv0, 59 for CIDv1, validated in create_video)
// - title: max 200 chars (validated in create_video)
// All validations enforce these limits before emission to prevent tx/log size failures
#[event]
pub struct VideoCreated {
    pub video: Pubkey,
    pub creator: Pubkey,
    pub video_id: String,  // Max 64 chars (enforced)
    pub ipfs_hash: String, // Max 128 chars (enforced) - CIDv0=46, CIDv1=59
    pub total_chunks: u32,
    pub price_per_chunk: u64,
    pub title: String, // Max 200 chars (enforced)
    pub timestamp: i64,
}

#[event]
pub struct VideoUpdated {
    pub video: Pubkey,
    pub creator: Pubkey,
    pub price_per_chunk: Option<u64>,
    pub is_active: Option<bool>,
    pub timestamp: i64,
}

#[event]
pub struct DelegationApproved {
    pub viewer: Pubkey,
    pub video: Pubkey,
    pub viewer_session: Pubkey,
    pub max_approved_chunks: u32,
    pub locked_price_per_chunk: u64,
    pub is_reapproval: bool,
    pub timestamp: i64,
}

#[event]
pub struct ChunkPaid {
    pub viewer: Pubkey,
    pub video: Pubkey,
    pub creator: Pubkey,
    pub chunk_index: u32,
    pub payment_sequence: u32, // Track payment order
    pub amount_paid: u64,
    pub platform_fee: u64,
    pub creator_amount: u64,
    pub chunks_remaining: u32,
    pub timestamp: i64,
}

#[event]
pub struct DelegationRevoked {
    pub viewer: Pubkey,
    pub video: Pubkey,
    pub viewer_session: Pubkey,
    pub chunks_consumed: u32,
    pub total_spent: u64,
    pub timestamp: i64,
}

#[event]
pub struct SessionClosed {
    pub viewer: Pubkey,
    pub video: Pubkey,
    pub viewer_session: Pubkey,
    pub chunks_consumed: u32,
    pub total_spent: u64,
    pub timestamp: i64,
}

// Event emitted when a session expires or becomes inactive
// NOTE: reason field contains only small fixed strings ("expired" or "inactive")
#[event]
pub struct SessionExpired {
    pub viewer: Pubkey,
    pub video: Pubkey,
    pub reason: String, // Fixed values: "expired" or "inactive" (max ~10 chars)
    pub timestamp: i64,
}

// Event emitted when a batch settlement is processed (x402 flow)
// This event is critical for backend synchronization - tracks off-chain
// chunk consumption that was paid via HTTP x402 micropayments
#[event]
pub struct SessionSettled {
    pub viewer: Pubkey,
    pub video: Pubkey,
    pub viewer_session: Pubkey,
    pub chunk_count: u32,          // Number of chunks in this settlement batch
    pub total_payment: u64,        // Total tokens paid (before split)
    pub platform_fee: u64,         // 10% platform fee
    pub creator_amount: u64,       // 90% to creator
    pub chunks_consumed: u32,      // Total chunks consumed after settlement
    pub chunks_remaining: u32,     // Chunks left in approval
    pub settlement_timestamp: i64, // When settlement was requested
    pub timestamp: i64,            // When settlement was processed on-chain
}
