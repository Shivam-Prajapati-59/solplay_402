// =============================================================================
// x402 Payment Middleware for HLS Chunk Streaming
// =============================================================================
// Handles micropayments for video chunk access
// =============================================================================

import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { videos, blockchainSessions } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Get chunk price from database
 */
export const getChunkPrice = async (videoId: string): Promise<number> => {
  try {
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, parseInt(videoId)))
      .limit(1);

    if (video.length > 0 && video[0].pricePerChunk) {
      // Convert from smallest unit to USD (assuming 6 decimals for USDC)
      return Number(video[0].pricePerChunk) / 1_000_000;
    }

    // Default price if not found
    return 0.001;
  } catch (error) {
    console.error("Error fetching chunk price:", error);
    return 0.001; // Fallback price
  }
};

/**
 * Verify x402 payment header
 */
export const verifyX402Payment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentHeader = req.headers["x-payment"] as string;
    const videoId = req.params.videoId;
    const segment = req.params.segment;

    // If no payment header, return 402 Payment Required
    if (!paymentHeader) {
      return res.status(402).json({
        error: "Payment Required",
        message: "x-payment header is required",
        price: await getChunkPrice(videoId),
        network: process.env.SOLANA_NETWORK || "solana-devnet",
        paymentAddress: process.env.ADDRESS,
      });
    }

    // TODO: Verify payment with x402 facilitator
    // For now, just validate the header exists
    console.log(
      `✅ Payment header received for video ${videoId}, chunk ${segment}`
    );

    // Attach payment info to request for tracking
    (req as any).paymentInfo = {
      videoId,
      segment,
      paymentProof: paymentHeader,
      timestamp: Date.now(),
    };

    next();
  } catch (error: any) {
    console.error("x402 payment verification error:", error);
    return res.status(500).json({
      error: "Payment verification failed",
      details: error.message,
    });
  }
};

/**
 * Track chunk payment after successful delivery
 */
export const trackChunkPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentInfo = (req as any).paymentInfo;

    if (paymentInfo) {
      // Log the successful payment
      console.log(
        `📊 Chunk delivered: video ${paymentInfo.videoId}, chunk ${paymentInfo.segment}`
      );

      // TODO: Store in Redis for batch settlement
      // await redis.hincrby(`video:${paymentInfo.videoId}:chunks`, paymentInfo.segment, 1);
    }

    next();
  } catch (error) {
    console.error("Error tracking chunk payment:", error);
    // Don't fail the request, just log the error
    next();
  }
};

/**
 * Check if user has active delegation for video
 */
export const checkDelegationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const videoId = req.params.videoId;
    const viewerPubkey = req.headers["x-viewer-pubkey"] as string;

    if (!viewerPubkey) {
      return res.status(400).json({
        error: "Missing viewer public key",
        message: "x-viewer-pubkey header is required",
      });
    }

    // Check if viewer has active delegation
    const sessions = await db
      .select()
      .from(blockchainSessions)
      .where(eq(blockchainSessions.videoId, parseInt(videoId)))
      .limit(1);

    const activeSession = sessions.find(
      (s) => s.viewerPubkey === viewerPubkey && s.isActive
    );

    if (!activeSession) {
      return res.status(403).json({
        error: "No active delegation",
        message: "Please approve token delegation first",
      });
    }

    // Check if delegation has enough chunks remaining
    const chunksRemaining =
      activeSession.maxApprovedChunks - activeSession.chunksConsumed;

    if (chunksRemaining <= 0) {
      return res.status(403).json({
        error: "Delegation exhausted",
        message: "Please approve more chunks",
        chunksConsumed: activeSession.chunksConsumed,
        maxApproved: activeSession.maxApprovedChunks,
      });
    }

    // Attach session info to request
    (req as any).delegationSession = activeSession;

    next();
  } catch (error: any) {
    console.error("Delegation check error:", error);
    return res.status(500).json({
      error: "Delegation verification failed",
      details: error.message,
    });
  }
};
