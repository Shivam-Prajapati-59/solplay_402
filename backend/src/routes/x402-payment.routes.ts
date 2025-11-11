// =============================================================================
// x402 Payment Tracking Routes
// =============================================================================
// Routes for tracking x402 micropayments and settlements
// =============================================================================

import { Router } from "express";
import {
  trackChunkView,
  getSettlementStats,
  triggerSettlement,
  getUnsettledChunkCount,
  getSettlementPreview,
} from "../controllers/x402-payment.controller";

const router = Router();

/**
 * POST /api/x402/track-chunk
 * Record a chunk view after successful x402 payment
 */
router.post("/track-chunk", trackChunkView);

/**
 * GET /api/x402/stats/:videoId
 * Get settlement stats for a viewer-video pair
 */
router.get("/stats/:videoId", getSettlementStats);

/**
 * GET /api/x402/preview/:sessionPda
 * Get settlement preview (calculates costs before settlement)
 */
router.get("/preview/:sessionPda", getSettlementPreview);

/**
 * POST /api/x402/settle
 * Trigger manual settlement (batch transaction)
 */
router.post("/settle", triggerSettlement);

/**
 * GET /api/x402/unsettled/:videoId
 * Get unsettled chunk count for a viewer
 */
router.get("/unsettled/:videoId", getUnsettledChunkCount);

export default router;
