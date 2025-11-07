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

const router = Router();

// =============================================================================
// Health Routes
// =============================================================================
// Health check endpoints (/, /health)
router.use("/", healthRoutes);

// =============================================================================
// API Routes
// =============================================================================

// Video streaming routes (legacy HLS streaming)
router.use("/api", videoRoutes);

// User management routes (/api/users/*)
router.use("/api/users", userRoutes);

// Video management routes (/api/videos/*)
router.use("/api/videos", videoManagementRoutes);

// Like/unlike routes (/api/likes/*)
router.use("/api/likes", likesRoutes);

// Comment routes (/api/comments/*)
router.use("/api/comments", commentsRoutes);

// Play tracking & analytics routes (/api/plays/*)
router.use("/api/plays", playsRoutes);

// Transaction & revenue routes (/api/transactions/*)
router.use("/api/transactions", transactionsRoutes);

export default router;
