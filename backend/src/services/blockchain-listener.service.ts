// =============================================================================
// Blockchain Event Listener Service
// =============================================================================
// Listens to Solana program logs and syncs events to PostgreSQL
// =============================================================================

import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { db } from "../db";
import {
  videos,
  blockchainSessions,
  chunkPayments,
  settlements,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import { EventEmitter } from "events";
import IDL from "../../../target/idl/solplay_402.json";

// Event types
interface VideoCreatedEvent {
  videoId: string;
  creator: string;
  metadataUri: string;
  pricePerChunk: number;
  totalChunks: number;
  timestamp: number;
}

interface ChunkPaidEvent {
  videoId: string;
  viewer: string;
  chunkIndex: number;
  amount: number;
  timestamp: number;
}

interface VideoUpdatedEvent {
  videoId: string;
  newMetadataUri?: string;
  newPricePerChunk?: number;
  timestamp: number;
}

export class BlockchainListenerService extends EventEmitter {
  private connection: Connection;
  private program: Program<any>;
  private programId: PublicKey;
  private isListening: boolean = false;
  private subscriptionId: number | null = null;
  private lastProcessedSlot: number = 0;

  constructor() {
    super();

    const rpcUrl = process.env.SOLANA_RPC_URL || "http://localhost:8899";
    const programIdStr = process.env.SOLANA_PROGRAM_ID;

    if (!programIdStr) {
      throw new Error("SOLANA_PROGRAM_ID not configured");
    }

    // Don't specify wsEndpoint for localhost - it doesn't support WebSocket
    // For production, use a provider that supports WebSocket (Alchemy, Helius, etc.)
    const connectionConfig: any = {
      commitment: "confirmed",
    };

    // Only add wsEndpoint for non-localhost URLs
    if (!rpcUrl.includes("localhost") && !rpcUrl.includes("127.0.0.1")) {
      connectionConfig.wsEndpoint = rpcUrl.replace("http", "ws");
    }

    this.connection = new Connection(rpcUrl, connectionConfig);

    this.programId = new PublicKey(programIdStr);

    // Initialize program (read-only, no wallet needed for listening)
    const provider = new AnchorProvider(
      this.connection,
      // @ts-ignore - We only need connection for listening
      { publicKey: this.programId },
      { commitment: "confirmed" }
    );

    this.program = new Program(IDL as any, provider);
  }

  /**
   * Start listening to blockchain events
   */
  async start(): Promise<void> {
    if (this.isListening) {
      console.log("Blockchain listener already running");
      return;
    }

    console.log(
      `Starting blockchain listener for program: ${this.programId.toBase58()}`
    );

    const rpcUrl = process.env.SOLANA_RPC_URL || "http://localhost:8899";
    const isLocalhost =
      rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1");

    try {
      // Only use WebSocket subscriptions for non-localhost (production)
      if (!isLocalhost) {
        try {
          // Subscribe to program logs
          this.subscriptionId = this.connection.onLogs(
            this.programId,
            async (logs, context) => {
              try {
                await this.handleLogs(logs, context.slot);
              } catch (error) {
                console.error("Error processing logs:", error);
                this.emit("error", error);
              }
            },
            "confirmed"
          );
          console.log("✅ WebSocket subscription active");
        } catch (wsError) {
          console.warn(
            "WebSocket subscription failed, falling back to polling:",
            wsError
          );
        }
      } else {
        console.log(
          "📊 Using polling mode for localhost (WebSocket not supported)"
        );
      }

      this.isListening = true;
      console.log("✅ Blockchain listener started successfully");
      this.emit("started");

      // Start polling for transactions (works for both localhost and production)
      this.startPolling();
    } catch (error) {
      console.error("Failed to start blockchain listener:", error);
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * Stop listening to blockchain events
   */
  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    console.log("Stopping blockchain listener...");

    if (this.subscriptionId !== null) {
      await this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
    }

    this.isListening = false;
    console.log("✅ Blockchain listener stopped");
    this.emit("stopped");
  }

  /**
   * Handle incoming logs
   */
  private async handleLogs(logs: any, slot: number): Promise<void> {
    if (slot <= this.lastProcessedSlot) {
      return; // Already processed
    }

    console.log(`Processing logs from slot ${slot}:`, logs.signature);

    try {
      // Fetch the full transaction
      const tx = await this.connection.getParsedTransaction(logs.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        console.warn("Transaction not found:", logs.signature);
        return;
      }

      // Parse and process the transaction
      await this.processTransaction(tx, logs.signature);

      this.lastProcessedSlot = slot;
    } catch (error) {
      console.error("Error processing transaction:", error);
      this.emit("error", error);
    }
  }

  /**
   * Process a parsed transaction
   */
  private async processTransaction(
    tx: ParsedTransactionWithMeta,
    signature: string
  ): Promise<void> {
    if (!tx.meta || tx.meta.err) {
      console.log("Transaction failed or has no meta:", signature);
      return;
    }

    // Look for program instructions
    const instructions = tx.transaction.message.instructions;

    for (const instruction of instructions) {
      if (
        "programId" in instruction &&
        instruction.programId.equals(this.programId)
      ) {
        await this.processInstruction(
          instruction as PartiallyDecodedInstruction,
          tx,
          signature
        );
      }
    }
  }

  /**
   * Process a program instruction
   */
  private async processInstruction(
    instruction: PartiallyDecodedInstruction,
    tx: ParsedTransactionWithMeta,
    signature: string
  ): Promise<void> {
    try {
      // Decode instruction data
      const data = instruction.data;

      // First byte is the instruction discriminator
      const discriminator = data[0];

      // Map discriminators to instruction names
      // These should match the order in your Anchor program
      const instructionMap: Record<number, string> = {
        0: "initialize",
        1: "createVideo",
        2: "updateVideo",
        3: "approveDelegate",
        4: "settleSession",
        5: "payForChunk",
        6: "revokeDelegate",
        7: "closeSession",
      };

      const instructionName: string =
        instructionMap[Number(discriminator)] || "unknown";

      if (instructionName === "unknown") {
        console.log("Unknown instruction discriminator:", discriminator);
        return;
      }

      console.log(
        `Processing ${instructionName} instruction from ${signature}`
      );

      // Process based on instruction type
      switch (instructionName) {
        case "createVideo":
          await this.handleVideoCreated(instruction, tx, signature);
          break;

        case "updateVideo":
          await this.handleVideoUpdated(instruction, tx, signature);
          break;

        case "approveDelegate":
          await this.handleDelegateApproved(instruction, tx, signature);
          break;

        case "settleSession":
          await this.handleSettleSession(instruction, tx, signature);
          break;

        case "payForChunk":
          await this.handleChunkPaid(instruction, tx, signature);
          break;

        default:
          console.log(
            `Instruction ${instructionName} does not require database sync`
          );
      }
    } catch (error) {
      console.error("Error processing instruction:", error);
      this.emit("error", error);
    }
  }

  /**
   * Handle VideoCreated event
   */
  private async handleVideoCreated(
    instruction: PartiallyDecodedInstruction,
    tx: ParsedTransactionWithMeta,
    signature: string
  ): Promise<void> {
    try {
      // Extract accounts
      const accounts = instruction.accounts;
      const videoPda = accounts[1]; // Second account is the video PDA
      const creator = accounts[2]; // Third account is the creator

      console.log(
        `Video created: ${videoPda.toBase58()} by ${creator.toBase58()}`
      );

      // Fetch video account data
      const videoAccount: any = await (this.program.account as any).video.fetch(
        videoPda
      );

      const event: VideoCreatedEvent = {
        videoId: videoAccount.videoId,
        creator: videoAccount.creator.toBase58(),
        metadataUri: videoAccount.ipfsHash || "", // Using ipfsHash field
        pricePerChunk:
          (videoAccount.pricePerChunk as BN).toNumber() / 1_000_000,
        totalChunks: videoAccount.totalChunks,
        timestamp: Date.now(),
      };

      // Find matching video in database by blockchain_video_id
      const existingVideos = await db
        .select()
        .from(videos)
        .where(eq(videos.blockchainVideoId, event.videoId))
        .limit(1);

      if (existingVideos.length > 0) {
        // Update with blockchain data
        await db
          .update(videos)
          .set({
            videoPda: videoPda.toBase58(),
            isOnChain: true,
            pricePerChunk: event.pricePerChunk,
            totalChunks: event.totalChunks,
            updatedAt: new Date(),
          })
          .where(eq(videos.id, existingVideos[0].id));

        console.log(`✅ Synced video ${event.videoId} to database`);
        this.emit("videoCreated", event);
      } else {
        console.warn(`Video ${event.videoId} not found in database`);
      }
    } catch (error) {
      console.error("Error handling VideoCreated:", error);
      this.emit("error", error);
    }
  }

  /**
   * Handle VideoUpdated event
   */
  private async handleVideoUpdated(
    instruction: PartiallyDecodedInstruction,
    tx: ParsedTransactionWithMeta,
    signature: string
  ): Promise<void> {
    try {
      const videoPda = instruction.accounts[1];
      const videoAccount: any = await (this.program.account as any).video.fetch(
        videoPda
      );

      const event: VideoUpdatedEvent = {
        videoId: videoAccount.videoId,
        newMetadataUri: videoAccount.ipfsHash || "",
        newPricePerChunk:
          (videoAccount.pricePerChunk as BN).toNumber() / 1_000_000,
        timestamp: Date.now(),
      };

      console.log(`✅ Video updated: ${event.videoId}`);
      this.emit("videoUpdated", event);
    } catch (error) {
      console.error("Error handling VideoUpdated:", error);
    }
  }

  /**
   * Handle DelegateApproved event (streaming session created)
   */
  private async handleDelegateApproved(
    instruction: PartiallyDecodedInstruction,
    tx: ParsedTransactionWithMeta,
    signature: string
  ): Promise<void> {
    try {
      const sessionPda = instruction.accounts[3]; // ViewerSession PDA
      const viewer = instruction.accounts[4];
      const videoPda = instruction.accounts[1];

      // Fetch session data
      const sessionAccount: any = await (
        this.program.account as any
      ).viewerSession.fetch(sessionPda);
      const videoAccount: any = await (this.program.account as any).video.fetch(
        videoPda
      );

      // Find video in database
      const existingVideos = await db
        .select()
        .from(videos)
        .where(eq(videos.blockchainVideoId, videoAccount.videoId))
        .limit(1);

      if (existingVideos.length === 0) {
        console.warn(`Video ${videoAccount.videoId} not found for session`);
        return;
      }

      // Create session record
      await db.insert(blockchainSessions).values({
        videoId: existingVideos[0].id,
        sessionPda: sessionPda.toBase58(),
        viewerPubkey: viewer.toBase58(),
        maxApprovedChunks: sessionAccount.maxApprovedChunks,
        chunksConsumed: sessionAccount.chunksConsumed,
        totalSpent: Number(sessionAccount.totalSpent || 0),
        approvedPricePerChunk: Number(sessionAccount.approvedPricePerChunk),
        sessionStart: new Date(Number(sessionAccount.sessionStart) * 1000),
        lastActivity: new Date(Number(sessionAccount.lastActivity) * 1000),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ Session created: ${sessionPda.toBase58()}`);
      this.emit("sessionCreated", {
        sessionPda: sessionPda.toBase58(),
        viewer: viewer.toBase58(),
        videoId: videoAccount.videoId,
      });
    } catch (error) {
      console.error("Error handling DelegateApproved:", error);
    }
  }

  /**
   * Handle SettleSession event (batch settlement)
   */
  private async handleSettleSession(
    instruction: PartiallyDecodedInstruction,
    tx: ParsedTransactionWithMeta,
    signature: string
  ): Promise<void> {
    try {
      const sessionPda = instruction.accounts[0]; // ViewerSession PDA
      const videoPda = instruction.accounts[1]; // Video PDA
      const viewer = instruction.accounts[7]; // Viewer signer

      // Fetch session and video data
      const sessionAccount: any = await (
        this.program.account as any
      ).viewerSession.fetch(sessionPda);
      const videoAccount: any = await (this.program.account as any).video.fetch(
        videoPda
      );

      // Find session in database
      const sessions = await db
        .select()
        .from(blockchainSessions)
        .where(eq(blockchainSessions.sessionPda, sessionPda.toBase58()))
        .limit(1);

      if (sessions.length === 0) {
        console.warn(`Session ${sessionPda.toBase58()} not found`);
        return;
      }

      const session = sessions[0];

      // Get video for creator info
      const videoData = await db
        .select()
        .from(videos)
        .where(eq(videos.id, session.videoId))
        .limit(1);

      if (videoData.length === 0) {
        console.warn(`Video ${session.videoId} not found`);
        return;
      }

      const video = videoData[0];

      // Calculate settlement details from session state
      const newChunksConsumed = sessionAccount.chunksConsumed;
      const previousChunksConsumed = session.chunksConsumed;
      const chunkCount = newChunksConsumed - previousChunksConsumed;

      const pricePerChunk = Number(sessionAccount.approvedPricePerChunk || 0);
      const totalPayment = chunkCount * pricePerChunk;

      // Calculate platform fee (5% = 500 basis points)
      const platformFee = Math.floor(totalPayment * 0.05);
      const creatorAmount = totalPayment - platformFee;

      const chunksRemaining =
        sessionAccount.maxApprovedChunks - newChunksConsumed;

      // Get block time from transaction
      const blockTime = tx.blockTime
        ? new Date(tx.blockTime * 1000)
        : new Date();

      // Record settlement
      await db.insert(settlements).values({
        sessionId: session.id,
        videoId: video.id,
        chunkCount,
        totalPayment,
        platformFee,
        creatorAmount,
        transactionSignature: signature,
        blockTime,
        slot: Number(tx.slot),
        viewerPubkey: viewer.toBase58(),
        creatorPubkey: video.creatorPubkey,
        chunksConsumedAfter: newChunksConsumed,
        chunksRemaining,
        settlementTimestamp: blockTime,
        createdAt: new Date(),
      });

      // Update session state
      await db
        .update(blockchainSessions)
        .set({
          chunksConsumed: newChunksConsumed,
          totalSpent: Number(sessionAccount.totalSpent || 0),
          lastActivity: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(blockchainSessions.id, session.id));

      console.log(
        `✅ Settlement recorded: ${chunkCount} chunks, signature: ${signature}`
      );
      this.emit("settlementRecorded", {
        sessionPda: sessionPda.toBase58(),
        chunkCount,
        totalPayment,
        signature,
      });
    } catch (error) {
      console.error("Error handling SettleSession:", error);
      this.emit("error", error);
    }
  }

  /**
   * Handle ChunkPaid event
   */
  private async handleChunkPaid(
    instruction: PartiallyDecodedInstruction,
    tx: ParsedTransactionWithMeta,
    signature: string
  ): Promise<void> {
    try {
      const sessionPda = instruction.accounts[2];
      const sessionAccount: any = await (
        this.program.account as any
      ).viewerSession.fetch(sessionPda);

      const event: ChunkPaidEvent = {
        videoId: sessionAccount.video.toBase58(), // This is the video PDA
        viewer: sessionAccount.viewer.toBase58(),
        chunkIndex: sessionAccount.chunksConsumed - 1, // Last consumed chunk
        amount: Number(sessionAccount.approvedPricePerChunk || 0),
        timestamp: Date.now(),
      };

      // Find session in database
      const sessions = await db
        .select()
        .from(blockchainSessions)
        .where(eq(blockchainSessions.sessionPda, sessionPda.toBase58()))
        .limit(1);

      if (sessions.length === 0) {
        console.warn(`Session ${sessionPda.toBase58()} not found`);
        return;
      }

      const session = sessions[0];

      // Get video for creator info
      const videoData = await db
        .select()
        .from(videos)
        .where(eq(videos.id, session.videoId))
        .limit(1);

      if (videoData.length === 0) {
        console.warn(`Video ${session.videoId} not found`);
        return;
      }

      const video = videoData[0];

      // Calculate payment breakdown (90% creator, 10% platform fee)
      const amountPaid = event.amount;
      const platformFee = Math.floor(amountPaid * 0.1);
      const creatorAmount = amountPaid - platformFee;

      // Record chunk payment
      await db.insert(chunkPayments).values({
        sessionId: session.id,
        videoId: video.id,
        chunkIndex: event.chunkIndex,
        paymentSequence: event.chunkIndex,
        amountPaid,
        platformFee,
        creatorAmount,
        transactionSignature: signature,
        viewerPubkey: event.viewer,
        creatorPubkey: video.creatorPubkey,
        paidAt: new Date(),
      });

      // Update session chunks consumed
      await db
        .update(blockchainSessions)
        .set({
          chunksConsumed: sessionAccount.chunksConsumed,
          totalSpent: Number(sessionAccount.totalSpent || 0),
          lastPaidChunkIndex: event.chunkIndex,
          lastActivity: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(blockchainSessions.id, session.id));

      console.log(`✅ Chunk payment recorded: ${event.chunkIndex}`);
      this.emit("chunkPaid", event);
    } catch (error) {
      console.error("Error handling ChunkPaid:", error);
    }
  }

  /**
   * Poll for recent transactions (backup to subscription)
   */
  private startPolling(): void {
    const POLL_INTERVAL = 30000; // 30 seconds

    setInterval(async () => {
      try {
        const signatures = await this.connection.getSignaturesForAddress(
          this.programId,
          { limit: 10 },
          "confirmed"
        );

        for (const sigInfo of signatures) {
          if (sigInfo.err) continue;

          const tx = await this.connection.getParsedTransaction(
            sigInfo.signature,
            {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            }
          );

          if (tx) {
            await this.processTransaction(tx, sigInfo.signature);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, POLL_INTERVAL);
  }

  /**
   * Get service status
   */
  getStatus(): { isListening: boolean; lastProcessedSlot: number } {
    return {
      isListening: this.isListening,
      lastProcessedSlot: this.lastProcessedSlot,
    };
  }
}

// Singleton instance
let listenerInstance: BlockchainListenerService | null = null;

export function getBlockchainListener(): BlockchainListenerService {
  if (!listenerInstance) {
    listenerInstance = new BlockchainListenerService();
  }
  return listenerInstance;
}
