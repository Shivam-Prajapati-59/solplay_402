// =============================================================================
// Comments Routes
// =============================================================================
// API routes for comment management with nested replies
// =============================================================================

import { Router } from "express";
import {
  addComment,
  getVideoComments,
  deleteComment,
  updateComment,
  getUserComments,
} from "../controllers/comments.controller";

const router = Router();

// =============================================================================
// Comment Operations
// =============================================================================

/**
 * POST /api/comments
 * Add a comment or reply
 * Body: { videoId, userPubkey, content, parentId? }
 */
router.post("/", addComment);

/**
 * PUT /api/comments/:id
 * Update a comment
 * Body: { content }
 */
router.put("/:id", updateComment);

/**
 * DELETE /api/comments/:id
 * Delete a comment
 */
router.delete("/:id", deleteComment);

// =============================================================================
// Comment Queries
// =============================================================================

/**
 * GET /api/comments/video/:videoId
 * Get all comments for a video (with nested replies)
 */
router.get("/video/:videoId", getVideoComments);

/**
 * GET /api/comments/user/:pubkey
 * Get all comments by a user
 */
router.get("/user/:pubkey", getUserComments);

export default router;
