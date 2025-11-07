// Comments API Service

import apiClient from "./api-client";
import type {
  Comment,
  AddCommentRequest,
  UpdateCommentRequest,
  CommentsResponse,
  PaginationParams,
} from "./types";

/**
 * Add a comment or reply
 */
export const addComment = async (data: AddCommentRequest): Promise<Comment> => {
  const response = await apiClient.post<Comment>("/api/comments", data);
  return response.data;
};

/**
 * Update a comment
 */
export const updateComment = async (
  id: string,
  data: UpdateCommentRequest
): Promise<Comment> => {
  const response = await apiClient.put<Comment>(`/api/comments/${id}`, data);
  return response.data;
};

/**
 * Delete a comment
 */
export const deleteComment = async (
  id: string
): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(
    `/api/comments/${id}`
  );
  return response.data;
};

/**
 * Get all comments for a video (with nested replies)
 */
export const getVideoComments = async (
  videoId: string,
  params?: PaginationParams
): Promise<CommentsResponse> => {
  const response = await apiClient.get<CommentsResponse>(
    `/api/comments/video/${videoId}`,
    { params }
  );
  return response.data;
};

/**
 * Get all comments by a user
 */
export const getUserComments = async (
  pubkey: string,
  params?: PaginationParams
): Promise<CommentsResponse> => {
  const response = await apiClient.get<CommentsResponse>(
    `/api/comments/user/${pubkey}`,
    { params }
  );
  return response.data;
};

// Export all functions
const commentsApi = {
  addComment,
  updateComment,
  deleteComment,
  getVideoComments,
  getUserComments,
};

export default commentsApi;
