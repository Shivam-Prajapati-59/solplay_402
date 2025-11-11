// =============================================================================
// Analytics Controller
// =============================================================================
// Provides analytics data for creator and viewer dashboards
// =============================================================================

import { Request, Response } from "express";
import { db } from "../db";
import { videos, settlements, blockchainSessions } from "../db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

/**
 * Get analytics for a creator
 * GET /api/analytics/creator/:creatorPubkey
 */
export const getCreatorAnalytics = async (req: Request, res: Response) => {
  try {
    const { creatorPubkey } = req.params;
    const { timeRange = "30d" } = req.query;

    // Calculate date filter
    const days = timeRange === "7d" ? 7 : timeRange === "90d" ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get creator's videos
    const creatorVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.creatorPubkey, creatorPubkey))
      .orderBy(desc(videos.createdAt));

    const videoIds = creatorVideos.map((v) => v.id);

    if (videoIds.length === 0) {
      return res.json({
        totalRevenue: 0,
        totalViews: 0,
        totalSettlements: 0,
        engagementRate: 0,
        recentVideos: [],
        topPerformers: [],
        period: timeRange,
      });
    }

    // Get all settlements for this creator in time range
    const creatorSettlements = await db
      .select()
      .from(settlements)
      .where(
        and(
          eq(settlements.creatorPubkey, creatorPubkey),
          gte(settlements.createdAt, since)
        )
      )
      .orderBy(desc(settlements.createdAt));

    // Calculate totals
    const totalRevenue = creatorSettlements.reduce(
      (sum, s) => sum + Number(s.creatorAmount),
      0
    );
    const totalChunks = creatorSettlements.reduce(
      (sum, s) => sum + s.chunkCount,
      0
    );
    const totalSettlements = creatorSettlements.length;

    // Get unique viewers
    const uniqueViewers = new Set(creatorSettlements.map((s) => s.viewerPubkey))
      .size;

    // Get video stats
    const videoStats = await Promise.all(
      creatorVideos.map(async (video) => {
        const videoSettlements = creatorSettlements.filter(
          (s) => s.videoId === video.id
        );
        const revenue = videoSettlements.reduce(
          (sum, s) => sum + Number(s.creatorAmount),
          0
        );
        const views = videoSettlements.reduce(
          (sum, s) => sum + s.chunkCount,
          0
        );
        const viewers = new Set(videoSettlements.map((s) => s.viewerPubkey))
          .size;

        return {
          id: video.id,
          title: video.title,
          thumbnail: video.thumbnailUrl || "🎬",
          revenue: (revenue / 1_000_000).toFixed(4), // Convert microlamports to SOL
          views,
          viewers,
          duration: video.duration || "0:00",
          uploadDate: video.createdAt,
          status: video.status || "published",
          change: "+0%", // TODO: Calculate change from previous period
        };
      })
    );

    // Sort by revenue for top performers
    const topPerformers = [...videoStats]
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
      .slice(0, 5)
      .map((v, idx) => ({
        rank: idx + 1,
        title: v.title,
        views: v.views,
        revenue: v.revenue,
        change: v.change,
        progress: Math.min(100, (v.views / 1000) * 100), // Progress bar based on 1000 views
      }));

    // Recent uploads (last 10)
    const recentVideos = videoStats.slice(0, 10).map((v) => ({
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnail,
      views: v.views,
      likes: 0, // TODO: Add likes feature
      duration: v.duration,
      uploadDate: formatRelativeTime(v.uploadDate),
      status: v.status,
      revenue: parseFloat(v.revenue),
    }));

    // Calculate engagement rate (settlements per 100 views)
    const engagementRate =
      totalChunks > 0 ? ((totalSettlements / totalChunks) * 100).toFixed(1) : 0;

    // Calculate revenue change (mock for now)
    const revenueChange = "+12.5%"; // TODO: Calculate actual change

    res.json({
      success: true,
      stats: {
        totalRevenue: (totalRevenue / 1_000_000).toFixed(4), // Convert to SOL
        totalRevenueFormatted: `${(totalRevenue / 1_000_000).toFixed(4)} SOL`,
        totalViews: totalChunks,
        totalViewsFormatted: formatNumber(totalChunks),
        totalSubscribers: uniqueViewers,
        totalSubscribersFormatted: formatNumber(uniqueViewers),
        engagementRate: `${engagementRate}%`,
        revenueChange,
        viewsChange: "+8.3%", // TODO: Calculate actual change
        subscribersChange: "+5.7%", // TODO: Calculate actual change
        engagementChange: "+2.1%", // TODO: Calculate actual change
      },
      recentVideos,
      topPerformers,
      period: timeRange,
    });
  } catch (error: any) {
    console.error("Get creator analytics error:", error);
    res.status(500).json({
      error: "Failed to get analytics",
      details: error.message,
    });
  }
};

/**
 * Get analytics for a specific video
 * GET /api/analytics/video/:videoId
 */
export const getVideoAnalytics = async (req: Request, res: Response) => {
  try {
    const videoId = parseInt(req.params.videoId);
    const { timeRange = "30d" } = req.query;

    // Calculate date filter
    const days = timeRange === "7d" ? 7 : timeRange === "90d" ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get video
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (video.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Get settlements for this video
    const videoSettlements = await db
      .select()
      .from(settlements)
      .where(
        and(eq(settlements.videoId, videoId), gte(settlements.createdAt, since))
      )
      .orderBy(desc(settlements.createdAt));

    // Calculate stats
    const totalRevenue = videoSettlements.reduce(
      (sum, s) => sum + Number(s.creatorAmount),
      0
    );
    const totalChunks = videoSettlements.reduce(
      (sum, s) => sum + s.chunkCount,
      0
    );
    const uniqueViewers = new Set(videoSettlements.map((s) => s.viewerPubkey))
      .size;

    res.json({
      success: true,
      video: video[0],
      stats: {
        totalRevenue: (totalRevenue / 1_000_000).toFixed(4),
        totalViews: totalChunks,
        uniqueViewers,
        settlements: videoSettlements.length,
      },
      recentSettlements: videoSettlements.slice(0, 10).map((s) => ({
        id: s.id,
        viewerPubkey: `${s.viewerPubkey.substring(
          0,
          8
        )}...${s.viewerPubkey.substring(s.viewerPubkey.length - 4)}`,
        chunkCount: s.chunkCount,
        amount: (Number(s.creatorAmount) / 1_000_000).toFixed(4),
        date: s.createdAt,
        transactionSignature: s.transactionSignature,
      })),
      period: timeRange,
    });
  } catch (error: any) {
    console.error("Get video analytics error:", error);
    res.status(500).json({
      error: "Failed to get video analytics",
      details: error.message,
    });
  }
};

/**
 * Get analytics for a viewer
 * GET /api/analytics/viewer/:viewerPubkey
 */
export const getViewerAnalytics = async (req: Request, res: Response) => {
  try {
    const { viewerPubkey } = req.params;
    const { timeRange = "30d" } = req.query;

    // Calculate date filter
    const days = timeRange === "7d" ? 7 : timeRange === "90d" ? 90 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get viewer's settlements
    const viewerSettlements = await db
      .select()
      .from(settlements)
      .where(
        and(
          eq(settlements.viewerPubkey, viewerPubkey),
          gte(settlements.createdAt, since)
        )
      )
      .orderBy(desc(settlements.createdAt));

    // Calculate totals
    const totalSpent = viewerSettlements.reduce(
      (sum, s) => sum + Number(s.totalPayment),
      0
    );
    const totalChunksWatched = viewerSettlements.reduce(
      (sum, s) => sum + s.chunkCount,
      0
    );
    const uniqueVideos = new Set(viewerSettlements.map((s) => s.videoId)).size;

    res.json({
      success: true,
      stats: {
        totalSpent: (totalSpent / 1_000_000).toFixed(4),
        totalChunksWatched,
        uniqueVideos,
        settlements: viewerSettlements.length,
      },
      recentSettlements: viewerSettlements.slice(0, 10),
      period: timeRange,
    });
  } catch (error: any) {
    console.error("Get viewer analytics error:", error);
    res.status(500).json({
      error: "Failed to get viewer analytics",
      details: error.message,
    });
  }
};

// Helper function to format relative time
function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  return `${Math.floor(seconds / 2592000)} months ago`;
}

// Helper function to format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default {
  getCreatorAnalytics,
  getVideoAnalytics,
  getViewerAnalytics,
};
