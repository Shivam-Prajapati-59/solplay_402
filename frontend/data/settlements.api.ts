// =============================================================================
// Settlements API Client
// =============================================================================
// API functions for querying settlement history and transparency
// =============================================================================

import { apiClient } from "./api-client";

export interface Settlement {
  id: number;
  sessionId: number;
  videoId: number;
  chunkCount: number;
  totalPayment: number;
  platformFee: number;
  creatorAmount: number;
  transactionSignature: string;
  blockTime: string | null;
  slot: number | null;
  viewerPubkey: string;
  creatorPubkey: string;
  chunksConsumedAfter: number;
  chunksRemaining: number;
  settlementTimestamp: string;
  createdAt: string;
}

export interface SettlementWithVideo {
  settlement: Settlement;
  video?: {
    id: number;
    title: string;
    thumbnailUrl: string;
  };
}

export interface SettlementStats {
  totalEarnings: number;
  totalChunks: number;
  averageSettlementSize: number;
}

/**
 * Get settlement history for a viewer
 */
export async function getViewerSettlements(
  viewerPubkey: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  success: boolean;
  settlements: SettlementWithVideo[];
  count: number;
}> {
  const params = {
    limit: options?.limit || 50,
    offset: options?.offset || 0,
  };
  const response = await apiClient.get(
    `/api/settlements/viewer/${viewerPubkey}`,
    { params }
  );
  return response.data;
}

/**
 * Get settlement history for a creator (with earnings)
 */
export async function getCreatorSettlements(
  creatorPubkey: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  success: boolean;
  settlements: SettlementWithVideo[];
  count: number;
  totalEarnings: number;
}> {
  const params = {
    limit: options?.limit || 50,
    offset: options?.offset || 0,
  };
  const response = await apiClient.get(
    `/api/settlements/creator/${creatorPubkey}`,
    { params }
  );
  return response.data;
}

/**
 * Get settlement history for a specific video
 */
export async function getVideoSettlements(
  videoId: number,
  options?: { limit?: number; offset?: number }
): Promise<{
  success: boolean;
  settlements: Settlement[];
  count: number;
  stats: SettlementStats;
}> {
  const params = {
    limit: options?.limit || 50,
    offset: options?.offset || 0,
  };
  const response = await apiClient.get(`/api/settlements/video/${videoId}`, {
    params,
  });
  return response.data;
}

/**
 * Get settlement details by transaction signature
 */
export async function getSettlementBySignature(signature: string): Promise<{
  success: boolean;
  settlement: {
    settlement: Settlement;
    session: any;
    video: any;
  };
}> {
  const response = await apiClient.get(`/api/settlements/tx/${signature}`);
  return response.data;
}

/**
 * Get all settlements for a session
 */
export async function getSessionSettlements(sessionId: number): Promise<{
  success: boolean;
  settlements: Settlement[];
  count: number;
  stats: {
    totalPaid: number;
    totalChunks: number;
    settlementCount: number;
  };
}> {
  const response = await apiClient.get(`/api/settlements/session/${sessionId}`);
  return response.data;
}

/**
 * Format settlement amount (convert from smallest unit to tokens)
 */
export function formatSettlementAmount(amount: number, decimals = 6): string {
  return (amount / Math.pow(10, decimals)).toFixed(decimals);
}

/**
 * Get Solana Explorer URL for transaction
 */
export function getSolanaExplorerUrl(
  signature: string,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "devnet"
): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export const settlementsAPI = {
  getViewerSettlements,
  getCreatorSettlements,
  getVideoSettlements,
  getSettlementBySignature,
  getSessionSettlements,
  formatSettlementAmount,
  getSolanaExplorerUrl,
};

export default settlementsAPI;
