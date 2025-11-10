// =============================================================================
// Blockchain Integration Controller
// =============================================================================
// Handles blockchain-related operations on the backend
// =============================================================================

import { Request, Response } from "express";
import { db } from "../db";
import { videos, blockchainSessions, chunkPayments } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Update video with blockchain data after on-chain registration
 * PUT /api/videos/:id/blockchain
 */
export const updateVideoWithBlockchainData = async (
  req: Request,
  res: Response
) => {
  try {
    const videoId = parseInt(req.params.id);
    const {
      blockchainVideoId,
      videoPda,
      creatorEarningsPda,
      totalChunks,
      pricePerChunk,
      isOnChain,
      onChainCreatedAt,
      transactionSignature,
    } = req.body;

    if (isNaN(videoId)) {
      return res.status(400).json({ error: "Invalid video ID" });
    }

    // Update video with blockchain information
    const updatedVideo = await db
      .update(videos)
      .set({
        blockchainVideoId,
        videoPda,
        creatorEarningsPda,
        totalChunks,
        pricePerChunk,
        isOnChain: isOnChain ?? true,
        onChainCreatedAt: onChainCreatedAt
          ? new Date(onChainCreatedAt)
          : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId))
      .returning();

    if (updatedVideo.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json({
      success: true,
      video: updatedVideo[0],
      message: "Video updated with blockchain data",
    });
  } catch (error: any) {
    console.error("Error updating video with blockchain data:", error);
    res.status(500).json({
      error: "Failed to update video",
      details: error.message,
    });
  }
};

/**
 * Create blockchain session record
 * POST /api/blockchain/sessions
 */
export const createBlockchainSession = async (req: Request, res: Response) => {
  try {
    const {
      sessionPda,
      videoId,
      viewerPubkey,
      maxApprovedChunks,
      approvedPricePerChunk,
      sessionStart,
      approvalSignature,
    } = req.body;

    const session = await db
      .insert(blockchainSessions)
      .values({
        sessionPda,
        videoId,
        viewerPubkey,
        maxApprovedChunks,
        chunksConsumed: 0,
        totalSpent: 0,
        approvedPricePerChunk: Number(approvedPricePerChunk),
        lastPaidChunkIndex: null,
        sessionStart: new Date(sessionStart),
        lastActivity: new Date(),
        isActive: true,
        approvalSignature,
      })
      .returning();

    res.json({
      success: true,
      session: session[0],
    });
  } catch (error: any) {
    console.error("Error creating blockchain session:", error);
    res.status(500).json({
      error: "Failed to create session",
      details: error.message,
    });
  }
};

/**
 * Record chunk payment
 * POST /api/blockchain/chunk-payments
 */
export const recordChunkPayment = async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      videoId,
      chunkIndex,
      paymentSequence,
      amountPaid,
      platformFee,
      creatorAmount,
      transactionSignature,
      viewerPubkey,
      creatorPubkey,
    } = req.body;

    // Record the chunk payment
    const payment = await db
      .insert(chunkPayments)
      .values({
        sessionId,
        videoId,
        chunkIndex,
        paymentSequence,
        amountPaid,
        platformFee,
        creatorAmount,
        transactionSignature,
        viewerPubkey,
        creatorPubkey,
        paidAt: new Date(),
      })
      .returning();

    // Update session statistics
    await db
      .update(blockchainSessions)
      .set({
        chunksConsumed: paymentSequence,
        totalSpent: Number(amountPaid), // Will need to fetch and add properly
        lastPaidChunkIndex: chunkIndex,
        lastActivity: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(blockchainSessions.id, sessionId));

    res.json({
      success: true,
      payment: payment[0],
    });
  } catch (error: any) {
    console.error("Error recording chunk payment:", error);
    res.status(500).json({
      error: "Failed to record payment",
      details: error.message,
    });
  }
};

/**
 * Get blockchain sessions for a video
 * GET /api/blockchain/sessions/:videoId
 */
export const getVideoSessions = async (req: Request, res: Response) => {
  try {
    const videoId = parseInt(req.params.videoId);

    if (isNaN(videoId)) {
      return res.status(400).json({ error: "Invalid video ID" });
    }

    const sessions = await db
      .select()
      .from(blockchainSessions)
      .where(eq(blockchainSessions.videoId, videoId));

    res.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({
      error: "Failed to fetch sessions",
      details: error.message,
    });
  }
};

/**
 * Get chunk payments for a session
 * GET /api/blockchain/sessions/:sessionId/payments
 */
export const getSessionPayments = async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: "Invalid session ID" });
    }

    const payments = await db
      .select()
      .from(chunkPayments)
      .where(eq(chunkPayments.sessionId, sessionId));

    res.json({
      success: true,
      payments,
    });
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      error: "Failed to fetch payments",
      details: error.message,
    });
  }
};

/**
 * Get creator earnings summary
 * GET /api/blockchain/earnings/:creatorPubkey
 */
export const getCreatorEarnings = async (req: Request, res: Response) => {
  try {
    const { creatorPubkey } = req.params;

    // Aggregate earnings from chunk payments
    const earnings = await db
      .select()
      .from(chunkPayments)
      .where(eq(chunkPayments.creatorPubkey, creatorPubkey));

    const totalEarnings = earnings.reduce(
      (sum, payment) => sum + BigInt(payment.creatorAmount),
      0n
    );

    const uniqueVideos = new Set(earnings.map((p) => p.videoId)).size;
    const totalChunks = earnings.length;

    res.json({
      success: true,
      earnings: {
        totalEarned: totalEarnings.toString(),
        totalVideos: uniqueVideos,
        totalChunks,
        payments: earnings,
      },
    });
  } catch (error: any) {
    console.error("Error fetching creator earnings:", error);
    res.status(500).json({
      error: "Failed to fetch earnings",
      details: error.message,
    });
  }
};

export default {
  updateVideoWithBlockchainData,
  createBlockchainSession,
  recordChunkPayment,
  getVideoSessions,
  getSessionPayments,
  getCreatorEarnings,
};
