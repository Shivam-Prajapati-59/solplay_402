import { getVideoById } from "../frontend/data/video.api";

async function main() {
  const videoId = "4";
  console.log("📹 Fetching video data for ID:", videoId);
  
  try {
    const video = await getVideoById(videoId);
    console.log("\n✅ Video data:", JSON.stringify(video, null, 2));
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
