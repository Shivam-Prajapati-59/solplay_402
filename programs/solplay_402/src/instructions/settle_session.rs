// =============================================================================
// Settle Session Instruction (Batch Settlement for x402)
// =============================================================================
// This instruction settles a batch of chunks consumed via x402 off-chain payments
// Called by backend after accumulating chunk views from HTTP streaming
// =============================================================================

use crate::constants::*;
use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct SettleSession<'info> {
    #[account(
        mut,
        seeds = [VIEWER_SESSION_SEED, viewer_session.viewer.as_ref(), video.key().as_ref()],
        bump = viewer_session.bump,
        constraint = viewer_session.viewer == viewer.key() @ StreamingError::Unauthorized,
        constraint = viewer_session.video == video.key() @ StreamingError::InvalidSession
    )]
    pub viewer_session: Account<'info, ViewerSession>,

    #[account(
        mut,
        seeds = [VIDEO_SEED, video.video_id.as_bytes()],
        bump = video.bump,
        constraint = video.is_active @ StreamingError::VideoNotActive
    )]
    pub video: Account<'info, Video>,

    #[account(
        mut,
        seeds = [CREATOR_EARNINGS_SEED, video.key().as_ref()],
        bump = creator_earnings.bump,
        constraint = creator_earnings.creator == video.creator @ StreamingError::Unauthorized,
        constraint = creator_earnings.video == video.key() @ StreamingError::InvalidCreatorEarnings
    )]
    pub creator_earnings: Account<'info, CreatorEarnings>,

    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, Platform>,

    /// Viewer's token account (source of payment)
    #[account(
        mut,
        constraint = viewer_token_account.owner == viewer.key(),
        constraint = viewer_token_account.mint == platform.token_mint @ StreamingError::InvalidTokenMint
    )]
    pub viewer_token_account: Account<'info, TokenAccount>,

    /// Creator's token account (receives payment)
    #[account(
        mut,
        constraint = creator_token_account.owner == video.creator,
        constraint = creator_token_account.mint == platform.token_mint @ StreamingError::InvalidTokenMint
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// Platform's token account (receives fees)
    #[account(
        mut,
        constraint = platform_token_account.mint == platform.token_mint @ StreamingError::InvalidTokenMint,
        constraint = platform_token_account.owner == platform.authority @ StreamingError::InvalidPlatformAccount
    )]
    pub platform_token_account: Account<'info, TokenAccount>,

    /// Viewer wallet (must sign the settlement transaction)
    pub viewer: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn settle_session(
    ctx: Context<SettleSession>,
    chunk_count: u32,
    settlement_timestamp: i64,
) -> Result<()> {
    let viewer_session = &mut ctx.accounts.viewer_session;
    let video = &mut ctx.accounts.video;
    let creator_earnings = &mut ctx.accounts.creator_earnings;
    let platform = &mut ctx.accounts.platform;
    let clock = Clock::get()?;

    // ═══════════════════════════════════════════════════════════
    // VALIDATION 1: Check chunk count is valid
    // ═══════════════════════════════════════════════════════════
    require!(chunk_count > 0, StreamingError::InvalidChunkCount);

    // ═══════════════════════════════════════════════════════════
    // VALIDATION 2: Check Session State
    // ═══════════════════════════════════════════════════════════
    require!(
        !viewer_session.is_expired(clock.unix_timestamp),
        StreamingError::SessionExpired
    );

    // Allow settlement even if inactive (backend might have queued chunks)
    // But ensure settlement timestamp is not too old
    require!(
        settlement_timestamp >= viewer_session.session_start,
        StreamingError::SettlementTooOld
    );

    require!(
        settlement_timestamp <= clock.unix_timestamp,
        StreamingError::SettlementInFuture
    );

    // ═══════════════════════════════════════════════════════════
    // VALIDATION 3: Check Approval Limits
    // ═══════════════════════════════════════════════════════════
    let new_total_chunks = viewer_session
        .chunks_consumed
        .checked_add(chunk_count)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    require!(
        new_total_chunks <= viewer_session.max_approved_chunks,
        StreamingError::SettlementExceedsApproval
    );

    // ═══════════════════════════════════════════════════════════
    // VALIDATION 4: Price Consistency
    // ═══════════════════════════════════════════════════════════
    // Use locked price from approval time (protects viewer)
    let price_per_chunk = viewer_session.approved_price_per_chunk;
    let total_payment = (price_per_chunk as u128)
        .checked_mul(chunk_count as u128)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    let total_payment_u64 =
        u64::try_from(total_payment).map_err(|_| StreamingError::ArithmeticOverflow)?;

    // ═══════════════════════════════════════════════════════════
    // VALIDATION 5: Check viewer has sufficient balance
    // ═══════════════════════════════════════════════════════════
    require!(
        ctx.accounts.viewer_token_account.amount >= total_payment_u64,
        StreamingError::InsufficientBalance
    );

    // ═══════════════════════════════════════════════════════════
    // PAYMENT DISTRIBUTION
    // ═══════════════════════════════════════════════════════════
    let platform_fee = platform.calculate_platform_fee(total_payment_u64)?;
    let creator_amount = total_payment_u64
        .checked_sub(platform_fee)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    // Transfer to creator (90%)
    let platform_seeds = &[PLATFORM_SEED, &[platform.bump]];
    let signer = &[&platform_seeds[..]];

    let transfer_to_creator = Transfer {
        from: ctx.accounts.viewer_token_account.to_account_info(),
        to: ctx.accounts.creator_token_account.to_account_info(),
        authority: platform.to_account_info(),
    };
    let cpi_ctx_creator = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        transfer_to_creator,
        signer,
    );
    token::transfer(cpi_ctx_creator, creator_amount)?;

    // Transfer platform fee (10%)
    if platform_fee > 0 {
        let transfer_to_platform = Transfer {
            from: ctx.accounts.viewer_token_account.to_account_info(),
            to: ctx.accounts.platform_token_account.to_account_info(),
            authority: platform.to_account_info(),
        };
        let cpi_ctx_platform = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_to_platform,
            signer,
        );
        token::transfer(cpi_ctx_platform, platform_fee)?;
    }

    // ═══════════════════════════════════════════════════════════
    // STATE UPDATES (Bulk Update - Not Per Chunk!)
    // ═══════════════════════════════════════════════════════════
    viewer_session.chunks_consumed = new_total_chunks;
    viewer_session.total_spent = viewer_session
        .total_spent
        .checked_add(total_payment_u64)
        .ok_or(StreamingError::ArithmeticOverflow)?;
    viewer_session.last_activity = clock.unix_timestamp;

    // Update video stats
    video.total_chunks_served = video
        .total_chunks_served
        .checked_add(chunk_count as u64)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    // Update creator earnings
    creator_earnings.total_earned = creator_earnings
        .total_earned
        .checked_add(creator_amount)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    creator_earnings.total_chunks_sold = creator_earnings
        .total_chunks_sold
        .checked_add(chunk_count as u64)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    // Track unique sessions (increment only on first settlement)
    if viewer_session.chunks_consumed == chunk_count {
        video.total_sessions = video
            .total_sessions
            .checked_add(1)
            .ok_or(StreamingError::ArithmeticOverflow)?;
        creator_earnings.total_sessions = creator_earnings
            .total_sessions
            .checked_add(1)
            .ok_or(StreamingError::ArithmeticOverflow)?;
    }

    // Update platform revenue
    platform.total_revenue = platform
        .total_revenue
        .checked_add(platform_fee)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    // ═══════════════════════════════════════════════════════════
    // EMIT EVENT (Critical for Backend Sync!)
    // ═══════════════════════════════════════════════════════════
    emit!(SessionSettled {
        viewer: viewer_session.viewer,
        video: video.key(),
        viewer_session: viewer_session.key(),
        chunk_count,
        total_payment: total_payment_u64,
        platform_fee,
        creator_amount,
        chunks_consumed: viewer_session.chunks_consumed,
        chunks_remaining: viewer_session.max_approved_chunks - viewer_session.chunks_consumed,
        settlement_timestamp,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Session settled: {} chunks, {} tokens (creator: {}, fee: {})",
        chunk_count,
        total_payment_u64,
        creator_amount,
        platform_fee
    );

    Ok(())
}
