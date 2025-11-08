// =============================================================================
// Initialize Platform
// =============================================================================
//
// SECURITY: This instruction uses upgrade authority verification to prevent
// front-running attacks during deployment.
//
// The platform PDA uses seeds = [PLATFORM_SEED] for a deterministic global address.
// Only the program's upgrade authority can initialize the platform.
//
// This prevents:
// - Front-running attacks where malicious actors initialize before the deployer
// - Unauthorized platform initialization
// - Authority hijacking
//
// DEPLOYMENT:
// 1. Deploy the program (sets upgrade authority)
// 2. Call initialize_platform with the upgrade authority as signer
// 3. The upgrade authority becomes the platform authority
//
// PRODUCTION NOTE:
// After initialization, you may optionally transfer the upgrade authority
// to a governance program or multisig for decentralized control.
// =============================================================================

use crate::constants::*;
use crate::errors::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;





#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = Platform::LEN,
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform: Account<'info, Platform>,

    /// Validate this is a real SPL token mint
    pub token_mint: Account<'info, Mint>,

    /// Program data account - used to verify upgrade authority
    /// This account stores the program's upgrade authority
    #[account(
        constraint = program_data.upgrade_authority_address == Some(authority.key()) 
            @ StreamingError::UnauthorizedPlatformInitialization
    )]
    pub program_data: Account<'info, ProgramData>,

    /// Platform authority - MUST be the program's upgrade authority
    /// This prevents front-running attacks during deployment
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_platform(
    ctx: Context<InitializePlatform>,
    platform_fee_basis_points: u16,
    min_price_per_chunk: u64,
) -> Result<()> {
    // SECURITY: The InitializePlatform accounts struct enforces that:
    // 1. The `authority` signer MUST match the program's upgrade authority
    // 2. This is validated via the program_data.upgrade_authority_address constraint
    // 3. This prevents ANY unauthorized party from initializing the platform
    //
    // The platform uses a global PDA (seeds = [PLATFORM_SEED]), so it can only
    // be initialized ONCE. After initialization, the upgrade authority becomes
    // the permanent platform authority with fee collection rights.

    // Validate platform fee
    require!(
        platform_fee_basis_points as u64 <= MAX_PLATFORM_FEE_BPS,
        StreamingError::PlatformFeeTooHigh
    );

    let platform = &mut ctx.accounts.platform;

    platform.authority = ctx.accounts.authority.key();
    platform.token_mint = ctx.accounts.token_mint.key(); // Now validated by Anchor
    platform.platform_fee_basis_points = platform_fee_basis_points;
    platform.min_price_per_chunk = min_price_per_chunk;
    platform.total_videos = 0;
    platform.total_sessions = 0;
    platform.total_revenue = 0;
    platform.bump = ctx.bumps.platform;

    emit!(PlatformInitialized {
        platform: platform.key(),
        token_mint: platform.token_mint,
        platform_fee_basis_points,
        min_price_per_chunk,
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!(
        "Platform initialized with fee: {} bps, mint: {}",
        platform_fee_basis_points,
        platform.token_mint
    );

    Ok(())
}
