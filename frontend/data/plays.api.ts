// Plays API Service
import apiClient from "./api-client";
import type {
  Play,
  RecordPlayRequest,
  UpdatePlayProgressRequest,
  PlayAnalytics,
  CreatorAnalytics,
  PlaysResponse,
  PaginationParams,
  GetCreatorAnalyticsParams,
} from "./types";

/**
 * Record a video play
 */
export const recordPlay = async (data: RecordPlayRequest): Promise<Play> => {
  const response = await apiClient.post<Play>("/api/plays", data);
  return response.data;
};

/**
 * Update play progress
 */
export const updatePlayProgress = async (
  id: string,
  data: UpdatePlayProgressRequest
): Promise<Play> => {
  const response = await apiClient.put<Play>(`/api/plays/${id}/progress`, data);
  return response.data;
};

/**
 * Get user's watch history
 */
export const getWatchHistory = async (
  pubkey: string,
  params?: PaginationParams
): Promise<PlaysResponse> => {
  const response = await apiClient.get<PlaysResponse>(
    `/api/plays/history/${pubkey}`,
    { params }
  );
  return response.data;
};

/**
 * Get videos to continue watching
 */
export const getContinueWatching = async (
  pubkey: string,
  limit?: number
): Promise<Play[]> => {
  const response = await apiClient.get<Play[]>(
    `/api/plays/continue/${pubkey}`,
    { params: { limit } }
  );
  return response.data;
};

/**
 * Get video analytics
 */
export const getVideoAnalytics = async (
  videoId: string
): Promise<PlayAnalytics> => {
  const response = await apiClient.get<PlayAnalytics>(
    `/api/plays/analytics/video/${videoId}`
  );
  return response.data;
};

/**
 * Get creator analytics
 */
export const getCreatorAnalytics = async (
  pubkey: string,
  params?: GetCreatorAnalyticsParams
): Promise<CreatorAnalytics> => {
  const response = await apiClient.get<CreatorAnalytics>(
    `/api/plays/analytics/creator/${pubkey}`,
    { params }
  );
  return response.data;
};

// Export all functions
const playsApi = {
  recordPlay,
  updatePlayProgress,
  getWatchHistory,
  getContinueWatching,
  getVideoAnalytics,
  getCreatorAnalytics,
};

export default playsApi;
