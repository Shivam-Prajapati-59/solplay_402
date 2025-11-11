# SolPlay 402 - Smart Contract

> Solana smart contract for decentralized video streaming with x402 HTTP payment protocol

---

## Overview

The SolPlay 402 smart contract implements a decentralized video streaming platform with micropayments using the x402 HTTP payment standard. It handles:

- **Video Registration**: Creators register videos on-chain with metadata and pricing
- **Streaming Sessions**: Viewers approve token delegations for pay-per-chunk consumption
- **Batch Settlement**: Off-chain chunk consumption is settled on-chain in batches
- **Revenue Distribution**: Automatic split between creators (97.5%) and platform (2.5%)

---

## Architecture

### Program Structure

```
programs/solplay_402/src/
├── lib.rs                      # Program entry point
├── constants.rs                # Seeds and constants
├── errors.rs                   # Custom error definitions
├── events.rs                   # Event definitions
├── state/                      # Account state structs
│   ├── mod.rs
│   ├── platform.rs            # Platform configuration
│   ├── video.rs               # Video metadata
│   ├── viewer_session.rs      # Streaming session state
│   └── creator_earnings.rs    # Creator earnings tracking
└── instructions/               # Transaction instructions
    ├── mod.rs
    ├── initialize_platform.rs # Initialize platform
    ├── create_video.rs        # Register video
    ├── update_video.rs        # Update video metadata
    ├── approve_streaming_delegate.rs  # Approve delegation
    ├── settle_session.rs      # Batch settlement
    └── close_viewer_session.rs # Cleanup session
```

---

## Key Accounts

### Platform PDA

- **Seeds**: `["platform"]`
- **Purpose**: Global platform configuration
- **Data**: Token mint, authority, fee structure

### Video PDA

- **Seeds**: `["video", video_id]`
- **Purpose**: Video metadata and stats
- **Data**: Creator, IPFS hash, price per chunk, total chunks

### Viewer Session PDA

- **Seeds**: `["viewer_session", viewer_pubkey, video_pda]`
- **Purpose**: Tracks streaming session state
- **Data**: Approval limits, chunks consumed, delegation info

### Creator Earnings PDA

- **Seeds**: `["creator_earnings", video_pda]`
- **Purpose**: Tracks creator revenue
- **Data**: Total earnings, total chunks sold

---

## Instructions

### 1. Initialize Platform

```rust
pub fn initialize_platform(
    ctx: Context<InitializePlatform>,
    platform_fee_bps: u16,  // 250 = 2.5%
) -> Result<()>
```

**One-time setup** - Creates platform PDA and sets fee structure.

### 2. Create Video

```rust
pub fn create_video(
    ctx: Context<CreateVideo>,
    video_id: String,
    ipfs_hash: String,
    total_chunks: u32,
    price_per_chunk: u64,
    title: String,
    description: String,
) -> Result<()>
```

**Creator action** - Registers video on-chain.

### 3. Approve Streaming Delegate

```rust
pub fn approve_streaming_delegate(
    ctx: Context<ApproveStreamingDelegate>,
    max_chunks: u32,
    max_total_amount: u64,
    duration_seconds: i64,
) -> Result<()>
```

**Viewer action** - Delegates spending authority to platform for streaming.

### 4. Settle Session (Batch)

```rust
pub fn settle_session(
    ctx: Context<SettleSession>,
    chunk_count: u32,
    settlement_timestamp: i64,
) -> Result<()>
```

**Viewer action** - Settles accumulated chunk views in a single transaction.

### 5. Close Viewer Session

```rust
pub fn close_viewer_session(
    ctx: Context<CloseViewerSession>,
) -> Result<()>
```

**Cleanup** - Closes session and reclaims rent.

---

## x402 Payment Flow

### Traditional (Per-Chunk Payment)

```
❌ Expensive: Each chunk = 1 transaction
Chunk 1 → Transaction → 0.000005 SOL fee
Chunk 2 → Transaction → 0.000005 SOL fee
Chunk 3 → Transaction → 0.000005 SOL fee
...
100 chunks = 100 transactions = 0.0005 SOL in fees
```

### x402 Batch Settlement

```
✅ Efficient: All chunks = 1 transaction
Chunk 1 → Off-chain tracking
Chunk 2 → Off-chain tracking
Chunk 3 → Off-chain tracking
...
Settlement → 1 Transaction → 0.000005 SOL fee
100 chunks = 1 transaction = 99% cost savings
```

---

## Security Features

### 1. Delegation Limits

- **Max Chunks**: Viewer can't be charged for more than approved chunks
- **Max Amount**: Total spending is capped
- **Duration**: Delegation expires after time limit
- **Session State**: Tracks inactive/expired sessions

### 2. Validation Checks

- **Price Verification**: Settlement uses approved price, can't be manipulated
- **Chunk Count**: Can't settle more chunks than approved
- **Timestamp**: Settlement timestamp must be valid (not in future/past)
- **Session State**: Must be active and not expired

### 3. Token Safety

- **SPL Token Delegation**: Uses standard SPL token delegation mechanism
- **Viewer Signs**: Only viewer can trigger settlement
- **Atomic Transfers**: Creator/platform payments happen atomically

---

## Deployment

### Devnet

```bash
# Configure
solana config set --url https://api.devnet.solana.com

# Get SOL
solana airdrop 2

# Build
anchor build

# Deploy
anchor deploy

# Initialize
anchor run initialize-platform
```

### Mainnet

```bash
# Configure
solana config set --url https://api.mainnet-beta.solana.com

# Build (with optimizations)
anchor build --verifiable

# Deploy (requires ~5-10 SOL)
anchor deploy

# Initialize platform
anchor run initialize-platform
```

---

## Testing

### Run Tests

```bash
# Unit tests
anchor test

# Integration tests
anchor test --skip-local-validator
```

### Test on Devnet

```bash
# Deploy to devnet
solana config set --url https://api.devnet.solana.com
anchor build && anchor deploy

# Initialize platform
anchor run initialize-platform

# Create test video
anchor run create-test-video

# Test streaming session
anchor run test-streaming
```

---

## Program ID

**Devnet**: `CM19aL9CP8dRjVzRUEW6AMxYgftdSvPgQ5Yzniq5sPXV`

Update in:

- `programs/solplay_402/src/lib.rs`: `declare_id!("YOUR_PROGRAM_ID");`
- `Anchor.toml`: `[programs.devnet]` section

---

## Events

The program emits events for indexing:

```rust
VideoCreatedEvent {
    video_id: String,
    creator: Pubkey,
    price_per_chunk: u64,
}

StreamingSessionStartedEvent {
    session_pda: Pubkey,
    viewer: Pubkey,
    video: Pubkey,
    max_chunks: u32,
}

SessionSettledEvent {
    session_pda: Pubkey,
    chunk_count: u32,
    total_payment: u64,
    platform_fee: u64,
}
```

---

## Error Codes

| Code | Name                  | Description              |
| ---- | --------------------- | ------------------------ |
| 6000 | Unauthorized          | Caller not authorized    |
| 6001 | VideoNotFound         | Video does not exist     |
| 6002 | VideoNotActive        | Video is inactive        |
| 6003 | SessionNotActive      | Session is not active    |
| 6004 | SessionExpired        | Session has expired      |
| 6005 | SessionInactive       | Session inactive >1 hour |
| 6006 | InsufficientBalance   | Not enough tokens        |
| 6007 | InvalidChunkCount     | Invalid chunk count      |
| 6008 | ApprovalLimitExceeded | Exceeds approved limits  |
| 6031 | SettlementInFuture    | Timestamp in future      |
| 6032 | SettlementTooOld      | Timestamp too old        |

---

## Gas Optimization

- **PDA Derivation**: Seeds are minimal
- **Account Sizes**: Optimized struct packing
- **Batch Settlement**: Reduces transactions by 99%
- **Zero-Copy**: Large accounts use zero-copy deserialization

---

## Upgrade Path

The program is **upgradeable**. To upgrade:

```bash
# Build new version
anchor build

# Upgrade (requires upgrade authority)
solana program deploy \
  --program-id <PROGRAM_ID> \
  --upgrade-authority <AUTHORITY> \
  target/deploy/solplay_402.so
```

---

## Support

- **Issues**: https://github.com/Shivam-Prajapati-59/solplay_402/issues
- **Docs**: See `backend/README.md` and `frontend/README.md`
- **Solana Docs**: https://docs.solana.com
- **Anchor Docs**: https://www.anchor-lang.com

---

**Built with Anchor Framework v0.31.1**
