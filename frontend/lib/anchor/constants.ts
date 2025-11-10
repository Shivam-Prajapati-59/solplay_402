/**
 * Anchor constants for Solplay 402 platform
 */

// Platform authority public key - used for settlement transactions
// This should match the PLATFORM_AUTHORITY_PRIVATE_KEY public key on backend
export const PLATFORM_AUTHORITY =
  process.env.NEXT_PUBLIC_PLATFORM_AUTHORITY ||
  "11111111111111111111111111111111"; // Replace with actual platform authority pubkey

// Video price per chunk in lamports (default 0.001 SOL = 1,000,000 lamports)
export const DEFAULT_PRICE_PER_CHUNK = 1_000_000;

// Platform fee percentage (5%)
export const PLATFORM_FEE_BPS = 500; // 500 basis points = 5%

// Chunk duration in seconds (10 seconds per chunk)
export const CHUNK_DURATION_SECONDS = 10;

// Program ID (replace with your deployed program ID)
export const PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID || "11111111111111111111111111111111";

// Network cluster
export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ||
  "devnet") as "devnet" | "testnet" | "mainnet-beta" | "localnet";

// RPC endpoint
export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_ENDPOINT ||
  (SOLANA_NETWORK === "devnet"
    ? "https://api.devnet.solana.com"
    : SOLANA_NETWORK === "localnet"
    ? "http://localhost:8899"
    : "https://api.mainnet-beta.solana.com");
