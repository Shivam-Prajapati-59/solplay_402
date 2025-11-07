// =============================================================================
// Transactions Routes
// =============================================================================
// API routes for payment tracking and revenue analytics
// =============================================================================

import { Router } from "express";
import {
  createTransaction,
  confirmTransaction,
  failTransaction,
  getTransactionById,
  getUserPurchases,
  getCreatorEarnings,
  getVideoRevenue,
  checkVideoPurchase,
} from "../controllers/transactions.controller";

const router = Router();

// =============================================================================
// Transaction Operations
// =============================================================================

/**
 * POST /api/transactions
 * Create a new transaction
 * Body: { videoId, buyerPubkey, creatorPubkey, amount, signature }
 */
router.post("/", createTransaction);

/**
 * PUT /api/transactions/:id/confirm
 * Confirm a transaction
 */
router.put("/:id/confirm", confirmTransaction);

/**
 * PUT /api/transactions/:id/fail
 * Mark transaction as failed
 * Body: { reason? }
 */
router.put("/:id/fail", failTransaction);

// =============================================================================
// Transaction Queries
// =============================================================================

/**
 * GET /api/transactions/:id
 * Get transaction by ID
 */
router.get("/:id", getTransactionById);

/**
 * GET /api/transactions/purchases/:pubkey
 * Get user's purchase history
 */
router.get("/purchases/:pubkey", getUserPurchases);

/**
 * GET /api/transactions/earnings/:pubkey
 * Get creator's earnings
 */
router.get("/earnings/:pubkey", getCreatorEarnings);

/**
 * GET /api/transactions/revenue/:videoId
 * Get video revenue
 */
router.get("/revenue/:videoId", getVideoRevenue);

/**
 * GET /api/transactions/check-purchase
 * Check if user purchased a video
 * Query: userPubkey, videoId
 */
router.get("/check-purchase", checkVideoPurchase);

export default router;
