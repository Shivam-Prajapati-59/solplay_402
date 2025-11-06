// =============================================================================
// Main Routes Index
// =============================================================================
// Combines all route modules
// =============================================================================

import { Router } from "express";
import healthRoutes from "./health.routes";
import videoRoutes from "./video.routes";

const router = Router();

// Health routes (/, /health)
router.use("/", healthRoutes);

// Video API routes (/api/*)
router.use("/api", videoRoutes);

export default router;
