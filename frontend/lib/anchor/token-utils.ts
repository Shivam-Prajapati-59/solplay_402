// =============================================================================
// Token Account Utilities
// =============================================================================
// Helper functions for managing SPL token accounts
// =============================================================================

import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

/**
 * Get or create associated token account
 * @param connection - Solana connection
 * @param tokenMint - Token mint address
 * @param owner - Owner's public key
 * @param payer - Payer's public key (for account creation)
 * @returns Token account address and whether it was created
 */
export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  tokenMint: PublicKey,
  owner: PublicKey,
  payer: PublicKey
): Promise<{ address: PublicKey; needsCreation: boolean; instruction?: any }> {
  const associatedToken = await getAssociatedTokenAddress(
    tokenMint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Check if account exists
  try {
    await getAccount(connection, associatedToken);
    return {
      address: associatedToken,
      needsCreation: false,
    };
  } catch (error: any) {
    // Account doesn't exist, need to create it
    if (
      error.message?.includes("could not find account") ||
      error.message?.includes("Invalid account")
    ) {
      const instruction = createAssociatedTokenAccountInstruction(
        payer,
        associatedToken,
        owner,
        tokenMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      return {
        address: associatedToken,
        needsCreation: true,
        instruction,
      };
    }
    throw error;
  }
}

/**
 * Get token balance
 * @param connection - Solana connection
 * @param tokenAccount - Token account address
 * @returns Balance in smallest unit
 */
export async function getTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<bigint> {
  try {
    const account = await getAccount(connection, tokenAccount);
    return account.amount;
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return BigInt(0);
  }
}

/**
 * Format token amount for display
 * @param amount - Amount in smallest unit
 * @param decimals - Token decimals (default 6 for USDC)
 * @returns Formatted string
 */
export function formatTokenAmount(
  amount: bigint | number,
  decimals: number = 6
): string {
  const amountBigInt = typeof amount === "number" ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const whole = amountBigInt / divisor;
  const fraction = amountBigInt % divisor;

  if (fraction === BigInt(0)) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, "0");
  const trimmedFraction = fractionStr.replace(/0+$/, "");

  return `${whole}.${trimmedFraction}`;
}

/**
 * Parse token amount from string
 * @param amount - Amount string (e.g., "0.001")
 * @param decimals - Token decimals (default 6 for USDC)
 * @returns Amount in smallest unit
 */
export function parseTokenAmount(amount: string, decimals: number = 6): bigint {
  const [whole, fraction = ""] = amount.split(".");
  const fractionPadded = fraction.padEnd(decimals, "0").slice(0, decimals);
  const amountStr = whole + fractionPadded;
  return BigInt(amountStr);
}

/**
 * Check if user has sufficient balance
 * @param connection - Solana connection
 * @param tokenAccount - Token account address
 * @param requiredAmount - Required amount in smallest unit
 * @returns Whether user has sufficient balance
 */
export async function hasSufficientBalance(
  connection: Connection,
  tokenAccount: PublicKey,
  requiredAmount: bigint
): Promise<boolean> {
  const balance = await getTokenBalance(connection, tokenAccount);
  return balance >= requiredAmount;
}

export const tokenUtils = {
  getOrCreateAssociatedTokenAccount,
  getTokenBalance,
  formatTokenAmount,
  parseTokenAmount,
  hasSufficientBalance,
};

export default tokenUtils;
