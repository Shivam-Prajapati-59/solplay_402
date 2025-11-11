// =============================================================================
// Analytics API Client
// =============================================================================
// API functions for fetching creator and viewer analytics
// =============================================================================

import { apiClient } from "./api-client";

export interface CreatorStats {
  totalRevenue: string;
  totalRevenueFormatted: string;
  totalViews: number;
  totalViewsFormatted: string;
  totalSubscribers: number;
  totalSubscribersFormatted: string;
  engagementRate: string;
  revenueChange: string;
  viewsChange: string;
  subscribersChange: string;
  engagementChange: string;
}

export interface VideoPerformance {
  id: number;
  title: string;
  thumbnail: string;
  views: number;
  viewers: number;
  revenue: string;
  duration: string;
  uploadDate: string | Date;
  status: string;
  change: string;
}

export interface TopPerformer {
  rank: number;
  title: string;
  views: number;
  revenue: string;
  change: string;
  progress: number;
}

export interface CreatorAnalyticsResponse {
  success: boolean;
  stats: CreatorStats;
  recentVideos: VideoPerformance[];
  topPerformers: TopPerformer[];
  period: string;
}

export interface VideoAnalyticsResponse {
  success: boolean;
  video: any;
  stats: {
    totalRevenue: string;
    totalViews: number;
    uniqueViewers: number;
    settlements: number;
  };
  recentSettlements: any[];
  period: string;
}

export interface ViewerAnalyticsResponse {
  success: boolean;
  stats: {
    totalSpent: string;
    totalChunksWatched: number;
    uniqueVideos: number;
    settlements: number;
  };
  recentSettlements: any[];
  period: string;
}

/**
 * Get creator analytics
 */
export async function getCreatorAnalytics(
  creatorPubkey: string,
  timeRange: "7d" | "30d" | "90d" = "30d"
): Promise<CreatorAnalyticsResponse> {
  const response = await apiClient.get(
    `/api/analytics/creator/${creatorPubkey}`,
    {
      params: { timeRange },
    }
  );
  return response.data;
}

/**
 * Get video analytics
 */
export async function getVideoAnalytics(
  videoId: number,
  timeRange: "7d" | "30d" | "90d" = "30d"
): Promise<VideoAnalyticsResponse> {
  const response = await apiClient.get(`/api/analytics/video/${videoId}`, {
    params: { timeRange },
  });
  return response.data;
}

/**
 * Get viewer analytics
 */
export async function getViewerAnalytics(
  viewerPubkey: string,
  timeRange: "7d" | "30d" | "90d" = "30d"
): Promise<ViewerAnalyticsResponse> {
  const response = await apiClient.get(
    `/api/analytics/viewer/${viewerPubkey}`,
    {
      params: { timeRange },
    }
  );
  return response.data;
}

export const analyticsAPI = {
  getCreatorAnalytics,
  getVideoAnalytics,
  getViewerAnalytics,
};

export default analyticsAPI;
