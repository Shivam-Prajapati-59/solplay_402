// =============================================================================
// Chunk Payment Tracking Service
// =============================================================================
// Tracks x402 micropayments in-memory for batch settlement
// =============================================================================

import { db } from "../db";
import { videos, blockchainSessions, chunkPayments } from "../db/schema";
import { eq, and } from "drizzle-orm";

// In-memory storage for chunk views (to be replaced with Redis in production)
interface ChunkView {
  videoId: string;
  segment: string;
  viewerPubkey?: string;
  paymentProof: string;
  timestamp: number;
  settled: boolean;
}

class ChunkPaymentTracker {
  private chunkViews: Map<string, ChunkView[]> = new Map();
  private readonly SETTLEMENT_THRESHOLD = 100; // Settle every 100 chunks
  private readonly SETTLEMENT_INTERVAL = 3600000; // Or every hour (ms)

  /**
   * Record a chunk view after successful x402 payment
   */
  async recordChunkView(
    videoId: string,
    segment: string,
    paymentProof: string,
    viewerPubkey?: string
  ): Promise<void> {
    const key = `${videoId}:${viewerPubkey || "anonymous"}`;

    if (!this.chunkViews.has(key)) {
      this.chunkViews.set(key, []);
    }

    const views = this.chunkViews.get(key)!;
    views.push({
      videoId,
      segment,
      viewerPubkey,
      paymentProof,
      timestamp: Date.now(),
      settled: false,
    });

    console.log(`📊 Chunk view recorded: ${segment} for video ${videoId}`);
    console.log(
      `   Total unsettled views: ${views.filter((v) => !v.settled).length}`
    );

    // Check if we should trigger settlement
    await this.checkSettlementThreshold(videoId, viewerPubkey);
  }

  /**
   * Get unsettled chunk count for a viewer-video pair
   */
  getUnsettledChunkCount(videoId: string, viewerPubkey?: string): number {
    const key = `${videoId}:${viewerPubkey || "anonymous"}`;
    const views = this.chunkViews.get(key) || [];
    return views.filter((v) => !v.settled).length;
  }

  /**
   * Get all unsettled chunks for settlement
   */
  getUnsettledChunks(videoId: string, viewerPubkey?: string): ChunkView[] {
    const key = `${videoId}:${viewerPubkey || "anonymous"}`;
    const views = this.chunkViews.get(key) || [];
    return views.filter((v) => !v.settled);
  }

  /**
   * Check if settlement threshold is reached
   */
  private async checkSettlementThreshold(
    videoId: string,
    viewerPubkey?: string
  ): Promise<void> {
    const unsettledCount = this.getUnsettledChunkCount(videoId, viewerPubkey);

    if (unsettledCount >= this.SETTLEMENT_THRESHOLD) {
      console.log(`🔔 Settlement threshold reached for video ${videoId}`);
      console.log(`   Unsettled chunks: ${unsettledCount}`);

      // Trigger settlement (to be implemented with smart contract)
      // await this.settleChunks(videoId, viewerPubkey);
    }
  }

  /**
   * Settle chunks on blockchain (batch transaction)
   * This will be called periodically or when threshold is reached
   */
  async settleChunks(
    videoId: string,
    viewerPubkey?: string
  ): Promise<{
    success: boolean;
    chunksSettled: number;
    transactionSignature?: string;
  }> {
    try {
      const unsettledChunks = this.getUnsettledChunks(videoId, viewerPubkey);

      if (unsettledChunks.length === 0) {
        return { success: true, chunksSettled: 0 };
      }

      console.log(
        `💰 Settling ${unsettledChunks.length} chunks for video ${videoId}`
      );

      // Get video info for pricing
      const video = await db
        .select()
        .from(videos)
        .where(eq(videos.id, parseInt(videoId)))
        .limit(1);

      if (video.length === 0) {
        throw new Error("Video not found");
      }

      const pricePerChunk = Number(video[0].pricePerChunk) || 1000; // Default 0.001 USDC
      const totalAmount = pricePerChunk * unsettledChunks.length;
      const platformFee = Math.floor(totalAmount * 0.1); // 10% platform fee
      const creatorAmount = totalAmount - platformFee;

      // TODO: Call smart contract settle_session() instruction
      // For now, just simulate settlement
      const mockTxSignature = `settlement_${Date.now()}_${videoId}`;

      // Find or create session
      let session;
      if (viewerPubkey) {
        const sessions = await db
          .select()
          .from(blockchainSessions)
          .where(
            and(
              eq(blockchainSessions.videoId, parseInt(videoId)),
              eq(blockchainSessions.viewerPubkey, viewerPubkey),
              eq(blockchainSessions.isActive, true)
            )
          )
          .limit(1);

        session = sessions[0];
      }

      // Record settlement in database
      if (session) {
        // Create aggregate payment record
        await db.insert(chunkPayments).values({
          sessionId: session.id,
          videoId: parseInt(videoId),
          chunkIndex: unsettledChunks.length, // Total chunks in this settlement
          paymentSequence: session.chunksConsumed + unsettledChunks.length,
          amountPaid: totalAmount,
          platformFee,
          creatorAmount,
          transactionSignature: mockTxSignature,
          viewerPubkey: viewerPubkey || "anonymous",
          creatorPubkey: video[0].creatorPubkey,
          paidAt: new Date(),
        });

        // Update session
        await db
          .update(blockchainSessions)
          .set({
            chunksConsumed: session.chunksConsumed + unsettledChunks.length,
            totalSpent: session.totalSpent + totalAmount,
            lastActivity: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(blockchainSessions.id, session.id));
      }

      // Mark chunks as settled
      const key = `${videoId}:${viewerPubkey || "anonymous"}`;
      const views = this.chunkViews.get(key) || [];
      views.forEach((v) => {
        if (!v.settled) {
          v.settled = true;
        }
      });

      console.log(`✅ Settlement complete: ${unsettledChunks.length} chunks`);
      console.log(`   Transaction: ${mockTxSignature}`);
      console.log(`   Creator amount: ${creatorAmount}`);
      console.log(`   Platform fee: ${platformFee}`);

      return {
        success: true,
        chunksSettled: unsettledChunks.length,
        transactionSignature: mockTxSignature,
      };
    } catch (error: any) {
      console.error("Settlement error:", error);
      return {
        success: false,
        chunksSettled: 0,
      };
    }
  }

  /**
   * Get settlement stats for a video
   */
  async getSettlementStats(
    videoId: string,
    viewerPubkey?: string
  ): Promise<{
    unsettledChunks: number;
    settledChunks: number;
    totalViews: number;
    estimatedSettlementValue: number;
  }> {
    const key = `${videoId}:${viewerPubkey || "anonymous"}`;
    const views = this.chunkViews.get(key) || [];

    const unsettledChunks = views.filter((v) => !v.settled).length;
    const settledChunks = views.filter((v) => v.settled).length;
    const totalViews = views.length;

    // Get video price
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, parseInt(videoId)))
      .limit(1);

    const pricePerChunk =
      video.length > 0 ? Number(video[0].pricePerChunk) : 1000;
    const estimatedSettlementValue = pricePerChunk * unsettledChunks;

    return {
      unsettledChunks,
      settledChunks,
      totalViews,
      estimatedSettlementValue,
    };
  }

  /**
   * Clear settled chunks (cleanup old data)
   */
  clearSettledChunks(videoId: string, viewerPubkey?: string): void {
    const key = `${videoId}:${viewerPubkey || "anonymous"}`;
    const views = this.chunkViews.get(key) || [];

    const unsettledViews = views.filter((v) => !v.settled);
    this.chunkViews.set(key, unsettledViews);

    console.log(`🧹 Cleared settled chunks for ${key}`);
  }
}

// Singleton instance
export const chunkPaymentTracker = new ChunkPaymentTracker();
