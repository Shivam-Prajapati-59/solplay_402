// =============================================================================
// Video Creation with Blockchain Integration
// =============================================================================
// Handles video upload with both backend database and blockchain registration
// =============================================================================

import apiClient from "./api-client";
import { BlockchainService } from "@/lib/anchor/blockchain-service";

export interface VideoUploadData {
  title: string;
  description: string;
  tags: string[];
  pubkey: string;
  CID: string; // IPFS hash
  thumbnail?: string;
  price: string; // Price in USD (e.g., "$0.001")
}

export interface BlockchainVideoData {
  videoId: string; // Unique blockchain ID
  ipfsHash: string;
  totalChunks: number;
  pricePerChunk: number; // In tokens (e.g., 0.001)
  title: string;
  description: string;
}

/**
 * Create video in database only (no blockchain)
 */
export const createVideoInDatabase = async (data: VideoUploadData) => {
  try {
    const response = await apiClient.post("/api/videos/create", {
      title: data.title,
      description: data.description,
      tags: data.tags,
      creatorPubkey: data.pubkey,
      ipfsCid: data.CID,
      thumbnailUrl: data.thumbnail,
      price: parseFloat(data.price.replace("$", "")),
      status: "processing", // Backend will transcode
    });

    return {
      success: true,
      video: response.data,
    };
  } catch (error: any) {
    console.error("Database video creation error:", error);
    return {
      success: false,
      error:
        error.response?.data?.error ||
        error.message ||
        "Failed to create video",
    };
  }
};

/**
 * Register video on blockchain after database creation
 */
export const registerVideoOnBlockchain = async (
  blockchainService: BlockchainService,
  videoData: BlockchainVideoData
) => {
  try {
    const result = await blockchainService.createVideo({
      videoId: videoData.videoId,
      ipfsHash: videoData.ipfsHash,
      totalChunks: videoData.totalChunks,
      pricePerChunk: videoData.pricePerChunk,
      title: videoData.title,
      description: videoData.description,
    });

    return {
      success: true,
      ...result,
    };
  } catch (error: any) {
    console.error("Blockchain registration error:", error);
    return {
      success: false,
      error: error.message || "Failed to register video on blockchain",
    };
  }
};

/**
 * Update video in database with blockchain info
 */
export const updateVideoWithBlockchainData = async (
  videoId: number,
  blockchainData: {
    blockchainVideoId: string;
    videoPda: string;
    creatorEarningsPda: string;
    totalChunks: number;
    pricePerChunk: number;
    signature: string;
  }
) => {
  try {
    const response = await apiClient.put(`/api/videos/${videoId}/blockchain`, {
      blockchainVideoId: blockchainData.blockchainVideoId,
      videoPda: blockchainData.videoPda,
      creatorEarningsPda: blockchainData.creatorEarningsPda,
      totalChunks: blockchainData.totalChunks,
      pricePerChunk: blockchainData.pricePerChunk,
      isOnChain: true,
      onChainCreatedAt: new Date().toISOString(),
      transactionSignature: blockchainData.signature,
    });

    return {
      success: true,
      video: response.data,
    };
  } catch (error: any) {
    console.error("Database update error:", error);
    return {
      success: false,
      error:
        error.response?.data?.error ||
        error.message ||
        "Failed to update video with blockchain data",
    };
  }
};

/**
 * Complete video creation flow: Database → Blockchain → Update Database
 */
export const createNewVideo = async (
  data: VideoUploadData,
  blockchainService?: BlockchainService,
  options?: {
    totalChunks?: number; // Will be calculated from HLS transcoding
    pricePerChunk?: number; // Default price per chunk in tokens
  }
) => {
  try {
    // Step 1: Create video in database
    console.log("📝 Step 1: Creating video in database...");
    const dbResult = await createVideoInDatabase(data);

    if (!dbResult.success) {
      throw new Error(dbResult.error);
    }

    const video = dbResult.video;
    console.log("✅ Video created in database:", video.id);

    // Step 2: Register on blockchain (if service provided)
    if (blockchainService && blockchainService) {
      console.log("🔗 Step 2: Registering video on blockchain...");

      // Generate unique blockchain video ID
      const blockchainVideoId = `video_${video.id}_${Date.now()}`;

      // Calculate price per chunk (e.g., if total price is $0.10 for 100 chunks = $0.001/chunk)
      const totalPrice = parseFloat(data.price.replace("$", ""));
      const totalChunks = options?.totalChunks || 100; // Default to 100 chunks
      const pricePerChunk = options?.pricePerChunk || totalPrice / totalChunks;

      const blockchainResult = await registerVideoOnBlockchain(
        blockchainService,
        {
          videoId: blockchainVideoId,
          ipfsHash: data.CID,
          totalChunks,
          pricePerChunk,
          title: data.title,
          description: data.description,
        }
      );

      if (blockchainResult.success && "videoPda" in blockchainResult) {
        console.log("✅ Video registered on blockchain");
        console.log("   Video PDA:", blockchainResult.videoPda);
        console.log("   Transaction:", blockchainResult.signature);

        // Step 3: Update database with blockchain info
        console.log("📝 Step 3: Updating database with blockchain info...");
        await updateVideoWithBlockchainData(video.id, {
          blockchainVideoId,
          videoPda: blockchainResult.videoPda,
          creatorEarningsPda: blockchainResult.creatorEarningsPda,
          totalChunks,
          pricePerChunk,
          signature: blockchainResult.signature,
        });

        console.log("✅ Database updated with blockchain data");

        return {
          success: true,
          video,
          blockchain: {
            registered: true,
            videoPda: blockchainResult.videoPda,
            signature: blockchainResult.signature,
          },
        };
      } else {
        // Blockchain registration failed, but video is in database
        console.warn(
          "⚠️ Blockchain registration failed:",
          blockchainResult.error
        );
        console.warn("   Video saved in database but not on blockchain");

        return {
          success: true,
          video,
          blockchain: {
            registered: false,
            error: blockchainResult.error,
          },
          warning: "Video saved but not registered on blockchain",
        };
      }
    }

    // No blockchain service provided - database only
    return {
      success: true,
      video,
      blockchain: {
        registered: false,
        reason: "Blockchain service not initialized",
      },
    };
  } catch (error: any) {
    console.error("Video creation error:", error);
    return {
      success: false,
      error: error.message || "Failed to create video",
    };
  }
};

export default {
  createNewVideo,
  createVideoInDatabase,
  registerVideoOnBlockchain,
  updateVideoWithBlockchainData,
};
