// =============================================================================
// State Accounts
// =============================================================================

use crate::constants::*;
use crate::errors::*;
use anchor_lang::prelude::*;

// =============================================================================
// Platform Account - Global configuration
// =============================================================================

#[account]
pub struct Platform {
    pub authority: Pubkey,              // Platform admin
    pub token_mint: Pubkey,             // USDC or other SPL token mint
    pub platform_fee_basis_points: u16, // Platform fee (e.g., 250 = 2.5%)
    pub min_price_per_chunk: u64,       // Minimum price per chunk
    pub total_videos: u64,              // Statistics
    pub total_sessions: u64,
    pub total_revenue: u64, // Total platform fees collected
    pub bump: u8,
}

impl Platform {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // token_mint
        2 +  // platform_fee_basis_points
        8 +  // min_price_per_chunk
        8 +  // total_videos
        8 +  // total_sessions
        8 +  // total_revenue
        1; // bump

    pub fn calculate_platform_fee(&self, amount: u64) -> Result<u64> {
        let fee = (amount as u128)
            .checked_mul(self.platform_fee_basis_points as u128)
            .ok_or(StreamingError::ArithmeticOverflow)?
            .checked_div(BASIS_POINTS as u128)
            .ok_or(StreamingError::ArithmeticOverflow)?;

        Ok(fee as u64)
    }
}

// =============================================================================
// Video Account - Video metadata and state
// =============================================================================

#[account]
pub struct Video {
    pub creator: Pubkey,          // Video creator
    pub video_id: String,         // Unique identifier
    pub ipfs_hash: String,        // IPFS content hash
    pub total_chunks: u32,        // Total HLS chunks
    pub price_per_chunk: u64,     // Price per chunk in tokens
    pub title: String,            // Video title
    pub description: String,      // Video description
    pub is_active: bool,          // Can be streamed?
    pub total_sessions: u64,      // Unique viewing sessions
    pub total_chunks_served: u64, // Total chunks paid for
    pub created_at: i64,          // Unix timestamp
    pub bump: u8,
}

impl Video {
    pub const MAX_LEN: usize = 8 + // discriminator
        32 + // creator
        4 + MAX_VIDEO_ID_LENGTH + // video_id
        4 + MAX_IPFS_HASH_LENGTH + // ipfs_hash
        4 +  // total_chunks
        8 +  // price_per_chunk
        4 + MAX_TITLE_LENGTH + // title
        4 + MAX_DESCRIPTION_LENGTH + // description
        1 +  // is_active
        8 +  // total_sessions
        8 +  // total_chunks_served
        8 +  // created_at
        1; // bump

    pub fn validate(&self) -> Result<()> {
        require!(
            self.video_id.len() <= MAX_VIDEO_ID_LENGTH,
            StreamingError::VideoIdTooLong
        );
        require!(
            self.ipfs_hash.len() <= MAX_IPFS_HASH_LENGTH,
            StreamingError::IpfsHashTooLong
        );
        require!(
            self.title.len() <= MAX_TITLE_LENGTH,
            StreamingError::TitleTooLong
        );
        require!(
            self.description.len() <= MAX_DESCRIPTION_LENGTH,
            StreamingError::DescriptionTooLong
        );
        require!(
            self.total_chunks <= MAX_TOTAL_CHUNKS,
            StreamingError::TooManyChunks
        );
        Ok(())
    }
}

// =============================================================================
// ViewerSession - Tracks individual viewing session with delegation
// =============================================================================

#[account]
pub struct ViewerSession {
    pub viewer: Pubkey,                     // Viewer's wallet
    pub video: Pubkey,                      // Video being watched
    pub max_approved_chunks: u32,           // Total chunks approved by viewer
    pub chunks_consumed: u32,               // Chunks already paid for
    pub total_spent: u64,                   // Total tokens spent
    pub approved_price_per_chunk: u64,      // Price locked at approval time
    pub last_paid_chunk_index: Option<u32>, // Last sequential chunk paid (None = no chunks paid yet)
    pub session_start: i64,                 // Unix timestamp
    pub last_activity: i64,                 // Last chunk payment time
    pub bump: u8,
}

impl ViewerSession {
    pub const LEN: usize = 8 + // discriminator
        32 + // viewer
        32 + // video
        4 +  // max_approved_chunks
        4 +  // chunks_consumed
        8 +  // total_spent
        8 +  // approved_price_per_chunk
        5 +  // last_paid_chunk_index (Option<u32>: 1 byte discriminator + 4 bytes)
        8 +  // session_start
        8 +  // last_activity
        1; // bump

    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time - self.session_start > SESSION_EXPIRY_DURATION
    }

    pub fn is_inactive(&self, current_time: i64) -> bool {
        current_time - self.last_activity > SESSION_INACTIVITY_DURATION
    }

    pub fn has_approval_remaining(&self) -> bool {
        self.chunks_consumed < self.max_approved_chunks
    }

    pub fn is_next_chunk_sequential(&self, chunk_index: u32) -> bool {
        match self.last_paid_chunk_index {
            None => chunk_index == 0,              // First chunk must be index 0
            Some(last) => chunk_index == last + 1, // Must be exactly next chunk
        }
    }

    pub fn update_activity(&mut self, current_time: i64, chunk_index: u32) {
        self.last_activity = current_time;
        self.chunks_consumed += 1;
        self.last_paid_chunk_index = Some(chunk_index);
    }
}

// =============================================================================
// CreatorEarnings - Track creator's earnings per video
// =============================================================================

#[account]
pub struct CreatorEarnings {
    pub creator: Pubkey,
    pub video: Pubkey,
    pub total_earned: u64,      // Total tokens earned
    pub total_sessions: u64,    // Total unique sessions
    pub total_chunks_sold: u64, // Total chunks sold
    pub bump: u8,
}

impl CreatorEarnings {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        32 + // video
        8 +  // total_earned
        8 +  // total_sessions
        8 +  // total_chunks_sold
        1; // bump
}
