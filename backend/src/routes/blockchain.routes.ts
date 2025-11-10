// =============================================================================
// Blockchain Integration Routes
// =============================================================================
// API routes for blockchain-related operations
// =============================================================================

import { Router } from "express";
import {
  updateVideoWithBlockchainData,
  createBlockchainSession,
  recordChunkPayment,
  getVideoSessions,
  getSessionPayments,
  getCreatorEarnings,
} from "../controllers/blockchain.controller";
import { db } from "../db";
import { blockchainSessions, videos } from "../db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// =============================================================================
// Video Blockchain Routes
// =============================================================================

/**
 * PUT /api/videos/:id/blockchain
 * Update video with blockchain data after registration
 */
router.put("/videos/:id/blockchain", updateVideoWithBlockchainData);

// =============================================================================
// Session Management Routes
// =============================================================================

/**
 * POST /api/blockchain/sessions
 * Create a new blockchain session
 */
router.post("/sessions", createBlockchainSession);

/**
 * GET /api/blockchain/sessions/viewer/:pubkey
 * Get all active sessions for a viewer
 */
router.get("/sessions/viewer/:pubkey", async (req, res) => {
  try {
    const { pubkey } = req.params;

    // Get active sessions with video information
    const sessions = await db
      .select({
        id: blockchainSessions.id,
        videoId: blockchainSessions.videoId,
        videoTitle: videos.title,
        sessionPda: blockchainSessions.sessionPda,
        maxApprovedChunks: blockchainSessions.maxApprovedChunks,
        chunksConsumed: blockchainSessions.chunksConsumed,
        totalSpent: blockchainSessions.totalSpent,
        isActive: blockchainSessions.isActive,
      })
      .from(blockchainSessions)
      .leftJoin(videos, eq(blockchainSessions.videoId, videos.id))
      .where(eq(blockchainSessions.viewerPubkey, pubkey))
      .orderBy(desc(blockchainSessions.lastActivity));

    res.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error("Error fetching viewer sessions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch sessions",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/blockchain/sessions/:videoId
 * Get all sessions for a video
 */
router.get("/sessions/:videoId", getVideoSessions);

/**
 * GET /api/blockchain/sessions/:sessionId/payments
 * Get all chunk payments for a session
 */
router.get("/sessions/:sessionId/payments", getSessionPayments);

// =============================================================================
// Payment Routes
// =============================================================================

/**
 * POST /api/blockchain/chunk-payments
 * Record a chunk payment
 */
router.post("/chunk-payments", recordChunkPayment);

// =============================================================================
// Earnings Routes
// =============================================================================

/**
 * GET /api/blockchain/earnings/:creatorPubkey
 * Get earnings summary for a creator
 */
router.get("/earnings/:creatorPubkey", getCreatorEarnings);

export default router;
