// =============================================================================
// Plays Routes
// =============================================================================
// API routes for watch history and analytics
// =============================================================================

import { Router } from "express";
import {
  recordPlay,
  updatePlayProgress,
  getWatchHistory,
  getVideoAnalytics,
  getCreatorAnalytics,
  getContinueWatching,
} from "../controllers/plays.controller";

const router = Router();

// =============================================================================
// Play Operations
// =============================================================================

/**
 * POST /api/plays
 * Record a video play
 * Body: { videoId, userPubkey, deviceType? }
 */
router.post("/", recordPlay);

/**
 * PUT /api/plays/:id/progress
 * Update play progress
 * Body: { watchedSeconds, completed? }
 */
router.put("/:id/progress", updatePlayProgress);

// =============================================================================
// Watch History & Analytics
// =============================================================================

/**
 * GET /api/plays/history/:pubkey
 * Get user's watch history
 */
router.get("/history/:pubkey", getWatchHistory);

/**
 * GET /api/plays/continue/:pubkey
 * Get videos to continue watching
 */
router.get("/continue/:pubkey", getContinueWatching);

/**
 * GET /api/plays/analytics/video/:videoId
 * Get video analytics
 */
router.get("/analytics/video/:videoId", getVideoAnalytics);

/**
 * GET /api/plays/analytics/creator/:pubkey
 * Get creator analytics
 */
router.get("/analytics/creator/:pubkey", getCreatorAnalytics);

export default router;
