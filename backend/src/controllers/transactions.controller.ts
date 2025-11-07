// =============================================================================
// Transactions Controller
// =============================================================================
// Handles payment transactions and revenue tracking
// =============================================================================

import { Request, Response } from "express";
import { db } from "../db";
import { transactions, videos, users } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// =============================================================================
// Transaction Operations
// =============================================================================

/**
 * Create a new transaction
 * POST /api/transactions
 */
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const {
      videoId,
      buyerPubkey,
      creatorPubkey,
      amount,
      currency,
      transactionSignature,
      network,
    } = req.body;

    if (!videoId || !buyerPubkey || !creatorPubkey || !amount) {
      return res.status(400).json({
        error:
          "Missing required fields: videoId, buyerPubkey, creatorPubkey, amount",
      });
    }

    // Check if video exists
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (video.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Create transaction
    const newTransaction = await db
      .insert(transactions)
      .values({
        videoId,
        buyerPubkey,
        creatorPubkey,
        amount,
        currency: currency || "USDC",
        transactionSignature: transactionSignature || null,
        network: network || "solana-devnet",
        status: "pending",
      })
      .returning();

    res.status(201).json({
      success: true,
      transaction: newTransaction[0],
      message: "Transaction created successfully",
    });
  } catch (error: any) {
    console.error("Create transaction error:", error);
    res.status(500).json({
      error: "Failed to create transaction",
      details: error.message,
    });
  }
};

/**
 * Confirm a transaction
 * PUT /api/transactions/:id/confirm
 */
export const confirmTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transactionSignature } = req.body;

    // Get transaction
    const transaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, Number(id)))
      .limit(1);

    if (transaction.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (transaction[0].status === "confirmed") {
      return res.status(400).json({ error: "Transaction already confirmed" });
    }

    // Update transaction
    const updatedTransaction = await db
      .update(transactions)
      .set({
        status: "confirmed",
        transactionSignature:
          transactionSignature || transaction[0].transactionSignature,
        confirmedAt: new Date(),
      })
      .where(eq(transactions.id, Number(id)))
      .returning();

    res.json({
      success: true,
      transaction: updatedTransaction[0],
      message: "Transaction confirmed successfully",
    });
  } catch (error: any) {
    console.error("Confirm transaction error:", error);
    res.status(500).json({
      error: "Failed to confirm transaction",
      details: error.message,
    });
  }
};

/**
 * Fail a transaction
 * PUT /api/transactions/:id/fail
 */
export const failTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get transaction
    const transaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, Number(id)))
      .limit(1);

    if (transaction.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Update transaction
    const updatedTransaction = await db
      .update(transactions)
      .set({
        status: "failed",
      })
      .where(eq(transactions.id, Number(id)))
      .returning();

    res.json({
      success: true,
      transaction: updatedTransaction[0],
      message: "Transaction marked as failed",
    });
  } catch (error: any) {
    console.error("Fail transaction error:", error);
    res.status(500).json({
      error: "Failed to update transaction",
      details: error.message,
    });
  }
};

/**
 * Get transaction by ID
 * GET /api/transactions/:id
 */
export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, Number(id)))
      .limit(1);

    if (transaction.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Get video info
    const video = await db
      .select({
        id: videos.id,
        title: videos.title,
        thumbnailUrl: videos.thumbnailUrl,
        price: videos.price,
      })
      .from(videos)
      .where(eq(videos.id, transaction[0].videoId))
      .limit(1);

    res.json({
      success: true,
      transaction: {
        ...transaction[0],
        video: video[0] || null,
      },
    });
  } catch (error: any) {
    console.error("Get transaction error:", error);
    res.status(500).json({
      error: "Failed to get transaction",
      details: error.message,
    });
  }
};

/**
 * Get user's purchase history
 * GET /api/users/:pubkey/purchases
 */
export const getUserPurchases = async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build query with status filter
    const whereConditions = status
      ? and(
          eq(transactions.buyerPubkey, pubkey),
          eq(transactions.status, status as any)
        )
      : eq(transactions.buyerPubkey, pubkey);

    const userTransactions = await db
      .select()
      .from(transactions)
      .where(whereConditions)
      .orderBy(desc(transactions.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Get video info for each transaction
    const transactionsWithVideos = await Promise.all(
      userTransactions.map(async (transaction) => {
        const video = await db
          .select({
            id: videos.id,
            title: videos.title,
            thumbnailUrl: videos.thumbnailUrl,
            creatorPubkey: videos.creatorPubkey,
          })
          .from(videos)
          .where(eq(videos.id, transaction.videoId))
          .limit(1);

        // Get creator info
        let creator = null;
        if (video.length > 0) {
          const creatorData = await db
            .select({
              pubkey: users.pubkey,
              accountName: users.accountName,
            })
            .from(users)
            .where(eq(users.pubkey, video[0].creatorPubkey))
            .limit(1);
          creator = creatorData[0] || null;
        }

        return {
          ...transaction,
          video: video[0] || null,
          creator,
        };
      })
    );

    res.json({
      success: true,
      transactions: transactionsWithVideos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: userTransactions.length,
      },
    });
  } catch (error: any) {
    console.error("Get user purchases error:", error);
    res.status(500).json({
      error: "Failed to get user purchases",
      details: error.message,
    });
  }
};

/**
 * Get creator's earnings
 * GET /api/users/:pubkey/earnings
 */
export const getCreatorEarnings = async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Get all transactions for creator
    const creatorTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.creatorPubkey, pubkey))
      .orderBy(desc(transactions.createdAt))
      .limit(Number(limit))
      .offset(offset);

    // Calculate earnings
    const totalEarnings = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.creatorPubkey, pubkey),
          eq(transactions.status, "confirmed")
        )
      );

    const pendingEarnings = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.creatorPubkey, pubkey),
          eq(transactions.status, "pending")
        )
      );

    // Get video info for each transaction
    const transactionsWithVideos = await Promise.all(
      creatorTransactions.map(async (transaction) => {
        const video = await db
          .select({
            id: videos.id,
            title: videos.title,
            thumbnailUrl: videos.thumbnailUrl,
          })
          .from(videos)
          .where(eq(videos.id, transaction.videoId))
          .limit(1);

        // Get buyer info
        const buyer = await db
          .select({
            pubkey: users.pubkey,
            accountName: users.accountName,
          })
          .from(users)
          .where(eq(users.pubkey, transaction.buyerPubkey))
          .limit(1);

        return {
          ...transaction,
          video: video[0] || null,
          buyer: buyer[0] || null,
        };
      })
    );

    res.json({
      success: true,
      earnings: {
        total: totalEarnings[0].total,
        pending: pendingEarnings[0].total,
        confirmed: totalEarnings[0].total,
      },
      transactions: transactionsWithVideos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: creatorTransactions.length,
      },
    });
  } catch (error: any) {
    console.error("Get creator earnings error:", error);
    res.status(500).json({
      error: "Failed to get creator earnings",
      details: error.message,
    });
  }
};

/**
 * Get video revenue
 * GET /api/videos/:id/revenue
 */
export const getVideoRevenue = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if video exists
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, Number(id)))
      .limit(1);

    if (video.length === 0) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Get all transactions for video
    const videoTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.videoId, Number(id)));

    // Calculate revenue
    const totalRevenue = videoTransactions
      .filter((t) => t.status === "confirmed")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const pendingRevenue = videoTransactions
      .filter((t) => t.status === "pending")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalSales = videoTransactions.filter(
      (t) => t.status === "confirmed"
    ).length;

    res.json({
      success: true,
      revenue: {
        total: totalRevenue.toFixed(2),
        pending: pendingRevenue.toFixed(2),
        confirmed: totalRevenue.toFixed(2),
        totalSales,
        avgSalePrice:
          totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : "0.00",
      },
    });
  } catch (error: any) {
    console.error("Get video revenue error:", error);
    res.status(500).json({
      error: "Failed to get video revenue",
      details: error.message,
    });
  }
};

/**
 * Check if user has purchased a video
 * GET /api/videos/:id/check-purchase
 */
export const checkVideoPurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userPubkey } = req.query;

    if (!userPubkey) {
      return res.status(400).json({ error: "User pubkey is required" });
    }

    // Check for confirmed transaction
    const purchase = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.videoId, Number(id)),
          eq(transactions.buyerPubkey, userPubkey as string),
          eq(transactions.status, "confirmed")
        )
      )
      .limit(1);

    res.json({
      success: true,
      hasPurchased: purchase.length > 0,
      transaction: purchase[0] || null,
    });
  } catch (error: any) {
    console.error("Check purchase error:", error);
    res.status(500).json({
      error: "Failed to check purchase",
      details: error.message,
    });
  }
};
