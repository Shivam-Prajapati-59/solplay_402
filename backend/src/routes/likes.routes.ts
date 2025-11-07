// =============================================================================
// Likes Routes
// =============================================================================
// API routes for video like/unlike operations
// =============================================================================

import { Router } from "express";
import {
  likeVideo,
  unlikeVideo,
  getVideoLikes,
  getUserLikedVideos,
  checkIfLiked,
} from "../controllers/likes.controller";

const router = Router();

// =============================================================================
// Like Operations
// =============================================================================

/**
 * POST /api/likes
 * Like a video
 * Body: { userPubkey, videoId }
 */
router.post("/", likeVideo);

/**
 * DELETE /api/likes
 * Unlike a video
 * Body: { userPubkey, videoId }
 */
router.delete("/", unlikeVideo);

// =============================================================================
// Like Queries
// =============================================================================

/**
 * GET /api/likes/video/:videoId
 * Get all likes for a video
 */
router.get("/video/:videoId", getVideoLikes);

/**
 * GET /api/likes/user/:pubkey
 * Get all videos liked by a user
 */
router.get("/user/:pubkey", getUserLikedVideos);

/**
 * GET /api/likes/check
 * Check if user liked a video
 * Query: userPubkey, videoId
 */
router.get("/check", checkIfLiked);

export default router;
