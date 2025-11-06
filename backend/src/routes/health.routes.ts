// =============================================================================
// Health Routes
// =============================================================================
// Defines health check and info routes
// =============================================================================

import { Router } from "express";
import { welcome, healthCheck } from "../controllers/health.controller";

const router = Router();

/**
 * GET /
 * Root endpoint
 */
router.get("/", welcome);

/**
 * GET /health
 * Health check endpoint
 */
router.get("/health", healthCheck);

export default router;
