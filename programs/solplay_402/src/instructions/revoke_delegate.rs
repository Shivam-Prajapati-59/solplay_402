// =============================================================================
// Revoke Streaming Delegate Instruction
// =============================================================================

use crate::constants::*;
use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Revoke, Token, TokenAccount};

#[derive(Accounts)]
pub struct RevokeDelegate<'info> {
    #[account(
        mut,
        seeds = [VIEWER_SESSION_SEED, viewer.key().as_ref(), video.key().as_ref()],
        bump = viewer_session.bump,
        constraint = viewer_session.viewer == viewer.key()
    )]
    pub viewer_session: Account<'info, ViewerSession>,

    #[account(
        seeds = [VIDEO_SEED, video.video_id.as_bytes()],
        bump = video.bump
    )]
    pub video: Account<'info, Video>,

    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, Platform>,

    /// Viewer's token account (remove delegation)
    #[account(
        mut,
        constraint = viewer_token_account.owner == viewer.key(),
        constraint = viewer_token_account.mint == platform.token_mint @ StreamingError::InvalidTokenMint
    )]
    pub viewer_token_account: Account<'info, TokenAccount>,

    pub viewer: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn revoke_streaming_delegate(ctx: Context<RevokeDelegate>) -> Result<()> {
    let viewer_session = &ctx.accounts.viewer_session;
    let clock = Clock::get()?;

    // Revoke SPL token delegation
    let cpi_accounts = Revoke {
        source: ctx.accounts.viewer_token_account.to_account_info(),
        authority: ctx.accounts.viewer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token::revoke(cpi_ctx)?;

    emit!(DelegationRevoked {
        viewer: ctx.accounts.viewer.key(),
        video: ctx.accounts.video.key(),
        viewer_session: viewer_session.key(),
        chunks_consumed: viewer_session.chunks_consumed,
        total_spent: viewer_session.total_spent,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Delegation revoked. Chunks consumed: {}, Total spent: {}",
        viewer_session.chunks_consumed,
        viewer_session.total_spent
    );

    Ok(())
}
