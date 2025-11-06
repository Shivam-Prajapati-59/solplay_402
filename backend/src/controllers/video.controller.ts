// =============================================================================
// Video Controller
// =============================================================================
// Handles all video-related business logic including:
// - Local file transcoding
// - URL/IPFS transcoding
// - Video listing
// - HLS streaming
// =============================================================================

import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import { transcodeToHLS } from "../utils/trancrodeToHLS";

// Get directories
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
const hlsDir = path.join(uploadsDir, "hls");
const publicDir = path.join(__dirname, "..", "..", "public");

// =============================================================================
// Transcoding Controllers
// =============================================================================

/**
 * Test IPFS transcoding with Lighthouse gateway
 * Used for quick testing
 */
export const testIpfsTranscode = async (req: Request, res: Response) => {
  try {
    const testUrl =
      "https://gateway.lighthouse.storage/ipfs/bafybeidsezv5tygvlba45gyfkxj4zz6derqlc4crw6ofszaqphhl2yqyqq";
    const videoId = "lighthouse_test_video";
    const outputDir = path.join(hlsDir, videoId);

    // Check if already transcoded (cache check)
    const playlistPath = path.join(outputDir, "output.m3u8");
    if (fs.existsSync(playlistPath)) {
      return res.json({
        success: true,
        message: "Video already transcoded (from cache)",
        videoId,
        playlistUrl: `/api/video/${videoId}/playlist.m3u8`,
        cached: true,
        testUrl,
      });
    }

    console.log(`🧪 Testing IPFS transcoding: ${testUrl}`);

    // Verify URL accessibility before transcoding
    try {
      const headResponse = await axios.head(testUrl, { timeout: 10000 });
      console.log(
        `✅ URL accessible - Content-Type: ${headResponse.headers["content-type"]}`
      );
      console.log(
        `✅ Content-Length: ${headResponse.headers["content-length"]} bytes`
      );
    } catch (err: any) {
      return res.status(400).json({
        error: "URL not accessible",
        details: err.message,
      });
    }

    // Transcode the video
    await transcodeToHLS(testUrl, outputDir);

    res.json({
      success: true,
      message: "IPFS video transcoded successfully!",
      videoId,
      playlistUrl: `/api/video/${videoId}/playlist.m3u8`,
      testUrl,
    });
  } catch (error: any) {
    console.error("❌ Test transcoding error:", error);
    res.status(500).json({
      error: "Transcoding failed",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

/**
 * Transcode video from URL (IPFS, HTTP, HTTPS) to HLS
 * Supports production streaming without downloading entire file
 */
export const transcodeFromUrl = async (req: Request, res: Response) => {
  try {
    const { url, videoId: customVideoId } = req.body;

    // Validate request
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Generate videoId from URL or use custom one
    const videoId =
      customVideoId ||
      url
        .split("/")
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 50) ||
      `ipfs_${Date.now()}`;

    const outputDir = path.join(hlsDir, videoId);

    // Check if already transcoded (cache check)
    const playlistPath = path.join(outputDir, "output.m3u8");
    if (fs.existsSync(playlistPath)) {
      return res.json({
        success: true,
        message: "Video already transcoded",
        videoId,
        playlistUrl: `/api/video/${videoId}/playlist.m3u8`,
        cached: true,
      });
    }

    console.log(`🎬 Transcoding from URL: ${url}`);
    console.log(`📁 Output directory: ${outputDir}`);

    // FFmpeg can directly stream from HTTP(S) URLs including IPFS gateways
    await transcodeToHLS(url, outputDir);

    res.json({
      success: true,
      message: "Transcoding completed",
      videoId,
      playlistUrl: `/api/video/${videoId}/playlist.m3u8`,
      sourceUrl: url,
    });
  } catch (error: any) {
    console.error("Transcoding error:", error);
    res.status(500).json({
      error: "Transcoding failed",
      details: error.message,
    });
  }
};

/**
 * Transcode local video file to HLS
 * Input: Video file from backend/public directory
 */
export const transcodeLocalFile = async (req: Request, res: Response) => {
  try {
    const { videoName } = req.body;

    // Validate request
    if (!videoName) {
      return res.status(400).json({ error: "Video name is required" });
    }

    const inputFile = path.join(publicDir, videoName);

    // Check if file exists
    if (!fs.existsSync(inputFile)) {
      return res.status(404).json({ error: "Video file not found" });
    }

    const videoId = path.parse(videoName).name;
    const outputDir = path.join(hlsDir, videoId);

    // Transcode the video
    await transcodeToHLS(inputFile, outputDir);

    res.json({
      success: true,
      message: "Transcoding completed",
      videoId,
      playlistUrl: `/api/video/${videoId}/playlist.m3u8`,
    });
  } catch (error) {
    console.error("Transcoding error:", error);
    res.status(500).json({ error: "Transcoding failed" });
  }
};

// =============================================================================
// Streaming Controllers
// =============================================================================

/**
 * Serve HLS playlist (.m3u8) files
 * This is the master playlist that contains references to video segments
 */
export const servePlaylist = (req: Request, res: Response) => {
  const { videoId } = req.params;
  const playlistPath = path.join(hlsDir, videoId, "output.m3u8");

  if (!fs.existsSync(playlistPath)) {
    return res.status(404).send("Playlist not found");
  }

  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendFile(playlistPath);
};

/**
 * Serve HLS video segments (.ts) files
 * These are the actual video chunks referenced by the playlist
 */
export const serveSegment = (req: Request, res: Response) => {
  const { videoId, segment } = req.params;
  const segmentPath = path.join(hlsDir, videoId, segment);

  if (!fs.existsSync(segmentPath)) {
    return res.status(404).send("Segment not found");
  }

  res.setHeader("Content-Type", "video/mp2t");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendFile(segmentPath);
};

// =============================================================================
// Video Management Controllers
// =============================================================================

/**
 * List available videos for streaming
 * Returns videos from backend/public directory with transcoding status
 */
export const listVideos = (_req: Request, res: Response) => {
  fs.readdir(publicDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read videos directory" });
    }

    // Filter for video files
    const videoFiles = files.filter(
      (file) =>
        file.endsWith(".mp4") || file.endsWith(".avi") || file.endsWith(".mov")
    );

    // Map video files with transcoding status
    const videos = videoFiles.map((file) => {
      const videoId = path.parse(file).name;
      const hlsPath = path.join(hlsDir, videoId, "output.m3u8");
      const isTranscoded = fs.existsSync(hlsPath);

      return {
        name: file,
        videoId,
        isTranscoded,
        playlistUrl: isTranscoded
          ? `/api/video/${videoId}/playlist.m3u8`
          : null,
      };
    });

    res.json({ videos });
  });
};
