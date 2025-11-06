// =============================================================================
// HLS Transcoding Utility
// =============================================================================
// Purpose: Convert video files and URLs to HLS (HTTP Live Streaming) format
// Supports: Local files, HTTP/HTTPS URLs, IPFS gateways
// Output: M3U8 playlist + TS segments
// =============================================================================

import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

// =============================================================================
// FFmpeg Configuration
// =============================================================================

/**
 * Initialize system FFmpeg paths
 * Using system FFmpeg (v7.1.1+) instead of npm package for better stability
 */
const systemFFmpegPath = execSync("which ffmpeg", { encoding: "utf8" }).trim();
const systemFFprobePath = execSync("which ffprobe", {
  encoding: "utf8",
}).trim();

console.log(`🔧 Using system FFmpeg: ${systemFFmpegPath}`);
console.log(`🔧 Using system FFprobe: ${systemFFprobePath}`);

ffmpeg.setFfmpegPath(systemFFmpegPath);
ffmpeg.setFfprobePath(systemFFprobePath);

// =============================================================================
// Main Transcoding Function
// =============================================================================

/**
 * Transcode video to HLS format
 * @param inputFile - Local file path or HTTP(S) URL (including IPFS gateways)
 * @param outputDir - Directory to store HLS output (playlist + segments)
 * @returns Promise<void>
 */
export const transcodeToHLS = async (
  inputFile: string,
  outputDir: string
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // -------------------------------------------------------------------------
    // Setup Output Directory
    // -------------------------------------------------------------------------
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // -------------------------------------------------------------------------
    // Input Source Detection
    // -------------------------------------------------------------------------
    const outputPlaylist = path.join(outputDir, "output.m3u8");
    const isUrl =
      inputFile.startsWith("http://") || inputFile.startsWith("https://");

    console.log(`🎬 Starting transcoding...`);
    console.log(
      `📥 Input: ${isUrl ? "URL (streaming)" : "File"} - ${inputFile}`
    );
    console.log(`📤 Output: ${outputPlaylist}`);

    // -------------------------------------------------------------------------
    // FFmpeg Command Configuration
    // -------------------------------------------------------------------------
    const ffmpegCommand = ffmpeg(inputFile);

    // Configure input options for URL streaming (IPFS, HTTP, HTTPS)
    if (isUrl) {
      ffmpegCommand.inputOptions([
        "-protocol_whitelist",
        "file,http,https,tcp,tls,crypto",
        "-timeout",
        "30000000", // 30 second timeout
        "-user_agent",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ]);
    }

    // -------------------------------------------------------------------------
    // Output Options & Format Configuration
    // -------------------------------------------------------------------------
    ffmpegCommand
      .outputOptions([
        // Video codec settings
        "-c:v",
        "libx264", // H.264 video codec
        "-preset",
        "veryfast", // Fast encoding preset
        "-crf",
        "23", // Constant Rate Factor (quality: 0-51, lower = better)

        // Audio codec settings
        "-c:a",
        "aac", // AAC audio codec
        "-b:a",
        "128k", // Audio bitrate

        // HLS specific settings
        "-hls_time",
        "10", // 10-second segments
        "-hls_list_size",
        "0", // Include all segments in playlist
        "-hls_segment_filename",
        path.join(outputDir, "segment%03d.ts"),
        "-f",
        "hls", // Output format: HLS
      ])
      .output(outputPlaylist)

      // -------------------------------------------------------------------------
      // Event Handlers
      // -------------------------------------------------------------------------
      .on("start", (commandLine) => {
        console.log("🚀 FFmpeg command:");
        console.log(commandLine);
      })

      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`⏳ Progress: ${Math.round(progress.percent)}%`);
        } else if (progress.timemark) {
          console.log(`⏳ Processing: ${progress.timemark}`);
        }
      })

      .on("stderr", (stderrLine) => {
        // Log important stderr lines for debugging
        if (stderrLine.includes("error") || stderrLine.includes("Error")) {
          console.error(`⚠️ FFmpeg stderr: ${stderrLine}`);
        }
      })

      .on("end", () => {
        console.log("✅ Transcoding complete!");
        console.log(`📦 Output: ${outputPlaylist}`);

        // Verify output files exist
        if (fs.existsSync(outputPlaylist)) {
          const segments = fs
            .readdirSync(outputDir)
            .filter((f) => f.endsWith(".ts"));
          console.log(`📊 Generated ${segments.length} segments`);
        }

        resolve();
      })

      .on("error", (err: any, stdout, stderr) => {
        console.error("❌ Transcoding error:", err.message);
        console.error("❌ Error code:", err.code);
        console.error("❌ Signal:", err.signal);

        // Log full stderr for debugging
        if (stderr) {
          console.error("📋 FFmpeg stderr (last 50 lines):");
          const lines = stderr.split("\n");
          console.error(lines.slice(-50).join("\n"));
        }

        // SIGSEGV debugging information
        if (err.message.includes("SIGSEGV")) {
          console.error("💡 SIGSEGV detected - this usually means:");
          console.error(
            "  1. FFmpeg binary issue (trying system FFmpeg should fix)"
          );
          console.error("  2. Incompatible codec or format");
          console.error("  3. Memory corruption");
          console.error(
            `  4. Check if URL is accessible: curl -I "${inputFile}"`
          );
        }

        reject(err);
      })

      .run();
  });
};
