// =============================================================================
// Custom Error Codes
// =============================================================================

use anchor_lang::prelude::*;

#[error_code]
pub enum StreamingError {
    #[msg("Video ID exceeds maximum length")]
    VideoIdTooLong,

    #[msg("IPFS hash exceeds maximum length")]
    IpfsHashTooLong,

    #[msg("Title exceeds maximum length")]
    TitleTooLong,

    #[msg("Description exceeds maximum length")]
    DescriptionTooLong,

    #[msg("Total chunks exceeds maximum allowed")]
    TooManyChunks,

    #[msg("Price per chunk is below minimum")]
    PriceTooLow,

    #[msg("Video is not active")]
    VideoNotActive,

    #[msg("Chunk index is out of bounds")]
    InvalidChunkIndex,

    #[msg("Insufficient delegation approved")]
    InsufficientApproval,

    #[msg("Chunks must be paid sequentially")]
    OutOfSequenceChunk,

    #[msg("Session has expired (24h limit)")]
    SessionExpired,

    #[msg("Session is inactive (1h timeout)")]
    SessionInactive,

    #[msg("Price changed since approval - re-approval required")]
    PriceChangedSinceApproval,

    #[msg("Max chunks per approval exceeded")]
    MaxChunksPerApprovalExceeded,

    #[msg("Invalid token mint")]
    InvalidTokenMint,

    #[msg("No update parameters provided")]
    NoUpdateProvided,

    #[msg("Platform fee exceeds maximum allowed")]
    PlatformFeeTooHigh,

    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,

    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Video already exists")]
    VideoAlreadyExists,

    #[msg("Session not found or invalid")]
    InvalidSession,

    #[msg("Cannot revoke - no active delegation")]
    NoDelegationToRevoke,

    #[msg("Invalid platform fee account - must be owned by platform authority")]
    InvalidPlatformAccount,

    #[msg("Insufficient token balance for approval")]
    InsufficientBalanceForApproval,

    #[msg("Insufficient token balance for payment")]
    InsufficientBalance,

    #[msg("Invalid creator earnings account")]
    InvalidCreatorEarnings,

    #[msg("Invalid session state - cannot re-initialize active session")]
    InvalidSessionState,

    #[msg("Unauthorized platform initialization - must be program upgrade authority")]
    UnauthorizedPlatformInitialization,
}
