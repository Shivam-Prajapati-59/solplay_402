// =============================================================================
// Initialize Platform
// =============================================================================
//
// SECURITY NOTE: This instruction initializes a SINGLE GLOBAL platform PDA.
// The platform uses seeds = [PLATFORM_SEED] with NO authority binding,
// meaning the PDA address is deterministic and the same for all callers.
//
// The `init` constraint ensures this can only be called ONCE per program deployment.
// The first caller becomes the permanent platform authority.
//
// DEPLOYMENT BEST PRACTICE:
// To prevent front-running, the program deployer should:
// 1. Deploy the program
// 2. IMMEDIATELY call initialize_platform in the same transaction bundle
// 3. Or use a private RPC to ensure no other party can initialize first
//
// ALTERNATIVE SECURE DESIGNS (for future consideration):
// - Bind PDA to deployer: seeds = [PLATFORM_SEED, deployer.key()]
// - Check upgrade authority: require!(authority == program_upgrade_authority)
// - Use program-owned authority: require!(authority == program_id)
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

    /// Platform authority - should be program upgrade authority for security
    /// Only this authority can initialize the platform (one-time operation)
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_platform(
    ctx: Context<InitializePlatform>,
    platform_fee_basis_points: u16,
    min_price_per_chunk: u64,
) -> Result<()> {
    // NOTE: Platform uses a single global PDA (seeds = [PLATFORM_SEED])
    // This means only ONE platform can exist per program deployment.
    // The `init` constraint ensures this can only be called once.
    //
    // SECURITY: The first caller becomes the platform authority.
    // For production, ensure this is called by the program deployer immediately after deployment,
    // or add additional authorization checks (e.g., require authority to match program upgrade authority).

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
