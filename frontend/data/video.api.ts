// Video API Service

import apiClient from "./api-client";
import type {
  Video,
  CreateVideoRequest,
  UpdateVideoRequest,
  GetVideosParams,
  SearchVideosParams,
  GetTrendingParams,
  VideosResponse,
} from "./types";

/**
 * Create a new video
 */
export const createVideo = async (data: CreateVideoRequest): Promise<Video> => {
  const response = await apiClient.post<Video>("/api/videos", data);
  return response.data;
};

/**
 * Get video by ID
 */
export const getVideoById = async (id: string): Promise<Video> => {
  const response = await apiClient.get<{
    success: boolean;
    video: any;
    isLiked: boolean;
  }>(`/api/videos/${id}`);
  // Backend returns { success, video: {...}, isLiked }
  // We need to extract the video object
  return response.data.video;
};

/**
 * Update video
 */
export const updateVideo = async (
  id: string,
  data: UpdateVideoRequest
): Promise<Video> => {
  const response = await apiClient.put<Video>(`/api/videos/${id}`, data);
  return response.data;
};

/**
 * Delete video
 */
export const deleteVideo = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(
    `/api/videos/${id}`
  );
  return response.data;
};

/**
 * Get all videos (paginated)
 */
export const getAllVideos = async (
  params?: GetVideosParams
): Promise<VideosResponse> => {
  const response = await apiClient.get<VideosResponse>("/api/videos", {
    params,
  });
  return response.data;
};

/**
 * Get videos by category
 */
export const getVideosByCategory = async (
  category: string,
  params?: GetVideosParams
): Promise<VideosResponse> => {
  const response = await apiClient.get<VideosResponse>(
    `/api/videos/category/${category}`,
    { params }
  );
  return response.data;
};

/**
 * Search videos
 */
export const searchVideos = async (
  params: SearchVideosParams
): Promise<VideosResponse> => {
  const response = await apiClient.get<VideosResponse>("/api/videos/search", {
    params,
  });
  return response.data;
};

/**
 * Get trending videos
 */
export const getTrendingVideos = async (
  params?: GetTrendingParams
): Promise<Video[]> => {
  const response = await apiClient.get<Video[]>("/api/videos/trending", {
    params,
  });
  return response.data;
};

/**
 * Increment view count
 */
export const incrementViewCount = async (
  id: string
): Promise<{ viewCount: number }> => {
  const response = await apiClient.post<{ viewCount: number }>(
    `/api/videos/${id}/view`
  );
  return response.data;
};

/**
 * Get video stream URL (for HLS)
 */
export const getVideoStreamUrl = (
  videoId: string,
  fileName: string
): string => {
  return `${apiClient.defaults.baseURL}/api/videos/${videoId}/stream/${fileName}`;
};

// Export all functions
const videoApi = {
  createVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  getAllVideos,
  getVideosByCategory,
  searchVideos,
  getTrendingVideos,
  incrementViewCount,
  getVideoStreamUrl,
};

export default videoApi;
