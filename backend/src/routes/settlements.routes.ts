// =============================================================================
// Settlement Routes
// =============================================================================
// API routes for settlement history and analytics
// =============================================================================

import { Router } from "express";
import { db } from "../db";
import { settlements, videos } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

const router = Router();

/**
 * GET /api/settlements/viewer/:pubkey
 * Get settlement history for a viewer
 */
router.get("/viewer/:pubkey", async (req, res) => {
  try {
    const { pubkey } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get settlements with video information
    const settlementsData = await db
      .select({
        settlement: settlements,
        video: {
          id: videos.id,
          title: videos.title,
          thumbnailUrl: videos.thumbnailUrl,
        },
      })
      .from(settlements)
      .leftJoin(videos, eq(settlements.videoId, videos.id))
      .where(eq(settlements.viewerPubkey, pubkey))
      .orderBy(desc(settlements.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(settlements)
      .where(eq(settlements.viewerPubkey, pubkey));

    res.json({
      success: true,
      settlements: settlementsData,
      count: countResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching viewer settlements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settlements",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/settlements/creator/:pubkey
 * Get settlement history for a creator (earnings)
 */
router.get("/creator/:pubkey", async (req, res) => {
  try {
    const { pubkey } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get settlements with video information
    const settlementsData = await db
      .select({
        settlement: settlements,
        video: {
          id: videos.id,
          title: videos.title,
          thumbnailUrl: videos.thumbnailUrl,
        },
      })
      .from(settlements)
      .leftJoin(videos, eq(settlements.videoId, videos.id))
      .where(eq(settlements.creatorPubkey, pubkey))
      .orderBy(desc(settlements.createdAt))
      .limit(limit)
      .offset(offset);

    // Calculate total earnings
    const earningsResult = await db
      .select({
        totalEarnings: sql<number>`sum(${settlements.creatorAmount})`,
      })
      .from(settlements)
      .where(eq(settlements.creatorPubkey, pubkey));

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(settlements)
      .where(eq(settlements.creatorPubkey, pubkey));

    res.json({
      success: true,
      settlements: settlementsData,
      count: countResult[0]?.count || 0,
      totalEarnings: earningsResult[0]?.totalEarnings || 0,
    });
  } catch (error) {
    console.error("Error fetching creator settlements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settlements",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/settlements/video/:videoId
 * Get settlement history for a specific video
 */
router.get("/video/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get settlements
    const settlementsData = await db
      .select()
      .from(settlements)
      .where(eq(settlements.videoId, parseInt(videoId)))
      .orderBy(desc(settlements.createdAt))
      .limit(limit)
      .offset(offset);

    // Calculate stats
    const statsResult = await db
      .select({
        totalRevenue: sql<number>`sum(${settlements.totalPayment})`,
        totalChunks: sql<number>`sum(${settlements.chunkCount})`,
        count: sql<number>`count(*)`,
      })
      .from(settlements)
      .where(eq(settlements.videoId, parseInt(videoId)));

    const stats = statsResult[0];

    res.json({
      success: true,
      settlements: settlementsData,
      count: stats?.count || 0,
      stats: {
        totalEarnings: stats?.totalRevenue || 0,
        totalChunks: stats?.totalChunks || 0,
        averageSettlementSize:
          stats?.count > 0 ? (stats?.totalRevenue || 0) / stats.count : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching video settlements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settlements",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/settlements/session/:sessionId
 * Get settlements for a specific session
 */
router.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const settlementsData = await db
      .select()
      .from(settlements)
      .where(eq(settlements.sessionId, parseInt(sessionId)))
      .orderBy(desc(settlements.createdAt));

    res.json({
      success: true,
      settlements: settlementsData,
      count: settlementsData.length,
    });
  } catch (error) {
    console.error("Error fetching session settlements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settlements",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/settlements/signature/:signature
 * Get settlement by transaction signature
 */
router.get("/signature/:signature", async (req, res) => {
  try {
    const { signature } = req.params;

    const settlement = await db
      .select()
      .from(settlements)
      .where(eq(settlements.transactionSignature, signature))
      .limit(1);

    if (settlement.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Settlement not found",
      });
    }

    res.json({
      success: true,
      settlement: settlement[0],
    });
  } catch (error) {
    console.error("Error fetching settlement by signature:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settlement",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
