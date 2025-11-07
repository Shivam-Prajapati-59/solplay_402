// =============================================================================
// Transactions API Service
// =============================================================================
// Functions to interact with payment and revenue endpoints
// =============================================================================

import apiClient from "./api-client";
import type {
  Transaction,
  CreateTransactionRequest,
  FailTransactionRequest,
  GetUserPurchasesParams,
  GetCreatorEarningsParams,
  CheckPurchaseParams,
  CheckPurchaseResponse,
  TransactionsResponse,
  EarningsResponse,
  VideoRevenueResponse,
  PaginationParams,
} from "./types";

/**
 * Create a new transaction
 */
export const createTransaction = async (
  data: CreateTransactionRequest
): Promise<Transaction> => {
  const response = await apiClient.post<Transaction>("/api/transactions", data);
  return response.data;
};

/**
 * Confirm a transaction
 */
export const confirmTransaction = async (id: string): Promise<Transaction> => {
  const response = await apiClient.put<Transaction>(
    `/api/transactions/${id}/confirm`
  );
  return response.data;
};

/**
 * Mark transaction as failed
 */
export const failTransaction = async (
  id: string,
  data?: FailTransactionRequest
): Promise<Transaction> => {
  const response = await apiClient.put<Transaction>(
    `/api/transactions/${id}/fail`,
    data
  );
  return response.data;
};

/**
 * Get transaction by ID
 */
export const getTransactionById = async (id: string): Promise<Transaction> => {
  const response = await apiClient.get<Transaction>(`/api/transactions/${id}`);
  return response.data;
};

/**
 * Get user's purchase history
 */
export const getUserPurchases = async (
  pubkey: string,
  params?: GetUserPurchasesParams
): Promise<TransactionsResponse> => {
  const response = await apiClient.get<TransactionsResponse>(
    `/api/transactions/purchases/${pubkey}`,
    { params }
  );
  return response.data;
};

/**
 * Get creator's earnings
 */
export const getCreatorEarnings = async (
  pubkey: string,
  params?: GetCreatorEarningsParams
): Promise<EarningsResponse> => {
  const response = await apiClient.get<EarningsResponse>(
    `/api/transactions/earnings/${pubkey}`,
    { params }
  );
  return response.data;
};

/**
 * Get video revenue
 */
export const getVideoRevenue = async (
  videoId: string
): Promise<VideoRevenueResponse> => {
  const response = await apiClient.get<VideoRevenueResponse>(
    `/api/transactions/revenue/${videoId}`
  );
  return response.data;
};

/**
 * Check if user purchased a video
 */
export const checkVideoPurchase = async (
  params: CheckPurchaseParams
): Promise<CheckPurchaseResponse> => {
  const response = await apiClient.get<CheckPurchaseResponse>(
    "/api/transactions/check-purchase",
    { params }
  );
  return response.data;
};

// Export all functions
const transactionsApi = {
  createTransaction,
  confirmTransaction,
  failTransaction,
  getTransactionById,
  getUserPurchases,
  getCreatorEarnings,
  getVideoRevenue,
  checkVideoPurchase,
};

export default transactionsApi;
