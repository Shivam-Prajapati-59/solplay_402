// =============================================================================
// Main Routes Index
// =============================================================================
// Combines all route modules
// =============================================================================

import { Router } from "express";
import healthRoutes from "./health.routes";
import videoRoutes from "./video.routes";
import userRoutes from "./user.routes";
import videoManagementRoutes from "./videoManagement.routes";
import likesRoutes from "./likes.routes";
import commentsRoutes from "./comments.routes";
import playsRoutes from "./plays.routes";
import transactionsRoutes from "./transactions.routes";
import blockchainRoutes from "./blockchain.routes";
import x402PaymentRoutes from "./x402-payment.routes";
import settlementsRoutes from "./settlements.routes";
import analyticsRoutes from "./analytics.routes";

const router = Router();

// =============================================================================
// Health Routes
// =============================================================================
// Health check endpoints (/, /health)
router.use("/", healthRoutes);

// =============================================================================
// API Routes
// =============================================================================
// NOTE: Order matters! Specific routes MUST come before catch-all routes
// NOTE: These routes are already prefixed with /api in app.ts, so don't add /api here

// User management routes (/api/users/*)
router.use("/users", userRoutes);

// Video management routes (/api/videos/*) - MUST come before generic video routes
router.use("/videos", videoManagementRoutes);

// Like/unlike routes (/api/likes/*)
router.use("/likes", likesRoutes);

// Comment routes (/api/comments/*)
router.use("/comments", commentsRoutes);

// Play tracking & analytics routes (/api/plays/*)
router.use("/plays", playsRoutes);

// Transaction & revenue routes (/api/transactions/*)
router.use("/transactions", transactionsRoutes);

// Blockchain integration routes (/api/blockchain/*)
router.use("/blockchain", blockchainRoutes);

// Settlement history routes (/api/settlements/*)
router.use("/settlements", settlementsRoutes);

// Analytics routes (/api/analytics/*)
router.use("/analytics", analyticsRoutes);

// x402 payment tracking routes (/api/x402/*)
router.use("/x402", x402PaymentRoutes);

// Video streaming routes (legacy HLS streaming) - These have no prefix, so they get /api directly
router.use("/", videoRoutes);

export default router;
