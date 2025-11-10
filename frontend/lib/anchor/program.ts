// =============================================================================
// Anchor Program Client
// =============================================================================
// Initializes and exports the Anchor program instance for SolPlay 402
// =============================================================================

import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { Solplay402 } from "../../../target/types/solplay_402";
import IDL from "./idl.json";

// Program ID from deployment
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
    "CM19aL9CP8dRjVzRUEW6AMxYgftdSvPgQ5Yzniq5sPXV"
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

  // Create and return program with proper typing
  return new Program(IDL as Solplay402, provider);
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

  return new Program(IDL as Solplay402, provider);
}

// Export types
export type { Solplay402 };
