# SolPlay 402 - Backend API

> Node.js/Express backend for SolPlay 402 video streaming platform with x402 payment integration

---

## Overview

The backend provides:

- **Video Management**: Upload, transcode, and serve HLS streams
- **x402 Payment Middleware**: HTTP-based micropayment validation
- **Chunk Tracking**: Off-chain tracking of video chunk consumption
- **Blockchain Integration**: Listens to on-chain events and syncs state
- **Settlement Management**: Batch settlement coordination

---

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Blockchain**: Solana Web3.js + Anchor
- **Payment**: x402-express middleware
- **Video**: FFmpeg for transcoding
- **Storage**: Local filesystem + IPFS

---

## Project Structure

```
backend/
├── src/
│   ├── server.ts                  # Main entry point
│   ├── app.ts                     # Express app + x402 middleware
│   ├── config/
│   │   └── index.ts              # Configuration management
│   ├── controllers/
│   │   ├── video.controller.ts   # Video CRUD + HLS serving
│   │   └── x402-payment.controller.ts  # Payment endpoints
│   ├── services/
│   │   ├── video.service.ts      # Video processing
│   │   ├── blockchain-listener.service.ts  # Event listener
│   │   └── chunk-payment-tracker.service.ts  # In-memory tracking
│   ├── routes/
│   │   ├── video.routes.ts       # Video API routes
│   │   └── x402-payment.routes.ts  # Payment routes
│   ├── middleware/
│   │   └── auth.middleware.ts    # Authentication
│   ├── db/
│   │   ├── index.ts              # Database client
│   │   └── schema.ts             # Drizzle schema
│   └── utils/
│       └── logger.ts             # Logging utility
├── migrations/                    # Database migrations
├── public/                        # Static files
├── .env                          # Environment variables
└── package.json
```

---

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- FFmpeg (for video transcoding)
- Solana CLI (for blockchain interaction)

### Setup

```bash
# Install dependencies
npm install

# Set up database
createdb solplay_402

# Run migrations
npm run db:migrate

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

---

## Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/solplay_402

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
PROGRAM_ID=CM19aL9CP8dRjVzRUEW6AMxYgftdSvPgQ5Yzniq5sPXV
TOKEN_MINT=<your-token-mint>
PLATFORM_AUTHORITY_PRIVATE_KEY=[1,2,3,...]  # Array format

# x402 Payment
X402_PAYMENT_NETWORK=solana-devnet
X402_PAYMENT_ADDRESS=<your-wallet-address>
X402_FACILITATOR_URL=https://facilitator.payai.network

# Video Storage
VIDEO_STORAGE_PATH=./public/videos
IPFS_GATEWAY_URL=https://gateway.lighthouse.storage
```

---

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### With Docker

```bash
docker-compose up
```

---

## API Endpoints

### Video Management

#### Create Video

```http
POST /api/video/create
Content-Type: multipart/form-data

{
  "file": <video-file>,
  "title": "My Video",
  "description": "Video description",
  "pricePerChunk": 1000000  # 0.001 tokens
}

Response: {
  "success": true,
  "data": {
    "id": 1,
    "videoId": "abc123",
    "ipfsCid": "Qm...",
    "hlsPlaylistUrl": "/api/video/abc123/playlist.m3u8"
  }
}
```

#### List Videos

```http
GET /api/video/list

Response: {
  "success": true,
  "data": [...]
}
```

#### Get Video

```http
GET /api/video/:id

Response: {
  "success": true,
  "data": { ... }
}
```

#### Serve HLS Playlist

```http
GET /api/video/:videoId/playlist.m3u8

Response: M3U8 playlist
```

#### Serve Video Segment (Protected by x402)

```http
GET /api/video/:videoId/:segment
Headers:
  - x402-payment-proof: <payment-proof>

Response: Video chunk (TS file)
```

### Payment Management

#### Get Unsettled Chunks

```http
GET /api/x402/unsettled/:videoId?viewerPubkey=<pubkey>

Response: {
  "unsettledChunks": 10,
  "estimatedCost": 10000000
}
```

#### Get Settlement Preview

```http
GET /api/x402/preview/:sessionPda?videoId=5&viewerPubkey=<pubkey>

Response: {
  "preview": {
    "unsettledChunks": 10,
    "totalPayment": 10000000,
    "platformFee": 250000,
    "creatorAmount": 9750000
  }
}
```

---

## x402 Payment Flow

### 1. Viewer Approves Delegate

- Frontend calls `approveStreamingDelegate()` on smart contract
- Viewer approves token spending up to max amount
- Delegation stored on-chain

### 2. Chunk Delivery with x402

```
Request: GET /api/video/5/segment0.ts
  └─> x402 middleware validates payment proof
  └─> Checks delegation exists and is valid
  └─> Serves chunk if authorized
  └─> Tracks chunk view in memory
```

### 3. Batch Settlement

```
Frontend: Click "Settle Now"
  └─> Call settleSessionBatch() on blockchain
  └─> Transfer tokens (viewer → creator + platform)
  └─> Blockchain listener detects settlement
  └─> Backend clears settled chunks from memory
```

---

## Database Schema

### Videos

```sql
CREATE TABLE videos (
  id SERIAL PRIMARY KEY,
  video_id VARCHAR(255) UNIQUE,
  creator_pubkey VARCHAR(255),
  ipfs_cid TEXT,
  title TEXT,
  description TEXT,
  price_per_chunk BIGINT,
  total_chunks INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Blockchain Sessions

```sql
CREATE TABLE blockchain_sessions (
  id SERIAL PRIMARY KEY,
  session_pda VARCHAR(255) UNIQUE,
  video_id INTEGER REFERENCES videos(id),
  viewer_pubkey VARCHAR(255),
  max_approved_chunks INTEGER,
  chunks_consumed INTEGER DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  session_start TIMESTAMP,
  session_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Settlements

```sql
CREATE TABLE settlements (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES blockchain_sessions(id),
  video_id INTEGER REFERENCES videos(id),
  chunk_count INTEGER,
  total_payment BIGINT,
  platform_fee BIGINT,
  creator_amount BIGINT,
  transaction_signature VARCHAR(255),
  block_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Blockchain Listener

The backend continuously listens to on-chain events:

```typescript
// Listens for:
- VideoCreated
- StreamingSessionStarted
- SessionSettled
- SessionClosed

// Syncs to database:
- Creates video records
- Updates session state
- Records settlements
- Clears settled chunks from memory
```

### Starting the Listener

```bash
# Automatically starts with the server
npm run dev

# Or manually
npm run listener
```

---

## Video Processing

### Upload Flow

```
1. Client uploads video file
2. Backend saves to filesystem
3. FFmpeg transcodes to HLS (M3U8 + TS segments)
4. Optional: Upload to IPFS
5. Register video on blockchain
6. Return video metadata
```

### Transcoding

```bash
# Automatic HLS generation
ffmpeg -i input.mp4 \
  -codec: copy \
  -start_number 0 \
  -hls_time 10 \
  -hls_list_size 0 \
  -f hls \
  output.m3u8
```

---

## Chunk Payment Tracking

### In-Memory Tracker

- Tracks chunk views per video/viewer
- Marks chunks as settled after blockchain settlement
- Clears settled chunks to avoid double-charging

### Flow

```typescript
// Viewer watches chunk 0
recordChunkView(videoId: "5", segment: "segment0.ts", proof, viewerPubkey)
  └─> chunkViews["5:viewer"] = [{ segment: 0, settled: false }]

// Viewer settles
settleSession(chunkCount: 10)
  └─> Blockchain settlement
  └─> Listener detects settlement
  └─> clearSettledChunks("5", "viewer")
  └─> chunkViews["5:viewer"] = []
```

---

## Scripts

### Initialize Platform

```bash
npm run init-platform
```

### Sync Videos to Blockchain

```bash
npm run sync-videos
```

### Mint Test Tokens

```bash
npm run mint-tokens
```

### Database Migrations

```bash
npm run db:migrate      # Run migrations
npm run db:rollback     # Rollback last migration
npm run db:reset        # Reset database
```

---

## Development

### Watch Mode

```bash
npm run dev  # Auto-reloads on file changes
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Testing

```bash
npm test
npm run test:watch
```

---

## Deployment

### Devnet

```bash
# Update .env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Deploy smart contract first (see CONTRACT_README.md)
# Then start backend
npm start
```

### Production (Mainnet)

```bash
# Use production RPC
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# Use production database
DATABASE_URL=postgresql://prod-user:pass@prod-db/solplay

# Build and run
npm run build
npm start

# Or with PM2
pm2 start npm --name "solplay-backend" -- start
```

---

## Monitoring

### Logs

```bash
# View logs
npm run logs

# Tail logs
tail -f logs/app.log
```

### Health Check

```http
GET /health

Response: { "status": "ok", "timestamp": "..." }
```

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3001
kill -9 $(lsof -t -i:3001)
```

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready

# Reset database
npm run db:reset
```

### Blockchain Listener Not Working

```bash
# Check RPC URL is correct
curl $SOLANA_RPC_URL

# Verify program ID
solana program show $PROGRAM_ID
```

### x402 Payment Failing

```bash
# Check facilitator is reachable
curl $X402_FACILITATOR_URL

# Verify payment address has tokens
solana balance $X402_PAYMENT_ADDRESS
```

---

## Support

- **Frontend**: See `frontend/README.md`
- **Smart Contract**: See `CONTRACT_README.md`
- **Issues**: https://github.com/Shivam-Prajapati-59/solplay_402/issues

---

**Built with Express.js + Solana Web3.js**
