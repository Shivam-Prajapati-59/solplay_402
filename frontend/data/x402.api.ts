// =============================================================================
// x402 Payment & Settlement API Client
// =============================================================================
// API functions for x402 chunk tracking and batch settlement
// =============================================================================

import { apiClient } from "./api-client";

export interface ChunkViewData {
  videoId: string;
  segment: string;
  paymentProof: string;
  viewerPubkey?: string;
}

export interface SettlementStats {
  unsettledChunks: number;
  settledChunks: number;
  totalViews: number;
  estimatedSettlementValue: number;
}

export interface SettlementPreview {
  totalPayment: number;
  platformFee: number;
  creatorAmount: number;
  chunksRemaining: number;
  unsettledChunks?: number; // Added for frontend convenience
  pricePerChunk?: number; // Added for frontend convenience
}

export interface SettlementRequest {
  sessionPda: string;
  videoId: string;
  viewerPubkey?: string;
  viewerPrivateKey?: number[]; // Only for testing - use wallet in production
}

export interface SettlementResult {
  success: boolean;
  message?: string;
  chunksSettled?: number;
  transactionSignature?: string;
  preview?: SettlementPreview;
  unsettledChunks?: number;
}

/**
 * Track a chunk view after successful x402 payment
 */
export async function trackChunkView(data: ChunkViewData) {
  const response = await apiClient.post("/api/x402/track-chunk", data);
  return response.data;
}

/**
 * Get settlement stats for a viewer-video pair
 */
export async function getSettlementStats(
  videoId: string,
  viewerPubkey?: string
): Promise<{ success: boolean; stats: SettlementStats }> {
  const params = viewerPubkey ? { viewerPubkey } : {};
  const response = await apiClient.get(`/api/x402/stats/${videoId}`, {
    params,
  });
  return response.data;
}

/**
 * Get unsettled chunk count
 */
export async function getUnsettledChunkCount(
  videoId: string,
  viewerPubkey?: string
): Promise<{ success: boolean; unsettledChunks: number }> {
  const params = viewerPubkey ? { viewerPubkey } : {};
  const response = await apiClient.get(`/api/x402/unsettled/${videoId}`, {
    params,
  });
  return response.data;
}

/**
 * Get settlement preview (calculate amounts before executing)
 */
export async function getSettlementPreview(
  sessionPda: string,
  options?: { chunkCount?: number; videoId?: string; viewerPubkey?: string }
): Promise<{
  success: boolean;
  preview: SettlementPreview;
  chunkCount: number;
}> {
  const params: any = {};
  if (options?.chunkCount) params.chunkCount = options.chunkCount;
  if (options?.videoId) params.videoId = options.videoId;
  if (options?.viewerPubkey) params.viewerPubkey = options.viewerPubkey;

  const response = await apiClient.get(`/api/x402/preview/${sessionPda}`, {
    params,
  });
  return response.data;
}

/**
 * Trigger settlement on blockchain
 * NOTE: In production, this should be called from frontend with wallet signature
 */
export async function triggerSettlement(
  data: SettlementRequest
): Promise<SettlementResult> {
  const response = await apiClient.post("/api/x402/settle", data);
  return response.data;
}

export const x402API = {
  trackChunkView,
  getSettlementStats,
  getUnsettledChunkCount,
  getSettlementPreview,
  triggerSettlement,
};

export default x402API;
