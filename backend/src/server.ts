import dotenv from "dotenv";
import app from "./app";
import { getBlockchainListener } from "./services/blockchain-listener.service";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Start blockchain listener if enabled
const startBlockchainListener = async () => {
  const enableListener = process.env.ENABLE_BLOCKCHAIN_LISTENER !== "false";

  if (!enableListener) {
    console.log("⏭️  Blockchain listener disabled");
    return;
  }

  if (!process.env.SOLANA_PROGRAM_ID) {
    console.warn(
      "⚠️  SOLANA_PROGRAM_ID not configured - blockchain listener disabled"
    );
    return;
  }

  try {
    const listener = getBlockchainListener();

    // Set up event handlers
    listener.on("started", () => {
      console.log("✅ Blockchain listener active and syncing events");
    });

    listener.on("videoCreated", (event) => {
      console.log(`📹 Video created on blockchain: ${event.videoId}`);
    });

    listener.on("sessionCreated", (event) => {
      console.log(`🎬 Streaming session created: ${event.sessionPda}`);
    });

    listener.on("chunkPaid", (event) => {
      console.log(`💰 Chunk payment processed: ${event.chunkIndex}`);
    });

    listener.on("error", (error) => {
      console.error("❌ Blockchain listener error:", error.message);
    });

    // Start listening
    await listener.start();
  } catch (error: any) {
    console.error("❌ Failed to start blockchain listener:", error.message);
    console.log("⏭️  Server will continue without blockchain sync");
  }
};

app.listen(PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);

  // Start blockchain listener after server starts
  await startBlockchainListener();
});
