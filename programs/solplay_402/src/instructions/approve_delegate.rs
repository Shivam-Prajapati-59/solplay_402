// =============================================================================
// Approve Streaming Delegate Instruction
// =============================================================================

use crate::constants::*;
use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, ApproveChecked, Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct ApproveDelegate<'info> {
    #[account(
        init_if_needed,
        payer = viewer,
        space = ViewerSession::LEN,
        seeds = [VIEWER_SESSION_SEED, viewer.key().as_ref(), video.key().as_ref()],
        bump
    )]
    pub viewer_session: Account<'info, ViewerSession>,

    #[account(
        seeds = [VIDEO_SEED, video.video_id.as_bytes()],
        bump = video.bump,
        constraint = video.is_active @ StreamingError::VideoNotActive
    )]
    pub video: Account<'info, Video>,

    #[account(
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

    /// Token mint account - must match platform's configured mint
    #[account(
        constraint = token_mint.key() == platform.token_mint @ StreamingError::InvalidTokenMint
    )]
    pub token_mint: Account<'info, Mint>,

    /// Viewer's token account (source of payment)
    #[account(
        mut,
        constraint = viewer_token_account.mint == token_mint.key() @ StreamingError::InvalidTokenMint,
        constraint = viewer_token_account.owner == viewer.key()
    )]
    pub viewer_token_account: Account<'info, TokenAccount>,

    /// Platform's token account (receives fees) - also used as delegate authority
    #[account(
        mut,
        constraint = platform_token_account.mint == token_mint.key() @ StreamingError::InvalidTokenMint,
        constraint = platform_token_account.owner == platform.key() @ StreamingError::InvalidPlatformAccount
    )]
    pub platform_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub viewer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn approve_streaming_delegate(ctx: Context<ApproveDelegate>, max_chunks: u32) -> Result<()> {
    require!(
        max_chunks > 0 && max_chunks <= MAX_CHUNKS_PER_APPROVAL,
        StreamingError::MaxChunksPerApprovalExceeded
    );

    let viewer_session = &mut ctx.accounts.viewer_session;
    let video = &ctx.accounts.video;
    let platform = &mut ctx.accounts.platform;
    let clock = Clock::get()?;
    let is_new_session = viewer_session.session_start == 0;

    // CRITICAL FIX: Calculate actual delegation amount needed
    let approval_amount_u128: u128;

    if is_new_session {
        // New session - initialize
        viewer_session.viewer = ctx.accounts.viewer.key();
        viewer_session.video = video.key();
        viewer_session.max_approved_chunks = max_chunks;
        viewer_session.chunks_consumed = 0;
        viewer_session.total_spent = 0;
        viewer_session.approved_price_per_chunk = video.price_per_chunk;
        viewer_session.last_paid_chunk_index = None;
        viewer_session.session_start = clock.unix_timestamp;
        viewer_session.last_activity = clock.unix_timestamp;
        viewer_session.bump = ctx.bumps.viewer_session;

        // Calculate approval for new chunks
        approval_amount_u128 = (video.price_per_chunk as u128)
            .checked_mul(max_chunks as u128)
            .ok_or(StreamingError::ArithmeticOverflow)?;

        // Update platform stats
        platform.total_sessions = platform
            .total_sessions
            .checked_add(1)
            .ok_or(StreamingError::ArithmeticOverflow)?;
    } else {
        // Re-approval - CRITICAL: validate session still valid
        require!(
            !viewer_session.is_expired(clock.unix_timestamp),
            StreamingError::SessionExpired
        );
        require!(
            !viewer_session.is_inactive(clock.unix_timestamp),
            StreamingError::SessionInactive
        );

        // Update session to include new chunks FIRST
        viewer_session.max_approved_chunks = viewer_session
            .max_approved_chunks
            .checked_add(max_chunks)
            .ok_or(StreamingError::ArithmeticOverflow)?;

        // CRITICAL FIX: Calculate TOTAL delegation needed (not incremental)
        // Because SPL token approve_checked REPLACES existing delegation
        // Use updated max_approved_chunks minus already consumed chunks
        let remaining_chunks_after_update =
            viewer_session.max_approved_chunks - viewer_session.chunks_consumed;

        // Calculate TOTAL amount for delegation (all remaining chunks at current price)
        approval_amount_u128 = (video.price_per_chunk as u128)
            .checked_mul(remaining_chunks_after_update as u128)
            .ok_or(StreamingError::ArithmeticOverflow)?;

        viewer_session.last_activity = clock.unix_timestamp;
    }

    // CRITICAL FIX: Safe u128 -> u64 conversion with validation
    let approval_amount =
        u64::try_from(approval_amount_u128).map_err(|_| StreamingError::ArithmeticOverflow)?;

    // Validate viewer has sufficient balance for approval
    require!(
        ctx.accounts.viewer_token_account.amount >= approval_amount,
        StreamingError::InsufficientBalanceForApproval
    );

    // Create approve_checked instruction for SPL token delegation
    // Delegate to platform PDA so it can execute transfers on behalf of viewer
    let cpi_accounts = ApproveChecked {
        to: ctx.accounts.viewer_token_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        delegate: platform.to_account_info(),
        authority: ctx.accounts.viewer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token::approve_checked(cpi_ctx, approval_amount, ctx.accounts.token_mint.decimals)?;

    emit!(DelegationApproved {
        viewer: ctx.accounts.viewer.key(),
        video: video.key(),
        viewer_session: viewer_session.key(),
        max_approved_chunks: viewer_session.max_approved_chunks,
        locked_price_per_chunk: viewer_session.approved_price_per_chunk,
        is_reapproval: !is_new_session,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Approved delegation: {} chunks @ {} tokens/chunk (total: {})",
        max_chunks,
        video.price_per_chunk,
        approval_amount
    );

    Ok(())
}
