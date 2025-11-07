// =============================================================================
// User Routes
// =============================================================================
// API routes for user operations
// =============================================================================

import { Router } from "express";
import {
  createOrGetUser,
  getUserProfile,
  updateUserProfile,
  getUserVideos,
} from "../controllers/user.controller";

const router = Router();

// =============================================================================
// User Profile Routes
// =============================================================================

/**
 * POST /api/users/profile
 * Create or get user profile
 */
router.post("/profile", createOrGetUser);

/**
 * GET /api/users/:pubkey
 * Get user profile by pubkey
 */
router.get("/:pubkey", getUserProfile);

/**
 * PUT /api/users/:pubkey
 * Update user profile
 */
router.put("/:pubkey", updateUserProfile);

/**
 * GET /api/users/:pubkey/videos
 * Get user's videos
 */
router.get("/:pubkey/videos", getUserVideos);

export default router;
