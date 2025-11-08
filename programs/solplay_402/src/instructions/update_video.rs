// =============================================================================
// Update Video Instruction
// =============================================================================

use crate::constants::*;
use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateVideo<'info> {
    #[account(
        mut,
        seeds = [VIDEO_SEED, video.video_id.as_bytes()],
        bump = video.bump,
        has_one = creator @ StreamingError::Unauthorized
    )]
    pub video: Account<'info, Video>,

    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, Platform>,

    pub creator: Signer<'info>,
}

pub fn update_video(
    ctx: Context<UpdateVideo>,
    price_per_chunk: Option<u64>,
    is_active: Option<bool>,
) -> Result<()> {
    // Require at least one update
    require!(
        price_per_chunk.is_some() || is_active.is_some(),
        StreamingError::NoUpdateProvided
    );

    let video = &mut ctx.accounts.video;
    let platform = &ctx.accounts.platform;
    let clock = Clock::get()?;

    // Update price if provided
    if let Some(new_price) = price_per_chunk {
        require!(
            new_price >= platform.min_price_per_chunk,
            StreamingError::PriceTooLow
        );
        video.price_per_chunk = new_price;
    }

    // Update active status if provided
    if let Some(active) = is_active {
        video.is_active = active;
    }

    emit!(VideoUpdated {
        video: video.key(),
        creator: ctx.accounts.creator.key(),
        price_per_chunk,
        is_active,
        timestamp: clock.unix_timestamp,
    });

    msg!("Video updated: {:?}", video.video_id);

    Ok(())
}
