// =============================================================================
// Plays/Analytics Controller
// =============================================================================
// Handles video play tracking and watch history
// =============================================================================

import { Request, Response } from "express";
import { db } from "../db";
import { plays, videos, users } from "../db/schema";
import { eq, desc, and, sql, gt } from "drizzle-orm";

// =============================================================================
// Play Tracking Operations
// =============================================================================

/**
 * Record a video play
 * POST /api/videos/:id/play
 */
export const recordPlay = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { viewerPubkey, watchDuration, completed, lastPosition } = req.body;

    if (!viewerPubkey) {
      return res.status(400).json({ error: "Viewer pubkey is required" });
    }

    // Check if video exists
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, Number(id)))
      .limit(1);

    if (video.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Record play
    const newPlay = await db
      .insert(plays)
      .values({
        videoId: Number(id),
        viewerPubkey,
        watchDuration: watchDuration || 0,
        completed: completed || false,
        lastPosition: lastPosition || 0,
      })
      .returning();

    // Increment view count
    await db
      .update(videos)
      .set({
        viewCount: sql`${videos.viewCount} + 1`,
      })
      .where(eq(videos.id, Number(id)));

    res.status(201).json({
      success: true,
      play: newPlay[0],
      message: "Play recorded successfully",
    });
  } catch (error: any) {
    console.error("Record play error:", error);
    res.status(500).json({
      error: "Failed to record play",
      details: error.message,
    });
  }
};

/**
 * Update play progress
 * PUT /api/plays/:id
 */
export const updatePlayProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { watchDuration, completed, lastPosition } = req.body;

    // Get play
    const play = await db
      .select()
      .from(plays)
      .where(eq(plays.id, Number(id)))
      .limit(1);

    if (play.length === 0) {
      return res.status(404).json({ error: "Play session not found" });
    }

    // Update play
    const updatedPlay = await db
      .update(plays)
      .set({
        watchDuration: watchDuration ?? play[0].watchDuration,
        completed: completed ?? play[0].completed,
        lastPosition: lastPosition ?? play[0].lastPosition,
      })
      .where(eq(plays.id, Number(id)))
      .returning();

    res.json({
      success: true,
      play: updatedPlay[0],
      message: "Play progress updated successfully",
    });
  } catch (error: any) {
    console.error("Update play progress error:", error);
    res.status(500).json({
      error: "Failed to update play progress",
      details: error.message,
    });
  }
};

/**
 * Get user's watch history
 * GET /api/users/:pubkey/history
 */
export const getWatchHistory = async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Get recent plays
    const userPlays = await db
      .select()
      .from(plays)
      .where(eq(plays.viewerPubkey, pubkey))
      .orderBy(desc(plays.playedAt))
      .limit(Number(limit))
      .offset(offset);

    // Get video info for each play
    const playsWithVideos = await Promise.all(
      userPlays.map(async (play) => {
        const video = await db
          .select()
          .from(videos)
          .where(eq(videos.id, play.videoId))
          .limit(1);

        // Get creator info
        let creator = null;
        if (video.length > 0) {
          const creatorData = await db
            .select({
              pubkey: users.pubkey,
              accountName: users.accountName,
            })
            .from(users)
            .where(eq(users.pubkey, video[0].creatorPubkey))
            .limit(1);
          creator = creatorData[0] || null;
        }

        return {
          ...play,
          video: video[0] || null,
          creator,
        };
      })
    );

    res.json({
      success: true,
      history: playsWithVideos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: userPlays.length,
      },
    });
  } catch (error: any) {
    console.error("Get watch history error:", error);
    res.status(500).json({
      error: "Failed to get watch history",
      details: error.message,
    });
  }
};

/**
 * Get video analytics
 * GET /api/videos/:id/analytics
 */
export const getVideoAnalytics = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get video
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, Number(id)))
      .limit(1);

    if (video.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Get all plays for the video
    const videoPlays = await db
      .select()
      .from(plays)
      .where(eq(plays.videoId, Number(id)));

    // Calculate analytics
    const totalViews = videoPlays.length;
    const uniqueViewers = new Set(videoPlays.map((p) => p.viewerPubkey)).size;
    const completedViews = videoPlays.filter((p) => p.completed).length;
    const totalWatchTime = videoPlays.reduce(
      (sum, p) => sum + p.watchDuration,
      0
    );
    const avgWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;
    const completionRate =
      totalViews > 0 ? (completedViews / totalViews) * 100 : 0;

    // Get watch time by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPlays = await db
      .select()
      .from(plays)
      .where(
        and(eq(plays.videoId, Number(id)), gt(plays.playedAt, thirtyDaysAgo))
      );

    // Group by date
    const viewsByDate: { [key: string]: number } = {};
    recentPlays.forEach((play) => {
      const date = play.playedAt.toISOString().split("T")[0];
      viewsByDate[date] = (viewsByDate[date] || 0) + 1;
    });

    res.json({
      success: true,
      analytics: {
        totalViews,
        uniqueViewers,
        completedViews,
        totalWatchTime, // in seconds
        avgWatchTime: Math.round(avgWatchTime), // in seconds
        completionRate: completionRate.toFixed(2), // percentage
        likeCount: video[0].likeCount,
        commentCount: video[0].commentCount,
        viewsByDate,
      },
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
 * Get creator analytics
 * GET /api/users/:pubkey/analytics
 */
export const getCreatorAnalytics = async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;

    // Get all creator videos
    const creatorVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.creatorPubkey, pubkey));

    if (creatorVideos.length === 0) {
      return res.json({
        success: true,
        analytics: {
          totalVideos: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalWatchTime: 0,
        },
      });
    }

    const videoIds = creatorVideos.map((v) => v.id);

    // Get all plays for creator's videos
    const allPlays = await db
      .select()
      .from(plays)
      .where(sql`${plays.videoId} IN ${videoIds}`);

    // Calculate total stats
    const totalVideos = creatorVideos.length;
    const totalViews = creatorVideos.reduce(
      (sum, v) => sum + (v.viewCount || 0),
      0
    );
    const totalLikes = creatorVideos.reduce(
      (sum, v) => sum + (v.likeCount || 0),
      0
    );
    const totalComments = creatorVideos.reduce(
      (sum, v) => sum + (v.commentCount || 0),
      0
    );
    const totalWatchTime = allPlays.reduce(
      (sum, p) => sum + p.watchDuration,
      0
    );

    // Get top performing videos
    const topVideos = creatorVideos
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5)
      .map((v) => ({
        id: v.id,
        title: v.title,
        views: v.viewCount,
        likes: v.likeCount,
        comments: v.commentCount,
      }));

    res.json({
      success: true,
      analytics: {
        totalVideos,
        totalViews,
        totalLikes,
        totalComments,
        totalWatchTime,
        avgViewsPerVideo:
          totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0,
        topVideos,
      },
    });
  } catch (error: any) {
    console.error("Get creator analytics error:", error);
    res.status(500).json({
      error: "Failed to get creator analytics",
      details: error.message,
    });
  }
};

/**
 * Get continue watching (videos with progress)
 * GET /api/users/:pubkey/continue-watching
 */
export const getContinueWatching = async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const { limit = 10 } = req.query;

    // Get incomplete plays with progress
    const incompletePlays = await db
      .select()
      .from(plays)
      .where(
        and(
          eq(plays.viewerPubkey, pubkey),
          eq(plays.completed, false),
          gt(plays.lastPosition, 0)
        )
      )
      .orderBy(desc(plays.playedAt))
      .limit(Number(limit));

    // Get video info for each play
    const continueWatching = await Promise.all(
      incompletePlays.map(async (play) => {
        const video = await db
          .select()
          .from(videos)
          .where(eq(videos.id, play.videoId))
          .limit(1);

        if (video.length === 0) return null;

        // Calculate progress percentage
        const lastPosition = play.lastPosition ?? 0;
        const progress = video[0].duration
          ? (lastPosition / video[0].duration) * 100
          : 0;

        return {
          ...video[0],
          playId: play.id,
          lastPosition: play.lastPosition,
          watchDuration: play.watchDuration,
          progress: Math.round(progress),
          lastWatched: play.playedAt,
        };
      })
    );

    // Filter out nulls
    const validVideos = continueWatching.filter((v) => v !== null);

    res.json({
      success: true,
      videos: validVideos,
    });
  } catch (error: any) {
    console.error("Get continue watching error:", error);
    res.status(500).json({
      error: "Failed to get continue watching",
      details: error.message,
    });
  }
};
