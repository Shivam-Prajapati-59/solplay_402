// =============================================================================
// Health Controller
// =============================================================================
// Handles health check and API information endpoints
// =============================================================================

import { Request, Response } from "express";

/**
 * Root endpoint - API welcome message
 */
export const welcome = (_req: Request, res: Response) => {
  res.send("Welcome to x402 Video API Backend!");
};

/**
 * Health check endpoint - API status and available endpoints
 */
export const healthCheck = (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    endpoints: {
      videos: "GET /api/videos",
      transcode: "POST /api/transcode",
      transcodeUrl: "POST /api/transcode-url",
      testIpfs: "POST /api/test-ipfs",
      stream: "GET /api/video/:videoId/playlist.m3u8",
      segment: "GET /api/video/:videoId/:segment",
    },
  });
};
