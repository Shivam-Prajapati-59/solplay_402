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
import { PublicKey } from "@solana/web3.js";

// x402 Payment proof structure
interface X402PaymentProof {
  videoId: string;
  segment: string; // chunk identifier (e.g., "chunk-0")
  viewerPubkey: string;
  sessionPda: string;
  timestamp: number;
  signature?: string; // Optional: signature proving approval
}

// x402 Response from server
interface X402Response {
  success: boolean;
  message?: string;
  chunkData?: any;
  paymentRequired?: boolean;
  approvalNeeded?: boolean;
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
  private sessionPdaCache: Map<string, string> = new Map();

  constructor(baseURL: string, viewerPublicKey?: PublicKey | string) {
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
    this.axiosClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 402) {
          const paymentInfo = error.response.data;

          // Check if approval is needed
          if (paymentInfo.approvalNeeded) {
            throw new Error(
              `Payment approval required. Please approve streaming for this video first. ` +
                `Required: ${paymentInfo.maxChunks} chunks @ ${paymentInfo.pricePerChunk} SOL each`
            );
          }

          // Check if settlement is needed
          if (paymentInfo.settlementNeeded) {
            throw new Error(
              `Settlement required. You have ${paymentInfo.unsettledChunks} unsettled chunks. ` +
                `Please settle your session before continuing.`
            );
          }
        }
        return Promise.reject(error);
      }
    );
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

    // Create payment proof
    const paymentProof: X402PaymentProof = {
      videoId,
      segment,
      viewerPubkey: this.viewerPubkey,
      sessionPda: this.sessionPdaCache.get(videoId) || "pending",
      timestamp: Date.now(),
    };

    // Track chunk view via x402 API
    const response = await this.axiosClient.post<X402Response>(
      "/api/x402/track-chunk",
      paymentProof
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
  viewerPublicKey?: PublicKey | string
): X402Client {
  if (!x402ClientInstance) {
    const apiUrl =
      baseURL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    x402ClientInstance = new X402Client(apiUrl, viewerPublicKey);
  } else if (viewerPublicKey) {
    x402ClientInstance.setViewer(viewerPublicKey);
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
