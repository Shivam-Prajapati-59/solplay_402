// =============================================================================
// User Controller
// =============================================================================
// Handles user profile operations
// =============================================================================

import { Request, Response } from "express";
import { db } from "../db";
import { users, videos } from "../db/schema";
import { eq, desc } from "drizzle-orm";

// =============================================================================
// User Profile Operations
// =============================================================================

/**
 * Create or get user profile
 * POST /api/users/profile
 */
export const createOrGetUser = async (req: Request, res: Response) => {
  try {
    const { pubkey, accountName } = req.body;

    if (!pubkey) {
      return res.status(400).json({ error: "Pubkey is required" });
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.pubkey, pubkey))
      .limit(1);

    if (existingUser.length > 0) {
      return res.json({
        success: true,
        user: existingUser[0],
        message: "User already exists",
      });
    }

    // Create new user
    const newUser = await db
      .insert(users)
      .values({
        pubkey,
        accountName: accountName || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      user: newUser[0],
      message: "User created successfully",
    });
  } catch (error: any) {
    console.error("Create/Get user error:", error);
    res.status(500).json({
      error: "Failed to create/get user",
      details: error.message,
    });
  }
};

/**
 * Get user profile by pubkey
 * GET /api/users/:pubkey
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.pubkey, pubkey))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's video count
    const userVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.creatorPubkey, pubkey));

    res.json({
      success: true,
      user: user[0],
      stats: {
        totalVideos: userVideos.length,
        totalViews: userVideos.reduce((sum, v) => sum + (v.viewCount || 0), 0),
        totalLikes: userVideos.reduce((sum, v) => sum + (v.likeCount || 0), 0),
      },
    });
  } catch (error: any) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      error: "Failed to get user profile",
      details: error.message,
    });
  }
};

/**
 * Update user profile
 * PUT /api/users/:pubkey
 */
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const { accountName } = req.body;

    // Verify user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.pubkey, pubkey))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user
    const updatedUser = await db
      .update(users)
      .set({
        accountName: accountName || existingUser[0].accountName,
        updatedAt: new Date(),
      })
      .where(eq(users.pubkey, pubkey))
      .returning();

    res.json({
      success: true,
      user: updatedUser[0],
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    console.error("Update user profile error:", error);
    res.status(500).json({
      error: "Failed to update user profile",
      details: error.message,
    });
  }
};

/**
 * Get user's videos
 * GET /api/users/:pubkey/videos
 */
export const getUserVideos = async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const userVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.creatorPubkey, pubkey))
      .orderBy(desc(videos.createdAt))
      .limit(Number(limit))
      .offset(offset);

    res.json({
      success: true,
      videos: userVideos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: userVideos.length,
      },
    });
  } catch (error: any) {
    console.error("Get user videos error:", error);
    res.status(500).json({
      error: "Failed to get user videos",
      details: error.message,
    });
  }
};
