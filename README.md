# SolPlay 402

> Decentralized video streaming platform with micropayments on Solana using x402 HTTP payment protocol

[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://solana.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Anchor](https://img.shields.io/badge/Anchor-0.31.1-purple)](https://anchor-lang.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://typescriptlang.org)

---

## Overview

SolPlay 402 is a decentralized video streaming platform that enables creators to monetize content through micropayments. Built on Solana blockchain with the x402 HTTP payment standard for efficient, low-cost transactions.

### Key Features

✅ **Pay-Per-Chunk Streaming** - Only pay for what you watch  
✅ **Batch Settlement** - 99% gas savings vs per-chunk transactions  
✅ **Trustless Payments** - Smart contract-enforced revenue distribution  
✅ **IPFS Storage** - Decentralized video hosting  
✅ **HLS Adaptive Streaming** - Smooth playback experience  
✅ **Multi-Wallet Support** - Phantom, Solflare, and more

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SolPlay 402 Platform                    │
└─────────────────────────────────────────────────────────────┘

Frontend (Next.js)              Backend (Express)          Blockchain (Solana)
─────────────────              ───────────────────         ────────────────────
• Video player                 • Video transcoding         • Platform PDA
• Wallet integration           • x402 middleware           • Video PDAs
• Settlement UI                • Chunk tracking            • Viewer sessions
• Creator dashboard            • Event listener            • Token transfers
• Viewer dashboard             • API endpoints             • Settlements

                    HTTP + x402 Payment
Frontend ←──────────────────────────────────────→ Backend
                                                      ↓
                                              Smart Contract
                                              (Revenue Split)
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Solana CLI
- Anchor CLI
- PostgreSQL
- FFmpeg

### Installation

```bash
# Clone repository
git clone https://github.com/Shivam-Prajapati-59/solplay_402.git
cd solplay_402

# Install dependencies
npm install             # Root
cd frontend && npm install
cd backend && npm install

# Set up environment
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# Set up database
createdb solplay_402
cd backend && npm run db:migrate
```

### Deploy to Devnet

```bash
# Configure Solana for devnet
solana config set --url https://api.devnet.solana.com

# Get SOL
solana airdrop 2

# Build and deploy smart contract
anchor build
anchor deploy

# Initialize platform
anchor run initialize-platform

# Update environment variables with addresses from output

# Start services
cd backend && npm run dev      # Terminal 1
cd frontend && npm run dev     # Terminal 2
```

**Open**: http://localhost:3000

---

## Documentation

📖 **[Frontend README](FRONTEND_README.md)** - Next.js app, components, wallet integration  
📖 **[Backend README](BACKEND_README.md)** - Express API, x402 middleware, database  
📖 **[Smart Contract README](CONTRACT_README.md)** - Solana program, instructions, PDAs

---

## Tech Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **UI**: React 19, TailwindCSS, shadcn/ui
- **Blockchain**: Solana Wallet Adapter, Anchor
- **Payment**: x402-axios
- **Video**: HLS.js

### Backend

- **Runtime**: Node.js + Express
- **Database**: PostgreSQL + Drizzle ORM
- **Blockchain**: Solana Web3.js + Anchor
- **Payment**: x402-express middleware
- **Video**: FFmpeg

### Smart Contract

- **Framework**: Anchor 0.31.1
- **Language**: Rust
- **Blockchain**: Solana
- **Token**: SPL Token standard

---

## How It Works

### 1. Video Upload (Creator)

```
Creator → Upload video → Backend transcodes to HLS
       → Upload to IPFS → Register on blockchain
       → Set price per chunk
```

### 2. Streaming Session (Viewer)

```
Viewer → Connect wallet → Browse videos
       → Click "Watch Now" → Approve delegation (one-time)
       → Stream video with x402 payment proofs
```

### 3. Payment Flow

```
Traditional (expensive):
Chunk 1 → Transaction → Fee
Chunk 2 → Transaction → Fee
...
100 chunks = 100 transactions ❌

SolPlay 402 (efficient):
Chunk 1 → Off-chain tracking
Chunk 2 → Off-chain tracking
...
Settlement → 1 Transaction → 99% savings ✅
```

### 4. Settlement

```
Viewer → Clicks "Settle Now"
       → Smart contract transfers tokens:
         • 97.5% to creator
         • 2.5% to platform
       → Chunks cleared from tracker
```

---

## Project Structure

```
solplay_402/
├── programs/
│   └── solplay_402/
│       └── src/
│           ├── lib.rs              # Program entry
│           ├── instructions/       # Smart contract functions
│           └── state/              # Account structures
├── frontend/
│   ├── app/                        # Next.js pages
│   ├── components/                 # React components
│   ├── lib/anchor/                 # Blockchain client
│   └── hooks/                      # React hooks
├── backend/
│   ├── src/
│   │   ├── controllers/           # API endpoints
│   │   ├── services/              # Business logic
│   │   └── middleware/            # x402, auth
│   └── migrations/                # Database migrations
├── scripts/                        # Deployment scripts
└── tests/                         # Integration tests
```

---

## Revenue Model

### For Creators

- Set price per video chunk (e.g., 0.001 tokens)
- Receive 97.5% of viewer payments
- Instant settlement to wallet

### For Platform

- 2.5% fee on all transactions
- Covers hosting and transaction costs
- Sustainable operation

### For Viewers

- Pay only for what you watch
- No subscriptions or upfront costs
- Batch settlement for low fees

---

## Development

### Run Locally

```bash
# Terminal 1: Solana local validator (optional)
solana-test-validator

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

### Run Tests

```bash
# Smart contract tests
anchor test

# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

---

## Deployment

### Devnet

See deployment script: `./deploy-devnet.sh`

### Mainnet

1. Update `Anchor.toml` to mainnet-beta
2. Deploy smart contract with `anchor deploy`
3. Initialize platform with mainnet SOL
4. Update environment variables
5. Deploy frontend (Vercel)
6. Deploy backend (Railway/Fly.io)

---

## Environment Variables

### Required Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=<your-program-id>
NEXT_PUBLIC_TOKEN_MINT=<your-token-mint>

# Backend (.env)
DATABASE_URL=postgresql://localhost:5432/solplay_402
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=<your-program-id>
TOKEN_MINT=<your-token-mint>
PLATFORM_AUTHORITY_PRIVATE_KEY=[...]
```

See `.env.example` files for complete lists.

---

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow commit message conventions

---

## Security

### Reporting Vulnerabilities

Please report security issues to: security@solplay402.com

### Security Features

- SPL token delegation (no direct wallet access)
- Smart contract validation (Anchor framework)
- Rate limiting on API endpoints
- CORS protection
- Input sanitization

---

## Roadmap

### Phase 1 (Current)

- [x] Basic streaming functionality
- [x] x402 payment integration
- [x] Batch settlement
- [x] Creator/viewer dashboards

### Phase 2 (Q2 2025)

- [ ] Mobile app (React Native)
- [ ] Live streaming support
- [ ] NFT-gated content
- [ ] Enhanced analytics

### Phase 3 (Q3 2025)

- [ ] Multi-token support
- [ ] Cross-chain bridges
- [ ] Creator subscriptions
- [ ] Social features

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

## Links

- **Website**: https://solplay402.com (coming soon)
- **Documentation**: See README files above
- **Twitter**: [@solplay402](https://twitter.com/solplay402)
- **Discord**: [Join our community](https://discord.gg/solplay402)
- **Solana Explorer**: https://explorer.solana.com

---

## Acknowledgments

- **Solana Foundation** - Blockchain infrastructure
- **Anchor Framework** - Smart contract development
- **x402 Protocol** - HTTP payment standard
- **Vercel** - Frontend hosting
- **shadcn/ui** - UI components

---

## Support

Need help? Check out:

- 📖 [Frontend README](FRONTEND_README.md)
- 📖 [Backend README](BACKEND_README.md)
- 📖 [Contract README](CONTRACT_README.md)
- 💬 [Discord Community](https://discord.gg/solplay402)
- 🐛 [GitHub Issues](https://github.com/Shivam-Prajapati-59/solplay_402/issues)

---

**Built with ❤️ on Solana**
