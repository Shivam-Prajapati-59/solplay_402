// =============================================================================
// Likes Controller
// =============================================================================
// Handles video like/unlike operations
// =============================================================================

import { Request, Response } from "express";
import { db } from "../db";
import { likes, videos } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

// =============================================================================
// Like Operations
// =============================================================================

/**
 * Like a video
 * POST /api/videos/:id/like
 */
export const likeVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userPubkey } = req.body;

    if (!userPubkey) {
      return res.status(400).json({ error: "User pubkey is required" });
    }

    // Check if already liked
    const existingLike = await db
      .select()
      .from(likes)
      .where(
        and(eq(likes.videoId, Number(id)), eq(likes.userPubkey, userPubkey))
      )
      .limit(1);

    if (existingLike.length > 0) {
      return res.status(400).json({ error: "Video already liked" });
    }

    // Add like
    await db.insert(likes).values({
      videoId: Number(id),
      userPubkey,
    });

    // Increment like count in videos table
    await db
      .update(videos)
      .set({
        likeCount: sql`${videos.likeCount} + 1`,
      })
      .where(eq(videos.id, Number(id)));

    res.status(201).json({
      success: true,
      message: "Video liked successfully",
    });
  } catch (error: any) {
    console.error("Like video error:", error);
    res.status(500).json({
      error: "Failed to like video",
      details: error.message,
    });
  }
};

/**
 * Unlike a video
 * DELETE /api/videos/:id/like
 */
export const unlikeVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userPubkey } = req.body;

    if (!userPubkey) {
      return res.status(400).json({ error: "User pubkey is required" });
    }

    // Check if like exists
    const existingLike = await db
      .select()
      .from(likes)
      .where(
        and(eq(likes.videoId, Number(id)), eq(likes.userPubkey, userPubkey))
      )
      .limit(1);

    if (existingLike.length === 0) {
      return res.status(400).json({ error: "Video not liked yet" });
    }

    // Remove like
    await db
      .delete(likes)
      .where(
        and(eq(likes.videoId, Number(id)), eq(likes.userPubkey, userPubkey))
      );

    // Decrement like count in videos table
    await db
      .update(videos)
      .set({
        likeCount: sql`GREATEST(${videos.likeCount} - 1, 0)`,
      })
      .where(eq(videos.id, Number(id)));

    res.json({
      success: true,
      message: "Video unliked successfully",
    });
  } catch (error: any) {
    console.error("Unlike video error:", error);
    res.status(500).json({
      error: "Failed to unlike video",
      details: error.message,
    });
  }
};

/**
 * Get users who liked a video
 * GET /api/videos/:id/likes
 */
export const getVideoLikes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const videoLikes = await db
      .select()
      .from(likes)
      .where(eq(likes.videoId, Number(id)))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      likes: videoLikes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: videoLikes.length,
      },
    });
  } catch (error: any) {
    console.error("Get video likes error:", error);
    res.status(500).json({
      error: "Failed to get video likes",
      details: error.message,
    });
  }
};

/**
 * Check if user liked a video
 * GET /api/videos/:id/liked
 */
export const checkIfLiked = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userPubkey } = req.query;

    if (!userPubkey) {
      return res.status(400).json({ error: "User pubkey is required" });
    }

    const likeCheck = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.videoId, Number(id)),
          eq(likes.userPubkey, userPubkey as string)
        )
      )
      .limit(1);

    res.json({
      success: true,
      isLiked: likeCheck.length > 0,
    });
  } catch (error: any) {
    console.error("Check if liked error:", error);
    res.status(500).json({
      error: "Failed to check like status",
      details: error.message,
    });
  }
};

/**
 * Get user's liked videos
 * GET /api/users/:pubkey/liked-videos
 */
export const getUserLikedVideos = async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Get liked video IDs
    const likedVideos = await db
      .select({
        videoId: likes.videoId,
        likedAt: likes.likedAt,
      })
      .from(likes)
      .where(eq(likes.userPubkey, pubkey))
      .limit(Number(limit))
      .offset(offset);

    // Get full video details
    const videoIds = likedVideos.map((l) => l.videoId);

    if (videoIds.length === 0) {
      return res.json({
        success: true,
        videos: [],
        pagination: { page: Number(page), limit: Number(limit), total: 0 },
      });
    }

    const videosData = await db
      .select()
      .from(videos)
      .where(sql`${videos.id} IN ${videoIds}`);

    res.json({
      success: true,
      videos: videosData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: likedVideos.length,
      },
    });
  } catch (error: any) {
    console.error("Get user liked videos error:", error);
    res.status(500).json({
      error: "Failed to get liked videos",
      details: error.message,
    });
  }
};
