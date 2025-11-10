// =============================================================================
// x402 Payment Tracking Controller
// =============================================================================
// Handles x402 payment tracking and settlement endpoints
// =============================================================================

import { Request, Response } from "express";
import { chunkPaymentTracker } from "../services/chunk-payment-tracker.service";

/**
 * Record a chunk view (called after successful x402 payment)
 * POST /api/x402/track-chunk
 */
export const trackChunkView = async (req: Request, res: Response) => {
  try {
    const { videoId, segment, paymentProof, viewerPubkey } = req.body;

    if (!videoId || !segment || !paymentProof) {
      return res.status(400).json({
        error: "Missing required fields: videoId, segment, paymentProof",
      });
    }

    await chunkPaymentTracker.recordChunkView(
      videoId,
      segment,
      paymentProof,
      viewerPubkey
    );

    const stats = await chunkPaymentTracker.getSettlementStats(
      videoId,
      viewerPubkey
    );

    res.json({
      success: true,
      message: "Chunk view recorded",
      stats,
    });
  } catch (error: any) {
    console.error("Track chunk view error:", error);
    res.status(500).json({
      error: "Failed to track chunk view",
      details: error.message,
    });
  }
};

/**
 * Get settlement stats for a viewer-video pair
 * GET /api/x402/stats/:videoId
 */
export const getSettlementStats = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { viewerPubkey } = req.query;

    const stats = await chunkPaymentTracker.getSettlementStats(
      videoId,
      viewerPubkey as string | undefined
    );

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("Get settlement stats error:", error);
    res.status(500).json({
      error: "Failed to get settlement stats",
      details: error.message,
    });
  }
};

/**
 * Trigger manual settlement
 * POST /api/x402/settle
 */
export const triggerSettlement = async (req: Request, res: Response) => {
  try {
    const { videoId, viewerPubkey } = req.body;

    if (!videoId) {
      return res.status(400).json({
        error: "Missing required field: videoId",
      });
    }

    const result = await chunkPaymentTracker.settleChunks(
      videoId,
      viewerPubkey
    );

    if (result.success) {
      res.json({
        success: true,
        message: "Settlement completed",
        chunksSettled: result.chunksSettled,
        transactionSignature: result.transactionSignature,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Settlement failed",
        chunksSettled: 0,
      });
    }
  } catch (error: any) {
    console.error("Settlement error:", error);
    res.status(500).json({
      error: "Failed to settle chunks",
      details: error.message,
    });
  }
};

/**
 * Get unsettled chunk count
 * GET /api/x402/unsettled/:videoId
 */
export const getUnsettledChunkCount = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { viewerPubkey } = req.query;

    const count = chunkPaymentTracker.getUnsettledChunkCount(
      videoId,
      viewerPubkey as string | undefined
    );

    res.json({
      success: true,
      unsettledChunks: count,
    });
  } catch (error: any) {
    console.error("Get unsettled chunk count error:", error);
    res.status(500).json({
      error: "Failed to get unsettled chunk count",
      details: error.message,
    });
  }
};

export default {
  trackChunkView,
  getSettlementStats,
  triggerSettlement,
  getUnsettledChunkCount,
};
