// =============================================================================
// Anchor Program Client
// =============================================================================
// Initializes and exports the Anchor program instance for SolPlay 402
// =============================================================================

import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { Solplay402 } from "./types";
import IDL from "./idl.json";

// Program ID from deployment
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
    "26vn3c6kbcr5GMTn5pJj4TShcwTFgJvMMjqdm5oVAxFf"
);

// Solana network configuration
export const SOLANA_NETWORK =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "http://127.0.0.1:8899";

/**
 * Get Anchor program instance
 * @param wallet - Wallet adapter
 * @param connection - Optional connection (will create if not provided)
 */
export function getProgram(
  wallet: any,
  connection?: Connection
): Program<Solplay402> {
  const conn = connection || new Connection(SOLANA_RPC_URL, "confirmed");

  // Create provider
  const provider = new AnchorProvider(
    conn,
    wallet,
    AnchorProvider.defaultOptions()
  );

  // Create and return program
  return new Program(IDL as any, provider) as Program<Solplay402>;
}

/**
 * Get read-only program instance (no wallet required)
 * Useful for fetching account data without wallet connection
 */
export function getReadOnlyProgram(
  connection?: Connection
): Program<Solplay402> {
  const conn = connection || new Connection(SOLANA_RPC_URL, "confirmed");

  // Create a minimal provider for read-only operations
  const provider = new AnchorProvider(
    conn,
    {} as any,
    AnchorProvider.defaultOptions()
  );

  return new Program(IDL as any, provider) as Program<Solplay402>;
}

// Export types
export type { Solplay402 };
