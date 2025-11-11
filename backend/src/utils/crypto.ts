// =============================================================================
// Cryptographic Utilities
// =============================================================================
// Solana signature verification and payment proof validation
// =============================================================================

import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

/**
 * Verify a Solana wallet signature
 *
 * @param message - The original message that was signed
 * @param signature - Base58-encoded signature
 * @param publicKey - Signer's public key (base58 string or PublicKey)
 * @returns true if signature is valid
 */
export function verifySolanaSignature(
  message: string,
  signature: string,
  publicKey: string | PublicKey
): boolean {
  try {
    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);

    // Decode signature from base58
    const signatureBytes = bs58.decode(signature);

    // Convert public key to bytes
    const publicKeyBytes =
      typeof publicKey === "string"
        ? new PublicKey(publicKey).toBytes()
        : publicKey.toBytes();

    // Verify signature using ed25519
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Verify an x402 payment proof signature
 *
 * Expected message format: "x402-payment:<videoId>:<segment>:<timestamp>:<sessionPda>"
 *
 * @param paymentProof - Payment proof object from client
 * @returns { valid: boolean, error?: string }
 */
export function verifyPaymentProof(paymentProof: any): {
  valid: boolean;
  error?: string;
} {
  try {
    // Parse payment proof if it's a string
    const proof =
      typeof paymentProof === "string"
        ? JSON.parse(paymentProof)
        : paymentProof;

    const { videoId, segment, viewerPubkey, sessionPda, timestamp, signature } =
      proof;

    // Check required fields
    if (!videoId || !segment || !viewerPubkey || !timestamp) {
      return {
        valid: false,
        error: "Missing required fields in payment proof",
      };
    }

    // If no signature provided, it's valid but unverified (backward compatibility)
    if (!signature) {
      console.warn("⚠️ Payment proof has no signature (unverified)");
      return { valid: true };
    }

    // Reconstruct the message that should have been signed
    const expectedMessage = `x402-payment:${videoId}:${segment}:${timestamp}:${
      sessionPda || "pending"
    }`;

    // Verify the signature
    const isValid = verifySolanaSignature(
      expectedMessage,
      signature,
      viewerPubkey
    );

    if (!isValid) {
      return {
        valid: false,
        error: "Invalid signature - payment proof verification failed",
      };
    }

    // Check timestamp freshness (prevent replay attacks)
    const now = Date.now();
    const age = now - timestamp;
    const MAX_AGE = 5 * 60 * 1000; // 5 minutes

    if (age > MAX_AGE) {
      return {
        valid: false,
        error: `Payment proof expired (age: ${Math.round(age / 1000)}s)`,
      };
    }

    if (age < -60000) {
      // More than 1 minute in the future
      return {
        valid: false,
        error: "Payment proof timestamp is in the future",
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Payment proof verification error:", error);
    return {
      valid: false,
      error: `Verification error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Extract viewer public key from payment proof
 */
export function extractViewerPubkey(paymentProof: any): string | null {
  try {
    const proof =
      typeof paymentProof === "string"
        ? JSON.parse(paymentProof)
        : paymentProof;
    return proof.viewerPubkey || null;
  } catch {
    return null;
  }
}
