// =============================================================================
// Pay For Chunk Instruction (Sequential Payment System)
// =============================================================================

use crate::constants::*;
use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct PayForChunk<'info> {
    #[account(
        mut,
        seeds = [VIEWER_SESSION_SEED, viewer.key().as_ref(), video.key().as_ref()],
        bump = viewer_session.bump,
        constraint = viewer_session.viewer == viewer.key(),
        constraint = viewer_session.video == video.key()
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

    pub viewer: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn pay_for_chunk(ctx: Context<PayForChunk>, chunk_index: u32) -> Result<()> {
    let viewer_session = &mut ctx.accounts.viewer_session;
    let video = &mut ctx.accounts.video;
    let creator_earnings = &mut ctx.accounts.creator_earnings;
    let platform = &mut ctx.accounts.platform;
    let clock = Clock::get()?;

    // Validation 1: Check session expiry
    require!(
        !viewer_session.is_expired(clock.unix_timestamp),
        StreamingError::SessionExpired
    );

    // Validation 2: Check session inactivity
    require!(
        !viewer_session.is_inactive(clock.unix_timestamp),
        StreamingError::SessionInactive
    );

    // Validation 3: Check chunk index is valid
    require!(
        chunk_index < video.total_chunks,
        StreamingError::InvalidChunkIndex
    );

    // Validation 4: Check approval remaining (CRITICAL)
    require!(
        viewer_session.has_approval_remaining(),
        StreamingError::InsufficientApproval
    );

    // Validation 5: Enforce sequential payment (PREVENTS RACE CONDITIONS)
    require!(
        viewer_session.is_next_chunk_sequential(chunk_index),
        StreamingError::OutOfSequenceChunk
    );

    // Validation 6: Price lock protection (PREVENTS MID-SESSION PRICE CHANGES)
    require!(
        video.price_per_chunk == viewer_session.approved_price_per_chunk,
        StreamingError::PriceChangedSinceApproval
    );

    // Validation 7: Check viewer has sufficient balance
    let chunk_price = video.price_per_chunk;
    require!(
        ctx.accounts.viewer_token_account.amount >= chunk_price,
        StreamingError::InsufficientBalance
    );

    // Calculate payment breakdown
    let platform_fee = platform.calculate_platform_fee(chunk_price)?;
    let creator_amount = chunk_price
        .checked_sub(platform_fee)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    // Transfer to creator (using platform PDA as delegated authority)
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

    // Transfer platform fee (if non-zero)
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

    // Update viewer session state
    viewer_session.update_activity(clock.unix_timestamp, chunk_index);
    viewer_session.total_spent = viewer_session
        .total_spent
        .checked_add(chunk_price)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    // Update video stats
    video.total_chunks_served = video
        .total_chunks_served
        .checked_add(1)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    // Update creator earnings
    creator_earnings.total_earned = creator_earnings
        .total_earned
        .checked_add(creator_amount)
        .ok_or(StreamingError::ArithmeticOverflow)?;
    creator_earnings.total_chunks_sold = creator_earnings
        .total_chunks_sold
        .checked_add(1)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    // Track unique sessions (increment only on first chunk)
    if viewer_session.chunks_consumed == 1 {
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

    // Emit event (instead of storing - 99.75% cost savings!)
    emit!(ChunkPaid {
        viewer: ctx.accounts.viewer.key(),
        video: video.key(),
        creator: video.creator,
        chunk_index,
        payment_sequence: viewer_session.chunks_consumed,
        amount_paid: chunk_price,
        platform_fee,
        creator_amount,
        chunks_remaining: viewer_session.max_approved_chunks - viewer_session.chunks_consumed,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Chunk {} paid: {} tokens (creator: {}, fee: {})",
        chunk_index,
        chunk_price,
        creator_amount,
        platform_fee
    );

    Ok(())
}
