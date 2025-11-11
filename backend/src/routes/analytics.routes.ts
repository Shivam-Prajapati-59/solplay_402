// =============================================================================
// Analytics Routes
// =============================================================================
// Routes for creator and viewer analytics
// =============================================================================

import { Router } from "express";
import {
  getCreatorAnalytics,
  getVideoAnalytics,
  getViewerAnalytics,
} from "../controllers/analytics.controller";

const router = Router();

// Get creator analytics
// GET /api/analytics/creator/:creatorPubkey?timeRange=30d
router.get("/creator/:creatorPubkey", getCreatorAnalytics);

// Get video analytics
// GET /api/analytics/video/:videoId?timeRange=30d
router.get("/video/:videoId", getVideoAnalytics);

// Get viewer analytics
// GET /api/analytics/viewer/:viewerPubkey?timeRange=30d
router.get("/viewer/:viewerPubkey", getViewerAnalytics);

export default router;
