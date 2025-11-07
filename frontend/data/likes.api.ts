// =============================================================================
// Likes API Service
// =============================================================================

import apiClient from "./api-client";
import type {
  Like,
  LikeVideoRequest,
  UnlikeVideoRequest,
  CheckLikedParams,
  CheckLikedResponse,
  LikesResponse,
  PaginationParams,
} from "./types";

/**
 * Like a video
 */
export const likeVideo = async (data: LikeVideoRequest): Promise<Like> => {
  const response = await apiClient.post<Like>("/api/likes", data);
  return response.data;
};

/**
 * Unlike a video
 */
export const unlikeVideo = async (
  data: UnlikeVideoRequest
): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>("/api/likes", {
    data,
  });
  return response.data;
};

/**
 * Get all likes for a video
 */
export const getVideoLikes = async (
  videoId: string,
  params?: PaginationParams
): Promise<LikesResponse> => {
  const response = await apiClient.get<LikesResponse>(
    `/api/likes/video/${videoId}`,
    { params }
  );
  return response.data;
};

/**
 * Get all videos liked by a user
 */
export const getUserLikedVideos = async (
  pubkey: string,
  params?: PaginationParams
): Promise<LikesResponse> => {
  const response = await apiClient.get<LikesResponse>(
    `/api/likes/user/${pubkey}`,
    { params }
  );
  return response.data;
};

/**
 * Check if user liked a video
 */
export const checkIfLiked = async (
  params: CheckLikedParams
): Promise<CheckLikedResponse> => {
  const response = await apiClient.get<CheckLikedResponse>("/api/likes/check", {
    params,
  });
  return response.data;
};

// Export all functions
const likesApi = {
  likeVideo,
  unlikeVideo,
  getVideoLikes,
  getUserLikedVideos,
  checkIfLiked,
};

export default likesApi;
