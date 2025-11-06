// =============================================================================
// Video Routes
// =============================================================================
// Defines all video-related API routes
// =============================================================================

import { Router } from "express";
import {
  testIpfsTranscode,
  transcodeFromUrl,
  transcodeLocalFile,
  servePlaylist,
  serveSegment,
  listVideos,
} from "../controllers/video.controller";

const router = Router();

// =============================================================================
// Transcoding Routes
// =============================================================================

/**
 * POST /api/test-ipfs
 * Test IPFS transcoding with Lighthouse gateway
 */
router.post("/test-ipfs", testIpfsTranscode);

/**
 * POST /api/transcode-url
 * Transcode video from URL (IPFS, HTTP, HTTPS)
 */
router.post("/transcode-url", transcodeFromUrl);

/**
 * POST /api/transcode
 * Transcode local video file
 */
router.post("/transcode", transcodeLocalFile);

// =============================================================================
// Streaming Routes
// =============================================================================

/**
 * GET /api/video/:videoId/playlist.m3u8
 * Serve HLS playlist
 */
router.get("/video/:videoId/playlist.m3u8", servePlaylist);

/**
 * GET /api/video/:videoId/:segment
 * Serve HLS video segments
 */
router.get("/video/:videoId/:segment", serveSegment);

// =============================================================================
// Video Management Routes
// =============================================================================

/**
 * GET /api/videos
 * List available videos
 */
router.get("/videos", listVideos);

export default router;
