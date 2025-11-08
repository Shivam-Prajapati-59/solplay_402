// =============================================================================
// Create Video Instruction
// =============================================================================

use crate::constants::*;
use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;

// Use correct constant names from constants.rs
const MIN_VIDEO_CHUNKS: u32 = 1;
const MAX_VIDEO_CHUNKS: u32 = MAX_TOTAL_CHUNKS;
const MAX_VIDEO_ID_LEN: usize = MAX_VIDEO_ID_LENGTH;
const MAX_IPFS_HASH_LEN: usize = MAX_IPFS_HASH_LENGTH;
const MAX_TITLE_LEN: usize = MAX_TITLE_LENGTH;
const MAX_DESCRIPTION_LEN: usize = MAX_DESCRIPTION_LENGTH;

#[derive(Accounts)]
#[instruction(video_id: String)]
pub struct CreateVideo<'info> {
    #[account(
        init,
        payer = creator,
        space = Video::MAX_LEN,
        seeds = [VIDEO_SEED, video_id.as_bytes()],
        bump
    )]
    pub video: Account<'info, Video>,

    #[account(
        init,
        payer = creator,
        space = CreatorEarnings::LEN,
        seeds = [CREATOR_EARNINGS_SEED, video.key().as_ref()],
        bump
    )]
    pub creator_earnings: Account<'info, CreatorEarnings>,

    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, Platform>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_video(
    ctx: Context<CreateVideo>,
    video_id: String,
    ipfs_hash: String,
    total_chunks: u32,
    price_per_chunk: u64,
    title: String,
    description: String,
) -> Result<()> {
    // Validate inputs BEFORE event emission to prevent tx/log size failures
    // These limits are enforced to protect VideoCreated event serialization
    require!(
        video_id.len() <= MAX_VIDEO_ID_LEN,
        StreamingError::VideoIdTooLong
    );
    require!(
        ipfs_hash.len() <= MAX_IPFS_HASH_LEN,
        StreamingError::IpfsHashTooLong
    );
    require!(title.len() <= MAX_TITLE_LEN, StreamingError::TitleTooLong);
    require!(
        description.len() <= MAX_DESCRIPTION_LEN,
        StreamingError::DescriptionTooLong
    );
    require!(
        total_chunks >= MIN_VIDEO_CHUNKS && total_chunks <= MAX_VIDEO_CHUNKS,
        StreamingError::TooManyChunks
    );
    require!(
        price_per_chunk >= ctx.accounts.platform.min_price_per_chunk,
        StreamingError::PriceTooLow
    );

    let video = &mut ctx.accounts.video;
    let creator_earnings = &mut ctx.accounts.creator_earnings;
    let platform = &mut ctx.accounts.platform;
    let clock = Clock::get()?;

    // Initialize video
    video.creator = ctx.accounts.creator.key();
    video.video_id = video_id.clone();
    video.ipfs_hash = ipfs_hash.clone();
    video.total_chunks = total_chunks;
    video.price_per_chunk = price_per_chunk;
    video.title = title.clone();
    video.description = description.clone();
    video.is_active = true;
    video.total_sessions = 0;
    video.total_chunks_served = 0;
    video.created_at = clock.unix_timestamp;
    video.bump = ctx.bumps.video;

    // Initialize creator earnings
    creator_earnings.creator = ctx.accounts.creator.key();
    creator_earnings.video = video.key();
    creator_earnings.total_earned = 0;
    creator_earnings.total_sessions = 0;
    creator_earnings.total_chunks_sold = 0;
    creator_earnings.bump = ctx.bumps.creator_earnings;

    // Update platform stats
    platform.total_videos = platform
        .total_videos
        .checked_add(1)
        .ok_or(StreamingError::ArithmeticOverflow)?;

    emit!(VideoCreated {
        video: video.key(),
        creator: ctx.accounts.creator.key(),
        video_id,
        ipfs_hash,
        total_chunks,
        price_per_chunk,
        title,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Video created: {} chunks @ {} tokens/chunk",
        total_chunks,
        price_per_chunk
    );

    Ok(())
}
