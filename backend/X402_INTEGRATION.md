# x402 Payment Integration for HLS Chunk Streaming

## Overview

This document explains the x402 micropayment integration for pay-per-chunk video streaming. The system combines Solana blockchain delegation for security with HTTP micropayments for efficiency, resulting in **96% gas fee savings** compared to pure on-chain payments.

## Architecture

### Hybrid Payment Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Flow                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Viewer connects wallet (Frontend)                        │
│  2. Call approve_streaming_delegate() (On-chain, one-time)   │
│  3. Backend creates blockchain session in database           │
│  4. Video player requests HLS segments with x402 headers     │
│  5. x402 middleware verifies payment header (HTTP, free)     │
│  6. serveSegment() delivers chunk + tracks view (Memory)     │
│  7. After 100 chunks: batch settle_session() (On-chain)      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Cost Comparison (1000 viewers, 100 chunks each)

| Method                      | Transactions  | Gas Cost       | Total Cost      |
| --------------------------- | ------------- | -------------- | --------------- |
| **Per-chunk on-chain**      | 100,000 tx    | 0.00025 SOL/tx | ~25 SOL         |
| **x402 + Batch settlement** | 1,000 tx      | 0.001 SOL/tx   | ~1 SOL          |
| **Savings**                 | 99% reduction | 96% reduction  | **96% savings** |

## Implementation Details

### 1. Express Middleware (app.ts)

```typescript
import { paymentMiddleware } from "x402-express";

const payTo = process.env.CREATOR_WALLET_ADDRESS;
const facilitatorUrl = process.env.X402_FACILITATOR_URL;

app.use(
  paymentMiddleware(
    payTo as any,
    {
      "GET /api/video/*/segment*.ts": {
        price: "$0.001",
        network: "solana-devnet",
        config: {
          description: "Access to video chunk",
          mimeType: "video/MP2T",
        },
      },
    },
    { url: facilitatorUrl }
  )
);
```

**How it works:**

- All requests to `/api/video/{videoId}/segment{N}.ts` are intercepted
- Middleware checks for `X-PAYMENT` header (contains proof of payment)
- If header missing → returns 402 Payment Required
- If header valid → allows request to proceed to controller

### 2. Chunk Payment Tracker (chunk-payment-tracker.service.ts)

In-memory tracking service that:

- Records each chunk view in a Map
- Tracks unsettled amount per video-viewer pair
- Triggers batch settlement at threshold (100 chunks)
- Calculates platform fee (10%) and creator share (90%)

**Key Methods:**

```typescript
// Record a chunk view after successful x402 payment
await chunkPaymentTracker.recordChunkView(
  videoId, // e.g., "lighthouse_test_video"
  viewerWallet, // e.g., "5HYrT8..."
  segment, // e.g., "segment0.ts"
  "$0.001" // Price paid
);

// Get unsettled stats
const stats = chunkPaymentTracker.getSettlementStats(videoId, viewerWallet);
// Returns: { unsettledCount, unsettledValue, settledCount, settledValue }

// Manual settlement trigger
await chunkPaymentTracker.settleChunks(videoId, viewerWallet);
```

**Settlement Logic:**

- Threshold: 100 chunks OR 1 hour interval
- Platform fee: 10% of total payment
- Creator share: 90% of total payment
- Creates single `chunk_payments` record with transaction signature

### 3. Video Controller Updates (video.controller.ts)

Modified `serveSegment()` to track chunk deliveries:

```typescript
export const serveSegment = async (req: Request, res: Response) => {
  // ... file existence check ...

  // Track chunk delivery after x402 payment verification
  const viewerWallet = req.query.wallet as string | undefined;

  if (viewerWallet && videoId) {
    await chunkPaymentTracker.recordChunkView(
      videoId,
      viewerWallet,
      segment,
      "$0.001"
    );
  }

  // Serve the video segment
  res.setHeader("Content-Type", "video/mp2t");
  res.sendFile(segmentPath);
};
```

### 4. x402 Payment Routes (x402-payment.routes.ts)

New API endpoints for payment tracking:

| Endpoint                       | Method | Purpose                   |
| ------------------------------ | ------ | ------------------------- |
| `/api/x402/track-chunk`        | POST   | Manually track chunk view |
| `/api/x402/stats/:videoId`     | GET    | Get settlement stats      |
| `/api/x402/settle`             | POST   | Trigger manual settlement |
| `/api/x402/unsettled/:videoId` | GET    | Get unsettled chunk count |

**Example Usage:**

```bash
# Get settlement stats
curl http://localhost:5000/api/x402/stats/test_video?wallet=5HYrT8...

# Response:
{
  "videoId": "test_video",
  "viewerWallet": "5HYrT8...",
  "unsettledCount": 45,
  "unsettledValue": "$0.045",
  "settledCount": 200,
  "settledValue": "$0.200"
}

# Manual settlement
curl -X POST http://localhost:5000/api/x402/settle \
  -H "Content-Type: application/json" \
  -d '{"videoId":"test_video","viewerWallet":"5HYrT8..."}'
```

## Frontend Integration (Next Steps)

### Current Flow (On-chain per chunk)

```typescript
// PaymentVideoPlayer.tsx
const handleSegment = async (segmentUrl: string) => {
  // Call smart contract for each chunk
  await program.methods
    .payForChunk(chunkIndex)
    .accounts({
      /* ... */
    })
    .rpc();

  // Then fetch segment
  const response = await fetch(segmentUrl);
};
```

### Updated Flow (x402 + Batch settlement)

```typescript
// PaymentVideoPlayer.tsx
import { x402Fetch } from "x402-fetch";

const handleSegment = async (segmentUrl: string) => {
  // No smart contract call - just HTTP request with payment header
  const response = await x402Fetch(segmentUrl, {
    wallet: walletAddress,
    network: "solana-devnet",
  });

  // x402-fetch automatically:
  // 1. Generates payment proof
  // 2. Adds X-PAYMENT header
  // 3. Sends HTTP request
  // 4. Backend verifies & serves chunk
};

// Batch settlement every 100 chunks
useEffect(() => {
  if (chunksWatched % 100 === 0 && chunksWatched > 0) {
    settleBatch();
  }
}, [chunksWatched]);

const settleBatch = async () => {
  await program.methods
    .settleSession()
    .accounts({
      /* ... */
    })
    .rpc();
};
```

## Database Schema

### blockchain_sessions

Tracks active streaming sessions with delegation:

```sql
CREATE TABLE blockchain_sessions (
  id SERIAL PRIMARY KEY,
  session_pda TEXT UNIQUE NOT NULL,
  viewer_wallet TEXT NOT NULL,
  video_pda TEXT NOT NULL,
  max_approved_chunks INTEGER NOT NULL,
  chunks_consumed INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### chunk_payments

Stores batch settlement records:

```sql
CREATE TABLE chunk_payments (
  id SERIAL PRIMARY KEY,
  video_id INTEGER REFERENCES videos(id),
  viewer_wallet TEXT NOT NULL,
  chunk_count INTEGER NOT NULL,
  total_amount NUMERIC(20, 9) NOT NULL,
  transaction_signature TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

Add to `backend/.env`:

```bash
# x402 Configuration
CREATOR_WALLET_ADDRESS=your_solana_wallet_address
X402_FACILITATOR_URL=https://facilitator.x402.com

# Optional: Settlement thresholds
SETTLEMENT_THRESHOLD=100
SETTLEMENT_INTERVAL_MS=3600000
```

## Production Considerations

### 1. Replace In-Memory Tracking with Redis

Current implementation uses `Map` for chunk tracking. For production:

```typescript
// chunk-payment-tracker.service.ts
import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL);

// Store chunk views
await redis.hincrby(`chunks:${videoId}:${viewerWallet}`, "count", 1);
await redis.hincrbyfloat(`chunks:${videoId}:${viewerWallet}`, "amount", 0.001);

// Check settlement threshold
const count = await redis.hget(`chunks:${videoId}:${viewerWallet}`, "count");
if (parseInt(count) >= 100) {
  await settleChunks(videoId, viewerWallet);
}
```

### 2. Add Smart Contract settle_session() Instruction

Required for batch settlement (5-7 weeks to implement):

```rust
// programs/solplay_402/src/lib.rs
pub fn settle_session(
    ctx: Context<SettleSession>,
    chunk_count: u64,
    total_amount: u64
) -> Result<()> {
    let session = &mut ctx.accounts.session;
    require!(session.is_active, ErrorCode::SessionNotActive);
    require!(chunk_count <= session.max_approved_chunks, ErrorCode::ExceededApproval);

    // Transfer total_amount from viewer to creator
    transfer_tokens(
        ctx.accounts.viewer_token_account.to_account_info(),
        ctx.accounts.creator_token_account.to_account_info(),
        total_amount
    )?;

    session.chunks_consumed += chunk_count;
    session.last_settlement_at = Clock::get()?.unix_timestamp;

    Ok(())
}
```

### 3. Error Handling & Monitoring

```typescript
// Add Sentry or similar monitoring
import * as Sentry from "@sentry/node";

try {
  await chunkPaymentTracker.recordChunkView(...);
} catch (error) {
  Sentry.captureException(error);
  // Don't fail segment delivery if tracking fails
  console.error("Tracking failed:", error);
}
```

### 4. Rate Limiting

Prevent abuse with rate limiting on segment endpoints:

```typescript
import rateLimit from "express-rate-limit";

const segmentLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // Max 10 segments per second per IP
  message: "Too many segment requests",
});

app.use("/api/video/:videoId/segment*.ts", segmentLimiter);
```

## Testing

### 1. Test x402 Payment Flow

```bash
# Start backend
cd backend && npm run dev

# Test segment request without payment (should fail)
curl http://localhost:5000/api/video/test_video/segment0.ts
# Expected: 402 Payment Required

# Test with x402 payment header (should succeed)
curl http://localhost:5000/api/video/test_video/segment0.ts?wallet=5HYrT8... \
  -H "X-PAYMENT: {proof_of_payment}"
# Expected: 200 OK + video segment
```

### 2. Test Settlement Logic

```typescript
// Create test script: backend/test/settlement.test.ts
describe("Chunk Settlement", () => {
  it("should settle after 100 chunks", async () => {
    for (let i = 0; i < 100; i++) {
      await chunkPaymentTracker.recordChunkView(
        "test_video",
        "test_wallet",
        `segment${i}.ts`,
        "$0.001"
      );
    }

    const stats = chunkPaymentTracker.getSettlementStats(
      "test_video",
      "test_wallet"
    );
    expect(stats.settledCount).toBe(100);
    expect(stats.settledValue).toBe("$0.100");
  });
});
```

## Migration Path

### Phase 1: Backend Ready (CURRENT)

✅ x402 middleware configured
✅ Chunk tracking service implemented
✅ Payment routes exposed
✅ Video controller updated

### Phase 2: Frontend Integration (2-3 days)

- Replace `program.methods.payForChunk()` with `x402Fetch()`
- Add batch settlement trigger
- Update video player to include wallet in segment URLs
- Test payment flow end-to-end

### Phase 3: Smart Contract Update (5-7 weeks)

- Add `settle_session()` instruction
- Update frontend to call settlement on-chain
- Test settlement accuracy
- Deploy to devnet/mainnet

### Phase 4: Production Hardening (1-2 weeks)

- Migrate to Redis
- Add comprehensive monitoring
- Implement rate limiting
- Load testing
- Security audit

## Benefits Summary

✅ **96% cost reduction** - Batch settlement vs per-chunk transactions
✅ **Better UX** - No blockchain confirmation wait for each chunk
✅ **Scalability** - HTTP payments don't congest blockchain
✅ **Security maintained** - Delegation still on-chain and verifiable
✅ **Flexible pricing** - Easy to adjust chunk price without contract changes
✅ **Efficient tracking** - In-memory tracking with batch writes

## Support & Troubleshooting

### Common Issues

**1. "402 Payment Required" on segment requests**

- Check that `X-PAYMENT` header is included
- Verify x402 facilitator URL is correct
- Ensure wallet has approved delegation

**2. Settlement not triggering**

- Check `SETTLEMENT_THRESHOLD` environment variable
- Verify chunk count in tracker service
- Check database `chunk_payments` table for records

**3. TypeScript errors in app.ts**

- Use type assertions: `payTo as any`
- Use template literal: `facilitatorUrl as \`\${string}://\${string}\``

**4. Segment not found errors**

- Verify video has been transcoded to HLS
- Check `uploads/hls/{videoId}/` directory exists
- Ensure FFmpeg completed successfully

---

**Last Updated:** January 2025  
**Status:** Backend implementation complete, frontend integration pending
