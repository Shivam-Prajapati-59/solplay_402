// =============================================================================
// Main API Export
// =============================================================================
// Single entry point for all API services
// =============================================================================

// Export API client
export { default as apiClient } from "./api-client";

// Export all types
export * from "./types";

// Export individual API services
export { default as userApi } from "./user.api";
export { default as videoApi } from "./video.api";
export { default as likesApi } from "./likes.api";
export { default as commentsApi } from "./comments.api";
export { default as playsApi } from "./plays.api";
export { default as transactionsApi } from "./transactions.api";

// Export individual functions for convenience
export {
  createOrGetUser,
  getUserProfile,
  updateUserProfile,
  getUserVideos,
} from "./user.api";

export {
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
} from "./video.api";

export {
  likeVideo,
  unlikeVideo,
  getVideoLikes,
  getUserLikedVideos,
  checkIfLiked,
} from "./likes.api";

export {
  addComment,
  updateComment,
  deleteComment,
  getVideoComments,
  getUserComments,
} from "./comments.api";

export {
  recordPlay,
  updatePlayProgress,
  getWatchHistory,
  getContinueWatching,
  getVideoAnalytics,
  getCreatorAnalytics,
} from "./plays.api";

export {
  createTransaction,
  confirmTransaction,
  failTransaction,
  getTransactionById,
  getUserPurchases,
  getCreatorEarnings,
  getVideoRevenue,
  checkVideoPurchase,
} from "./transactions.api";
