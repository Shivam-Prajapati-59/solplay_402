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
