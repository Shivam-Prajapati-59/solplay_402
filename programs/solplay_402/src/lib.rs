// =============================================================================
// SolPlay 402 - Decentralized Video Streaming Platform
// =============================================================================
// A pay-per-chunk streaming platform using SPL token delegation
// Optimized for cost efficiency (99.75% savings) and security
// =============================================================================

use anchor_lang::prelude::*;

declare_id!("CM19aL9CP8dRjVzRUEW6AMxYgftdSvPgQ5Yzniq5sPXV");

// Module imports
pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

#[program]
pub mod solplay_402 {
    use super::*;

    /// Initialize the platform with token mint and fee structure
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        platform_fee_basis_points: u16,
        min_price_per_chunk: u64,
    ) -> Result<()> {
        instructions::initialize_platform(ctx, platform_fee_basis_points, min_price_per_chunk)
    }

    /// Register a new video for streaming
    pub fn create_video(
        ctx: Context<CreateVideo>,
        video_id: String,
        ipfs_hash: String,
        total_chunks: u32,
        price_per_chunk: u64,
        title: String,
        description: String,
    ) -> Result<()> {
        instructions::create_video(
            ctx,
            video_id,
            ipfs_hash,
            total_chunks,
            price_per_chunk,
            title,
            description,
        )
    }

    /// Update video metadata or pricing
    pub fn update_video(
        ctx: Context<UpdateVideo>,
        price_per_chunk: Option<u64>,
        is_active: Option<bool>,
    ) -> Result<()> {
        instructions::update_video(ctx, price_per_chunk, is_active)
    }

    /// Approve platform to spend tokens for streaming
    pub fn approve_streaming_delegate(
        ctx: Context<ApproveDelegate>,
        max_chunks: u32,
    ) -> Result<()> {
        instructions::approve_streaming_delegate(ctx, max_chunks)
    }

    /// Settle a batch of chunks consumed via x402 HTTP streaming
    /// Called by backend after accumulating chunk views off-chain
    pub fn settle_session(
        ctx: Context<SettleSession>,
        chunk_count: u32,
        settlement_timestamp: i64,
    ) -> Result<()> {
        instructions::settle_session(ctx, chunk_count, settlement_timestamp)
    }

    /// Pay for a single chunk (sequential only)
    /// NOTE: This instruction is kept for high-value content but bypassed
    /// for x402 micropayments. Use settle_session() for batch settlement.
    pub fn pay_for_chunk(ctx: Context<PayForChunk>, chunk_index: u32) -> Result<()> {
        instructions::pay_for_chunk(ctx, chunk_index)
    }

    /// Revoke streaming delegation
    pub fn revoke_streaming_delegate(ctx: Context<RevokeDelegate>) -> Result<()> {
        instructions::revoke_streaming_delegate(ctx)
    }

    /// Close viewer session (cleanup)
    pub fn close_viewer_session(ctx: Context<CloseViewerSession>) -> Result<()> {
        instructions::close_viewer_session(ctx)
    }
}
