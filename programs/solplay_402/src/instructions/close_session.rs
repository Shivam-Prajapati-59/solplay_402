// =============================================================================
// Close Viewer Session Instruction (Cleanup & Rent Reclaim)
// =============================================================================

use crate::constants::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CloseViewerSession<'info> {
    #[account(
        mut,
        seeds = [VIEWER_SESSION_SEED, viewer.key().as_ref(), video.key().as_ref()],
        bump = viewer_session.bump,
        constraint = viewer_session.viewer == viewer.key(),
        close = viewer
    )]
    pub viewer_session: Account<'info, ViewerSession>,

    #[account(
        seeds = [VIDEO_SEED, video.video_id.as_bytes()],
        bump = video.bump
    )]
    pub video: Account<'info, Video>,

    #[account(mut)]
    pub viewer: Signer<'info>,
}

pub fn close_viewer_session(ctx: Context<CloseViewerSession>) -> Result<()> {
    let viewer_session = &ctx.accounts.viewer_session;
    let clock = Clock::get()?;

    // Calculate refunded rent (lamports returned to viewer)
    let rent_lamports = ctx.accounts.viewer_session.to_account_info().lamports();

    emit!(SessionClosed {
        viewer: ctx.accounts.viewer.key(),
        video: ctx.accounts.video.key(),
        viewer_session: viewer_session.key(),
        chunks_consumed: viewer_session.chunks_consumed,
        total_spent: viewer_session.total_spent,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Session closed. Chunks consumed: {}, Total spent: {}, Rent refunded: {} lamports",
        viewer_session.chunks_consumed,
        viewer_session.total_spent,
        rent_lamports
    );

    // Note: Account closure and rent refund handled automatically by 'close = viewer' constraint

    Ok(())
}
