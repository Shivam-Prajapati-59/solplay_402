// =============================================================================
// Video Management Controller
// =============================================================================
// Handles video CRUD operations, search, and discovery
// =============================================================================

import { Request, Response } from "express";
import { db } from "../db";
import { videos, likes, comments, plays } from "../db/schema";
import { eq, desc, sql, and, or, ilike, inArray } from "drizzle-orm";

// =============================================================================
// Video CRUD Operations
// =============================================================================

/**
 * Create a new video
 * POST /api/videos
 */
export const createVideo = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      tags,
      category,
      creatorPubkey,
      ipfsCid,
      thumbnailUrl,
      duration,
      videoSize,
      videoFormat,
      videoResolution,
      price,
    } = req.body;

    // Validate required fields
    if (!title || !creatorPubkey || !ipfsCid) {
      return res.status(400).json({
        error: "Missing required fields: title, creatorPubkey, ipfsCid",
      });
    }

    // Create video
    const newVideo = await db
      .insert(videos)
      .values({
        title,
        description: description || null,
        tags: tags || [],
        category: category || null,
        creatorPubkey,
        ipfsCid,
        thumbnailUrl: thumbnailUrl || null,
        duration: duration || null,
        videoSize: videoSize || null,
        videoFormat: videoFormat || "mp4",
        videoResolution: videoResolution || null,
        price: price || "0.001",
        status: "processing",
        isPublic: true,
      })
      .returning();

    res.status(201).json({
      success: true,
      video: newVideo[0],
      message: "Video created successfully",
    });
  } catch (error: any) {
    console.error("Create video error:", error);
    res.status(500).json({
      error: "Failed to create video",
      details: error.message,
    });
  }
};

/**
 * Get video by ID with stats
 * GET /api/videos/:id
 */
export const getVideoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userPubkey } = req.query;

    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, Number(id)))
      .limit(1);

    if (video.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Check if user liked the video
    let isLiked = false;
    if (userPubkey) {
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
      isLiked = likeCheck.length > 0;
    }

    res.json({
      success: true,
      video: video[0],
      isLiked,
    });
  } catch (error: any) {
    console.error("Get video error:", error);
    res.status(500).json({
      error: "Failed to get video",
      details: error.message,
    });
  }
};

/**
 * Update video
 * PUT /api/videos/:id
 */
export const updateVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      tags,
      category,
      thumbnailUrl,
      hlsPlaylistUrl,
      status,
      isPublic,
      price,
    } = req.body;

    // Check if video exists
    const existingVideo = await db
      .select()
      .from(videos)
      .where(eq(videos.id, Number(id)))
      .limit(1);

    if (existingVideo.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Update video
    const updatedVideo = await db
      .update(videos)
      .set({
        title: title || existingVideo[0].title,
        description:
          description !== undefined
            ? description
            : existingVideo[0].description,
        tags: tags || existingVideo[0].tags,
        category: category !== undefined ? category : existingVideo[0].category,
        thumbnailUrl:
          thumbnailUrl !== undefined
            ? thumbnailUrl
            : existingVideo[0].thumbnailUrl,
        hlsPlaylistUrl:
          hlsPlaylistUrl !== undefined
            ? hlsPlaylistUrl
            : existingVideo[0].hlsPlaylistUrl,
        status: status || existingVideo[0].status,
        isPublic: isPublic !== undefined ? isPublic : existingVideo[0].isPublic,
        price: price || existingVideo[0].price,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, Number(id)))
      .returning();

    res.json({
      success: true,
      video: updatedVideo[0],
      message: "Video updated successfully",
    });
  } catch (error: any) {
    console.error("Update video error:", error);
    res.status(500).json({
      error: "Failed to update video",
      details: error.message,
    });
  }
};

/**
 * Delete video
 * DELETE /api/videos/:id
 */
export const deleteVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { creatorPubkey } = req.body;

    // Verify ownership
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, Number(id)))
      .limit(1);

    if (video.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    if (video[0].creatorPubkey !== creatorPubkey) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this video" });
    }

    // Delete video (cascade will delete related records)
    await db.delete(videos).where(eq(videos.id, Number(id)));

    res.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete video error:", error);
    res.status(500).json({
      error: "Failed to delete video",
      details: error.message,
    });
  }
};

// =============================================================================
// Video Discovery & Search
// =============================================================================

/**
 * Get all videos with filters
 * GET /api/videos
 */
export const getAllVideos = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      status = "ready",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build where conditions
    const conditions = [
      eq(videos.isPublic, true),
      eq(videos.status, status as any),
    ];

    if (category) {
      conditions.push(eq(videos.category, category as string));
    }

    // Get videos
    const allVideos = await db
      .select()
      .from(videos)
      .where(and(...conditions))
      .orderBy(
        sortBy === "viewCount"
          ? order === "desc"
            ? desc(videos.viewCount)
            : videos.viewCount
          : sortBy === "likeCount"
          ? order === "desc"
            ? desc(videos.likeCount)
            : videos.likeCount
          : order === "desc"
          ? desc(videos.createdAt)
          : videos.createdAt
      )
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      videos: allVideos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: allVideos.length,
      },
    });
  } catch (error: any) {
    console.error("Get all videos error:", error);
    res.status(500).json({
      error: "Failed to get videos",
      details: error.message,
    });
  }
};

/**
 * Search videos by title, description, or tags
 * GET /api/videos/search
 */
export const searchVideos = async (req: Request, res: Response) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const offset = (Number(page) - 1) * Number(limit);
    const searchTerm = `%${q}%`;

    const searchResults = await db
      .select()
      .from(videos)
      .where(
        and(
          eq(videos.isPublic, true),
          eq(videos.status, "ready"),
          or(
            ilike(videos.title, searchTerm),
            ilike(videos.description, searchTerm)
          )
        )
      )
      .orderBy(desc(videos.viewCount))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      videos: searchResults,
      query: q,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: searchResults.length,
      },
    });
  } catch (error: any) {
    console.error("Search videos error:", error);
    res.status(500).json({
      error: "Failed to search videos",
      details: error.message,
    });
  }
};

/**
 * Get trending videos (most viewed in last 7 days)
 * GET /api/videos/trending
 */
export const getTrendingVideos = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const trendingVideos = await db
      .select()
      .from(videos)
      .where(and(eq(videos.isPublic, true), eq(videos.status, "ready")))
      .orderBy(desc(videos.viewCount), desc(videos.likeCount))
      .limit(Number(limit));

    res.json({
      success: true,
      videos: trendingVideos,
    });
  } catch (error: any) {
    console.error("Get trending videos error:", error);
    res.status(500).json({
      error: "Failed to get trending videos",
      details: error.message,
    });
  }
};

/**
 * Get videos by category
 * GET /api/videos/category/:category
 */
export const getVideosByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const categoryVideos = await db
      .select()
      .from(videos)
      .where(
        and(
          eq(videos.category, category),
          eq(videos.isPublic, true),
          eq(videos.status, "ready")
        )
      )
      .orderBy(desc(videos.createdAt))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      category,
      videos: categoryVideos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: categoryVideos.length,
      },
    });
  } catch (error: any) {
    console.error("Get videos by category error:", error);
    res.status(500).json({
      error: "Failed to get videos by category",
      details: error.message,
    });
  }
};

/**
 * Increment view count
 * POST /api/videos/:id/view
 */
export const incrementViewCount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updatedVideo = await db
      .update(videos)
      .set({
        viewCount: sql`${videos.viewCount} + 1`,
      })
      .where(eq(videos.id, Number(id)))
      .returning();

    res.json({
      success: true,
      viewCount: updatedVideo[0]?.viewCount,
    });
  } catch (error: any) {
    console.error("Increment view count error:", error);
    res.status(500).json({
      error: "Failed to increment view count",
      details: error.message,
    });
  }
};
