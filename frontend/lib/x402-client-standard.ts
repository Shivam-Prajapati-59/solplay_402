/**
 * x402 Standard Client for Chunk-Based Video Streaming
 *
 * Uses official x402-axios library for automatic payment handling.
 * This is MUCH simpler than our custom implementation!
 *
 * Key Benefits:
 * - Automatic 402 response handling
 * - Standard x402 spec compliance
 * - Battle-tested payment logic
 * - Less code to maintain
 *
 * Flow:
 * 1. User approves streaming session (one-time setup)
 * 2. Video player fetches chunks via this client
 * 3. x402-axios automatically handles payments per chunk
 * 4. Server validates and tracks chunk views
 * 5. Periodic batch settlement to blockchain
 */

import axios, { AxiosInstance } from "axios";
import { withPaymentInterceptor } from "x402-axios";
import { createSigner } from "x402-fetch";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

// Wallet adapter compatible interface
interface WalletAdapter {
  publicKey: PublicKey | null;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction?: (transaction: any) => Promise<any>;
}

/**
 * Create an x402-enabled axios client for chunk payments
 *
 * @param baseURL - Backend API URL
 * @param wallet - Solana wallet adapter
 * @param privateKeyBase58 - Base58 encoded private key (for signing)
 * @returns Axios instance with automatic x402 payment handling
 */
export async function createX402ChunkClient(
  baseURL: string,
  wallet: WalletAdapter,
  privateKeyBase58?: string
): Promise<AxiosInstance> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  // Create base axios client
  const baseClient = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
      "X-Viewer-Pubkey": wallet.publicKey.toBase58(),
    },
    timeout: 30000,
  });

  // If private key provided, create x402 signer
  // Note: In browser, we DON'T have private keys for security
  // So we'll use a custom payment handler instead
  if (privateKeyBase58) {
    try {
      const signer = await createSigner("solana-devnet", privateKeyBase58);
      const x402Client = withPaymentInterceptor(baseClient, signer);
      console.log("✅ x402 client created with automatic payment handling");
      return x402Client;
    } catch (error) {
      console.error("Failed to create x402 signer:", error);
    }
  }

  // For browser wallets (no private key), add custom 402 handler
  baseClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 402 && wallet.signMessage) {
        const originalRequest = error.config;

        if (originalRequest._retry) {
          return Promise.reject(error);
        }
        originalRequest._retry = true;

        try {
          const paymentInfo = error.response.data;

          // Create payment message
          const message = `x402-payment:${paymentInfo.videoId}:${
            paymentInfo.segment
          }:${Date.now()}`;
          const messageBytes = new TextEncoder().encode(message);

          // Sign with wallet
          const signature = await wallet.signMessage(messageBytes);
          const signatureBase58 = bs58.encode(signature);

          // Retry with payment proof
          originalRequest.headers["X-Payment-Proof"] = signatureBase58;
          originalRequest.data = {
            ...JSON.parse(originalRequest.data || "{}"),
            paymentSignature: signatureBase58,
          };

          console.log("✅ Payment proof created, retrying...");
          return baseClient(originalRequest);
        } catch (signError) {
          console.error("Payment signing failed:", signError);
          return Promise.reject(signError);
        }
      }

      return Promise.reject(error);
    }
  );

  console.log("✅ x402 client created with custom 402 handler");
  return baseClient;
}

/**
 * Simple wrapper class for chunk operations
 *
 * Uses x402-axios when private key is available (server-side),
 * Falls back to custom 402 handler for browser wallets (client-side)
 */
export class X402ChunkClient {
  private client: AxiosInstance | null = null;
  private wallet: WalletAdapter;
  private baseURL: string;
  private sessionPdaCache: Map<string, string> = new Map();
  private privateKeyBase58?: string;

  constructor(
    baseURL: string,
    wallet: WalletAdapter,
    privateKeyBase58?: string
  ) {
    this.baseURL = baseURL;
    this.wallet = wallet;
    this.privateKeyBase58 = privateKeyBase58;
  }

  /**
   * Initialize the x402 client (must be called before use)
   */
  async initialize(): Promise<void> {
    this.client = await createX402ChunkClient(
      this.baseURL,
      this.wallet,
      this.privateKeyBase58
    );
  }

  /**
   * Fetch a video chunk with automatic x402 payment
   *
   * The x402-axios interceptor will:
   * - Make the request
   * - If 402 received, create payment proof
   * - Sign it with wallet
   * - Retry with payment proof
   * - Return successful response
   */
  async fetchChunk(videoId: string, segmentIndex: number): Promise<any> {
    if (!this.client) {
      throw new Error("Client not initialized. Call initialize() first.");
    }

    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const segment = `chunk-${segmentIndex}`;
    const sessionPda = this.sessionPdaCache.get(videoId) || "pending";

    // Make the request - x402-axios handles payment automatically!
    const response = await this.client.post("/api/x402/track-chunk", {
      videoId,
      segment,
      sessionPda,
      viewerPubkey: this.wallet.publicKey.toBase58(),
      timestamp: Date.now(),
    });

    return response.data;
  }

  /**
   * Fetch chunk by URL (for HLS compatibility)
   */
  async fetchChunkByUrl(
    chunkUrl: string,
    videoId: string,
    segmentIndex: number
  ): Promise<ArrayBuffer> {
    // Track the chunk first (with automatic payment)
    await this.fetchChunk(videoId, segmentIndex);

    // Then fetch actual chunk data
    const response = await axios.get(chunkUrl, {
      responseType: "arraybuffer",
    });

    return response.data;
  }

  /**
   * Cache session PDA after approval
   */
  cacheSessionPda(videoId: string, sessionPda: string): void {
    this.sessionPdaCache.set(videoId, sessionPda);
  }

  /**
   * Get unsettled chunk count
   */
  async getUnsettledCount(videoId: string): Promise<number> {
    if (!this.client || !this.wallet.publicKey) {
      return 0;
    }

    const response = await this.client.get(`/api/x402/unsettled/${videoId}`, {
      params: { viewerPubkey: this.wallet.publicKey.toBase58() },
    });

    return response.data.unsettledChunks || 0;
  }

  /**
   * Get settlement preview
   */
  async getSettlementPreview(videoId: string): Promise<any> {
    if (!this.client || !this.wallet.publicKey) {
      throw new Error("Client not initialized or wallet not connected");
    }

    const sessionPda = this.sessionPdaCache.get(videoId) || "placeholder";

    const response = await this.client.get(`/api/x402/preview/${sessionPda}`, {
      params: {
        videoId,
        viewerPubkey: this.wallet.publicKey.toBase58(),
      },
    });

    return response.data.preview;
  }

  /**
   * Update wallet (when user switches wallets)
   */
  async updateWallet(wallet: WalletAdapter): Promise<void> {
    this.wallet = wallet;
    this.client = await createX402ChunkClient(
      this.baseURL,
      wallet,
      this.privateKeyBase58
    );
  }
}

/**
 * Singleton instance
 */
let x402Instance: X402ChunkClient | null = null;

/**
 * Get or create x402 client instance
 */
export async function getX402ChunkClient(
  baseURL: string,
  wallet: WalletAdapter,
  privateKeyBase58?: string
): Promise<X402ChunkClient> {
  if (!x402Instance || x402Instance["wallet"] !== wallet) {
    x402Instance = new X402ChunkClient(baseURL, wallet, privateKeyBase58);
    await x402Instance.initialize();
  }

  return x402Instance;
}

export default X402ChunkClient;
