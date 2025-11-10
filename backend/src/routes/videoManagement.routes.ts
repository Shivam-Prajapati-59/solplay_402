// =============================================================================
// Video Management Routes
// =============================================================================
// API routes for video CRUD, search, and discovery
// =============================================================================

import { Router } from "express";
import {
  createVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  getAllVideos,
  getVideosByCategory,
  searchVideos,
  getTrendingVideos,
  incrementViewCount,
} from "../controllers/videoManagement.controller";

const router = Router();

// =============================================================================
// Video CRUD Routes
// =============================================================================
// NOTE: Order matters! Specific routes MUST come before dynamic /:id routes

console.log("🔧 Registering video management routes...");

/**
 * POST /api/videos/create
 * Create a new video
 */
router.post("/create", createVideo);
console.log("✅ POST /create registered");

// =============================================================================
// Video Discovery Routes (specific paths before /:id)
// =============================================================================

/**
 * GET /api/videos/search
 * Search videos
 */
router.get("/search", searchVideos);

/**
 * GET /api/videos/trending
 * Get trending videos
 */
router.get("/trending", getTrendingVideos);

/**
 * GET /api/videos/category/:category
 * Get videos by category
 */
router.get("/category/:category", getVideosByCategory);

/**
 * GET /api/videos
 * Get all videos (with pagination and filters)
 */
router.get("/", getAllVideos);

/**
 * POST /api/videos
 * Create a new video (legacy endpoint)
 */
router.post("/", createVideo);

// =============================================================================
// Dynamic ID Routes (must come AFTER specific routes)
// =============================================================================

/**
 * GET /api/videos/:id
 * Get video by ID
 */
router.get("/:id", getVideoById);

/**
 * PUT /api/videos/:id
 * Update video
 */
router.put("/:id", updateVideo);

/**
 * DELETE /api/videos/:id
/**
 * DELETE /api/videos/:id
 * Delete video
 */
router.delete("/:id", deleteVideo);

/**
 * POST /api/videos/:id/view
 * Increment view count
 */
router.post("/:id/view", incrementViewCount);

export default router;
