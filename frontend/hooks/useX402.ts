/**
 * React Hook for x402 Payments with Delegate Approval
 *
 * This hook provides easy access to x402 payment functionality
 * using the delegate-based approval system.
 *
 * Usage:
 * ```tsx
 * function VideoPlayer({ videoId }) {
 *   const { publicKey } = useWallet();
 *   const {
 *     fetchChunk,
 *     getUnsettledCount,
 *     isReady
 *   } = useX402(publicKey);
 *
 *   // Fetch chunks as video plays
 *   const handleSegmentLoad = async (segmentIndex: number) => {
 *     await fetchChunk(videoId, segmentIndex);
 *   };
 *
 *   return <video ... />;
 * }
 * ```
 */

import { useEffect, useMemo, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { getX402Client, resetX402Client, X402Client } from "@/lib/x402-client";
import { useWallet } from "@solana/wallet-adapter-react";

interface UseX402Return {
  client: X402Client;
  isReady: boolean;
  fetchChunk: (videoId: string, segmentIndex: number) => Promise<any>;
  fetchChunkByUrl: (
    chunkUrl: string,
    videoId: string,
    segmentIndex: number
  ) => Promise<ArrayBuffer>;
  getUnsettledCount: (videoId: string) => Promise<number>;
  getSettlementPreview: (
    videoId: string,
    sessionPda?: string
  ) => Promise<{
    totalPayment: number;
    platformFee: number;
    creatorAmount: number;
    chunksRemaining: number;
  }>;
  cacheSessionPda: (videoId: string, sessionPda: string) => void;
}

/**
 * Hook to use x402 client with automatic viewer setup and wallet signing
 *
 * @param viewerPublicKey - User's wallet public key (optional if using wallet hook)
 * @returns x402 client instance and helper methods
 */
export function useX402(
  viewerPublicKey?: PublicKey | string | null
): UseX402Return {
  // Get wallet from context for signing capabilities
  const wallet = useWallet();

  // Use wallet publicKey if viewerPublicKey not provided
  const effectivePublicKey = viewerPublicKey || wallet.publicKey;

  // Create wallet signer object if wallet supports signing
  const walletSigner = useMemo(() => {
    if (wallet.publicKey && wallet.signMessage) {
      return {
        publicKey: wallet.publicKey,
        signMessage: wallet.signMessage,
        signTransaction: wallet.signTransaction,
      };
    }
    return undefined;
  }, [wallet.publicKey, wallet.signMessage, wallet.signTransaction]);

  // Create/get x402 client instance
  const client = useMemo(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    return getX402Client(apiUrl, effectivePublicKey || undefined, walletSigner);
  }, [effectivePublicKey, walletSigner]);

  // Update viewer when wallet changes
  useEffect(() => {
    if (effectivePublicKey) {
      client.setViewer(effectivePublicKey);
    }
    if (walletSigner) {
      client.setWallet(walletSigner);
    }
  }, [effectivePublicKey, walletSigner, client]);

  // Clean up on unmount (if wallet disconnects)
  useEffect(() => {
    return () => {
      if (!effectivePublicKey) {
        resetX402Client();
      }
    };
  }, [effectivePublicKey]);

  // Memoized helper methods
  const fetchChunk = useCallback(
    async (videoId: string, segmentIndex: number) => {
      return client.fetchChunk(videoId, segmentIndex);
    },
    [client]
  );

  const fetchChunkByUrl = useCallback(
    async (chunkUrl: string, videoId: string, segmentIndex: number) => {
      return client.fetchChunkByUrl(chunkUrl, videoId, segmentIndex);
    },
    [client]
  );

  const getUnsettledCount = useCallback(
    async (videoId: string) => {
      return client.getUnsettledCount(videoId);
    },
    [client]
  );

  const getSettlementPreview = useCallback(
    async (videoId: string, sessionPda?: string) => {
      return client.getSettlementPreview(videoId, sessionPda);
    },
    [client]
  );

  const cacheSessionPda = useCallback(
    (videoId: string, sessionPda: string) => {
      client.cacheSessionPda(videoId, sessionPda);
    },
    [client]
  );

  return {
    client,
    isReady: !!effectivePublicKey,
    fetchChunk,
    fetchChunkByUrl,
    getUnsettledCount,
    getSettlementPreview,
    cacheSessionPda,
  };
}

export default useX402;
