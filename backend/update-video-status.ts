import { db } from "./src/db/index";
import { videos } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function updateVideoStatus() {
  try {
    console.log("🔄 Updating video status from 'processing' to 'ready'...");

    const result = await db
      .update(videos)
      .set({ status: "ready" })
      .where(eq(videos.status, "processing"))
      .returning();

    console.log(`✅ Updated ${result.length} videos to 'ready' status`);

    // Show all videos
    const allVideos = await db.select().from(videos);
    console.log("\n📹 All videos in database:");
    allVideos.forEach((video) => {
      console.log(
        `  - ${video.title} (ID: ${video.id}, Status: ${video.status})`
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating videos:", error);
    process.exit(1);
  }
}

updateVideoStatus();
