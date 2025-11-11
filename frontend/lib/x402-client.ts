/**
 * x402 Solana Client for Browser (Delegate-Based)
 *
 * Instead of using private keys (insecure in browser), this client uses:
 * 1. User approves delegate (platform authority) to spend on their behalf
 * 2. Delegate creates and submits transactions for x402 payments
 * 3. User never exposes private key to browser
 *
 * Flow:
 * 1. User clicks "Watch Video" → approve_streaming() creates ViewerSession
 * 2. Video player loads chunks → each chunk tracked via x402 HTTP
 * 3. Server validates delegate can spend from approved session
 * 4. Periodically: user settles accumulated chunks in batch
 *
 * This is MORE secure than traditional x402 because:
 * - No private keys in browser
 * - Pre-approved spending limits
 * - Batch settlements reduce gas fees by 99%
 * - Full transparency on-chain
 */

import axios, { AxiosInstance, AxiosResponse } from "axios";
import { PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";

// x402 Payment proof structure
interface X402PaymentProof {
  videoId: string;
  segment: string; // chunk identifier (e.g., "chunk-0")
  viewerPubkey: string;
  sessionPda: string;
  timestamp: number;
  signature?: string; // Signature of payment intent message
}

// x402 Response from server
interface X402Response {
  success: boolean;
  message?: string;
  chunkData?: any;
  paymentRequired?: boolean;
  approvalNeeded?: boolean;
  transaction?: string; // Transaction signature if payment executed
}

// Wallet signer interface (compatible with Solana wallet adapters)
interface WalletSigner {
  publicKey: PublicKey;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction?: <T extends Transaction>(transaction: T) => Promise<T>;
}

/**
 * x402 Client with Delegate-Based Payments
 *
 * Usage:
 * ```typescript
 * const client = new X402Client(apiBaseUrl, userPublicKey);
 *
 * // Approve session first (one-time)
 * await client.approveSession(videoId, maxChunks);
 *
 * // Then fetch chunks (automatic payment tracking)
 * const chunk0 = await client.fetchChunk(videoId, 0);
 * const chunk1 = await client.fetchChunk(videoId, 1);
 *
 * // Settle periodically
 * await client.settleSession(videoId);
 * ```
 */
export class X402Client {
  private axiosClient: AxiosInstance;
  private viewerPubkey: string | null = null;
  private wallet: WalletSigner | null = null;
  private sessionPdaCache: Map<string, string> = new Map();

  constructor(
    baseURL: string,
    viewerPublicKey?: PublicKey | string,
    wallet?: WalletSigner
  ) {
    this.axiosClient = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    if (viewerPublicKey) {
      this.viewerPubkey = viewerPublicKey.toString();
    }

    if (wallet) {
      this.wallet = wallet;
      this.viewerPubkey = wallet.publicKey.toString();
    }

    // Add request interceptor to inject payment proofs
    this.axiosClient.interceptors.request.use(
      (config) => {
        // Add viewer pubkey to all requests if available
        if (this.viewerPubkey) {
          config.headers["X-Viewer-Pubkey"] = this.viewerPubkey;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle 402 Payment Required
    // Similar to x402-axios but adapted for chunk-based streaming
    this.axiosClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 402) {
          const paymentInfo = error.response.data;
          const originalRequest = error.config;

          // Prevent infinite retry loops
          if (originalRequest._retry) {
            throw error;
          }
          originalRequest._retry = true;

          // Check if approval is needed first
          if (paymentInfo.approvalNeeded) {
            throw new Error(
              `Payment approval required. Please approve streaming for this video first. ` +
                `Required: ${paymentInfo.maxChunks} chunks @ ${paymentInfo.pricePerChunk} tokens each`
            );
          }

          // Check if settlement is needed
          if (paymentInfo.settlementNeeded) {
            throw new Error(
              `Settlement required. You have ${paymentInfo.unsettledChunks} unsettled chunks. ` +
                `Please settle your session before continuing.`
            );
          }

          // If we have a wallet with signing capability, create payment proof
          if (this.wallet?.signMessage && paymentInfo.paymentRequired) {
            try {
              console.log("💳 402 Payment Required - Creating proof...");

              // Create payment message (like x402 spec)
              const paymentMessage = this.createPaymentMessage(paymentInfo);

              // Sign the message
              const signature = await this.signPaymentMessage(paymentMessage);

              // Add signature to request and retry
              originalRequest.headers["X-Payment-Proof"] = signature;
              originalRequest.data = {
                ...JSON.parse(originalRequest.data || "{}"),
                paymentSignature: signature,
              };

              console.log("✅ Payment proof created, retrying request...");
              return this.axiosClient(originalRequest);
            } catch (signError) {
              console.error("❌ Failed to create payment proof:", signError);
              throw new Error(
                `Payment signing failed: ${
                  signError instanceof Error
                    ? signError.message
                    : "Unknown error"
                }`
              );
            }
          }

          // If no wallet or signing not supported, throw original error
          throw error;
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create a payment message for signing (x402 spec compliant)
   * Format: "x402-payment:<videoId>:<segment>:<timestamp>:<sessionPda>"
   */
  private createPaymentMessage(paymentInfo: any): string {
    const { videoId, segment, sessionPda } = paymentInfo;
    const timestamp = Date.now();
    return `x402-payment:${videoId}:${segment}:${timestamp}:${
      sessionPda || "pending"
    }`;
  }

  /**
   * Sign a payment message using the wallet
   * Returns base58-encoded signature
   */
  private async signPaymentMessage(message: string): Promise<string> {
    if (!this.wallet?.signMessage) {
      throw new Error("Wallet does not support message signing");
    }

    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = await this.wallet.signMessage(messageBytes);
    return bs58.encode(signatureBytes);
  }

  /**
   * Set the wallet signer for automatic payment signing
   */
  setWallet(wallet: WalletSigner): void {
    this.wallet = wallet;
    this.viewerPubkey = wallet.publicKey.toString();
  }

  /**
   * Set the viewer's public key
   */
  setViewer(publicKey: PublicKey | string): void {
    this.viewerPubkey = publicKey.toString();
  }

  /**
   * Fetch a video chunk with automatic x402 payment tracking
   *
   * @param videoId - Blockchain video ID
   * @param segmentIndex - Chunk index (0, 1, 2, ...)
   * @returns Chunk data
   */
  async fetchChunk(videoId: string, segmentIndex: number): Promise<any> {
    if (!this.viewerPubkey) {
      throw new Error("Viewer public key not set. Call setViewer() first.");
    }

    const segment = `chunk-${segmentIndex}`;
    const sessionPda = this.sessionPdaCache.get(videoId) || "pending";
    const timestamp = Date.now();

    // Create payment proof object
    const paymentProof: any = {
      viewerPubkey: this.viewerPubkey,
      sessionPda,
      timestamp,
    };

    // If wallet is available and supports signing, sign the payment proof
    if (this.wallet?.signMessage) {
      try {
        const message = `x402-payment:${videoId}:${segment}:${timestamp}:${sessionPda}`;
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = await this.wallet.signMessage(messageBytes);
        paymentProof.signature = bs58.encode(signatureBytes);

        console.log(`🔐 Signed payment proof for ${segment}`);
      } catch (error) {
        console.warn(
          "⚠️ Failed to sign payment proof (continuing without signature):",
          error
        );
      }
    }

    // Track chunk view via x402 API with correct structure
    const response = await this.axiosClient.post<X402Response>(
      "/api/x402/track-chunk",
      {
        videoId,
        segment,
        paymentProof: JSON.stringify(paymentProof), // Backend expects paymentProof as a field
        viewerPubkey: this.viewerPubkey,
      }
    );

    return response.data;
  }

  /**
   * Fetch chunk with URL (for HLS player compatibility)
   *
   * @param chunkUrl - Full URL to chunk
   * @param videoId - Video ID for payment tracking
   * @param segmentIndex - Chunk index
   */
  async fetchChunkByUrl(
    chunkUrl: string,
    videoId: string,
    segmentIndex: number
  ): Promise<ArrayBuffer> {
    // Track the chunk view first
    await this.fetchChunk(videoId, segmentIndex);

    // Then fetch the actual chunk data
    const response = await axios.get(chunkUrl, {
      responseType: "arraybuffer",
    });

    return response.data;
  }

  /**
   * Get unsettled chunk count for a video
   */
  async getUnsettledCount(videoId: string): Promise<number> {
    if (!this.viewerPubkey) {
      throw new Error("Viewer public key not set");
    }

    const response = await this.axiosClient.get(
      `/api/x402/unsettled/${videoId}`,
      {
        params: { viewerPubkey: this.viewerPubkey },
      }
    );

    return response.data.unsettledChunks || 0;
  }

  /**
   * Get settlement preview
   */
  async getSettlementPreview(
    videoId: string,
    sessionPda?: string
  ): Promise<{
    totalPayment: number;
    platformFee: number;
    creatorAmount: number;
    chunksRemaining: number;
  }> {
    if (!this.viewerPubkey) {
      throw new Error("Viewer public key not set");
    }

    const pda =
      sessionPda || this.sessionPdaCache.get(videoId) || "placeholder";

    const response = await this.axiosClient.get(`/api/x402/preview/${pda}`, {
      params: {
        videoId,
        viewerPubkey: this.viewerPubkey,
      },
    });

    return response.data.preview;
  }

  /**
   * Cache the session PDA for a video
   * (Called after approve_streaming creates the ViewerSession)
   */
  cacheSessionPda(videoId: string, sessionPda: string): void {
    this.sessionPdaCache.set(videoId, sessionPda);
  }

  /**
   * Clear cached session PDA
   */
  clearSessionCache(videoId?: string): void {
    if (videoId) {
      this.sessionPdaCache.delete(videoId);
    } else {
      this.sessionPdaCache.clear();
    }
  }

  /**
   * Get the underlying axios instance for custom requests
   */
  getClient(): AxiosInstance {
    return this.axiosClient;
  }
}

/**
 * Create a singleton x402 client instance
 */
let x402ClientInstance: X402Client | null = null;

export function getX402Client(
  baseURL?: string,
  viewerPublicKey?: PublicKey | string,
  wallet?: WalletSigner
): X402Client {
  if (!x402ClientInstance) {
    const apiUrl =
      baseURL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    x402ClientInstance = new X402Client(apiUrl, viewerPublicKey, wallet);
  } else {
    if (viewerPublicKey) {
      x402ClientInstance.setViewer(viewerPublicKey);
    }
    if (wallet) {
      x402ClientInstance.setWallet(wallet);
    }
  }

  return x402ClientInstance;
}

/**
 * Reset the x402 client (useful for wallet changes)
 */
export function resetX402Client(): void {
  x402ClientInstance = null;
}

export default X402Client;
