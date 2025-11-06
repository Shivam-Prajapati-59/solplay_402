// =============================================================================
// Directory Setup Utility
// =============================================================================
// Creates necessary directories for video uploads and HLS output
// =============================================================================

import path from "path";
import fs from "fs";

/**
 * Initialize required directories
 * Creates uploads/hls directory structure if it doesn't exist
 */
export const initializeDirectories = () => {
  const uploadsDir = path.join(__dirname, "..", "..", "uploads");
  const hlsDir = path.join(uploadsDir, "hls");

  if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir, { recursive: true });
    console.log("✅ Created HLS directory:", hlsDir);
  } else {
    console.log("✅ HLS directory already exists:", hlsDir);
  }
};
