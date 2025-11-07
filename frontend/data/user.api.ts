// User API Service

import apiClient from "./api-client";
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  Video,
} from "./types";

/**
 * Create or get user profile
 */
export const createOrGetUser = async (
  data: CreateUserRequest
): Promise<User> => {
  const response = await apiClient.post<User>("/api/users/profile", data);
  return response.data;
};

/**
 * Get user profile by public key
 */
export const getUserProfile = async (pubkey: string): Promise<User> => {
  const response = await apiClient.get<User>(`/api/users/${pubkey}`);
  return response.data;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  pubkey: string,
  data: UpdateUserRequest
): Promise<User> => {
  const response = await apiClient.put<User>(`/api/users/${pubkey}`, data);
  return response.data;
};

/**
 * Get videos created by a user
 */
export const getUserVideos = async (pubkey: string): Promise<Video[]> => {
  const response = await apiClient.get<Video[]>(`/api/users/${pubkey}/videos`);
  return response.data;
};

// Export all functions
const userApi = {
  createOrGetUser,
  getUserProfile,
  updateUserProfile,
  getUserVideos,
};

export default userApi;
