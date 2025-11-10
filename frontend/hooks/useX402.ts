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
 * Hook to use x402 client with automatic viewer setup
 *
 * @param viewerPublicKey - User's wallet public key
 * @returns x402 client instance and helper methods
 */
export function useX402(
  viewerPublicKey?: PublicKey | string | null
): UseX402Return {
  // Create/get x402 client instance
  const client = useMemo(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    return getX402Client(apiUrl, viewerPublicKey || undefined);
  }, []);

  // Update viewer when wallet changes
  useEffect(() => {
    if (viewerPublicKey) {
      client.setViewer(viewerPublicKey);
    }
  }, [viewerPublicKey, client]);

  // Clean up on unmount (if wallet disconnects)
  useEffect(() => {
    return () => {
      if (!viewerPublicKey) {
        resetX402Client();
      }
    };
  }, [viewerPublicKey]);

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
    isReady: !!viewerPublicKey,
    fetchChunk,
    fetchChunkByUrl,
    getUnsettledCount,
    getSettlementPreview,
    cacheSessionPda,
  };
}

export default useX402;
