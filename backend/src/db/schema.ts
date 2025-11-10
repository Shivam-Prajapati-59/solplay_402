import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  decimal,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

// =============================================================================
// Enums
// =============================================================================

export const videoStatusEnum = pgEnum("video_status", [
  "processing",
  "ready",
  "failed",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "confirmed",
  "failed",
]);

// =============================================================================
// Users Table
// =============================================================================

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    pubkey: varchar("pubkey", { length: 500 }).notNull().unique(),
    accountName: varchar("account_name", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      pubkeyIdx: index("users_pubkey_idx").on(table.pubkey),
    };
  }
);

// =============================================================================
// Videos Table
// =============================================================================

export const videos = pgTable(
  "videos",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    tags: varchar("tags", { length: 50 }).array(),
    category: varchar("category", { length: 50 }),

    // Creator info
    creatorPubkey: varchar("creator_pubkey", { length: 500 })
      .notNull()
      .references(() => users.pubkey, { onDelete: "cascade" }),

    // IPFS & Storage
    ipfsCid: varchar("ipfs_cid", { length: 500 }).notNull(),
    thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
    hlsPlaylistUrl: varchar("hls_playlist_url", { length: 500 }),

    // Blockchain Integration
    blockchainVideoId: varchar("blockchain_video_id", { length: 100 }), // Unique ID used on-chain
    videoPda: varchar("video_pda", { length: 500 }), // Video PDA address
    creatorEarningsPda: varchar("creator_earnings_pda", { length: 500 }), // Creator earnings PDA
    totalChunks: integer("total_chunks"), // Total HLS chunks (for blockchain)
    pricePerChunk: bigint("price_per_chunk", { mode: "number" }), // Price per chunk in tokens (smallest unit)
    isOnChain: boolean("is_on_chain").default(false).notNull(), // Whether registered on blockchain
    onChainCreatedAt: timestamp("on_chain_created_at"), // When registered on blockchain

    // Video metadata
    duration: integer("duration"), // Duration in seconds
    videoSize: bigint("video_size", { mode: "number" }), // Size in bytes
    videoFormat: varchar("video_format", { length: 20 }), // mp4, webm, etc.
    videoResolution: varchar("video_resolution", { length: 20 }), // 720p, 1080p, 4K

    // Monetization
    price: decimal("price", { precision: 10, scale: 2 })
      .default("0.001")
      .notNull(), // Price in USD

    // Status & Visibility
    status: videoStatusEnum("status").default("processing").notNull(),
    isPublic: boolean("is_public").default(true).notNull(),

    // Statistics (cached for performance)
    viewCount: integer("view_count").default(0).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      creatorIdx: index("videos_creator_idx").on(table.creatorPubkey),
      statusIdx: index("videos_status_idx").on(table.status),
      createdAtIdx: index("videos_created_at_idx").on(table.createdAt),
      categoryIdx: index("videos_category_idx").on(table.category),
      priceIdx: index("videos_price_idx").on(table.price),
    };
  }
);

// =============================================================================
// Plays Table (Watch History)
// =============================================================================

export const plays = pgTable(
  "plays",
  {
    id: serial("id").primaryKey(),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    viewerPubkey: varchar("viewer_pubkey", { length: 500 }).notNull(),

    // Watch session info
    playedAt: timestamp("played_at").defaultNow().notNull(),
    watchDuration: integer("watch_duration").notNull(), // Seconds watched
    completed: boolean("completed").default(false).notNull(),

    // Progress tracking
    lastPosition: integer("last_position").default(0), // Last watched position in seconds
  },
  (table) => {
    return {
      videoIdx: index("plays_video_idx").on(table.videoId),
      viewerIdx: index("plays_viewer_idx").on(table.viewerPubkey),
      playedAtIdx: index("plays_played_at_idx").on(table.playedAt),
      // Composite unique: User can have multiple play sessions for same video
      videoViewerIdx: index("plays_video_viewer_idx").on(
        table.videoId,
        table.viewerPubkey
      ),
    };
  }
);

// =============================================================================
// Likes Table
// =============================================================================

export const likes = pgTable(
  "likes",
  {
    id: serial("id").primaryKey(),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    userPubkey: varchar("user_pubkey", { length: 500 }).notNull(),
    likedAt: timestamp("liked_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      videoIdx: index("likes_video_idx").on(table.videoId),
      userIdx: index("likes_user_idx").on(table.userPubkey),
      // User can like a video only once
      videoUserUnique: uniqueIndex("likes_video_user_unique").on(
        table.videoId,
        table.userPubkey
      ),
    };
  }
);

// =============================================================================
// Comments Table
// =============================================================================

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    userPubkey: varchar("user_pubkey", { length: 500 }).notNull(),
    content: text("content").notNull(),

    // For nested replies
    parentId: integer("parent_id"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      videoIdx: index("comments_video_idx").on(table.videoId),
      userIdx: index("comments_user_idx").on(table.userPubkey),
      parentIdx: index("comments_parent_idx").on(table.parentId),
      createdAtIdx: index("comments_created_at_idx").on(table.createdAt),
    };
  }
);

// =============================================================================
// Blockchain Sessions Table (Viewer Sessions)
// =============================================================================

export const blockchainSessions = pgTable(
  "blockchain_sessions",
  {
    id: serial("id").primaryKey(),
    sessionPda: varchar("session_pda", { length: 500 }).notNull().unique(),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    viewerPubkey: varchar("viewer_pubkey", { length: 500 }).notNull(),

    // Session details from blockchain
    maxApprovedChunks: integer("max_approved_chunks").notNull(),
    chunksConsumed: integer("chunks_consumed").default(0).notNull(),
    totalSpent: bigint("total_spent", { mode: "number" }).default(0).notNull(),
    approvedPricePerChunk: bigint("approved_price_per_chunk", {
      mode: "number",
    }).notNull(),
    lastPaidChunkIndex: integer("last_paid_chunk_index"),

    // Session timestamps
    sessionStart: timestamp("session_start").notNull(),
    lastActivity: timestamp("last_activity").notNull(),
    sessionEnd: timestamp("session_end"),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Transaction signature for approval
    approvalSignature: varchar("approval_signature", { length: 500 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      videoIdx: index("blockchain_sessions_video_idx").on(table.videoId),
      viewerIdx: index("blockchain_sessions_viewer_idx").on(table.viewerPubkey),
      sessionPdaIdx: index("blockchain_sessions_pda_idx").on(table.sessionPda),
      activeIdx: index("blockchain_sessions_active_idx").on(table.isActive),
    };
  }
);

// =============================================================================
// Chunk Payments Table (Individual chunk payment tracking)
// =============================================================================

export const chunkPayments = pgTable(
  "chunk_payments",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => blockchainSessions.id, { onDelete: "cascade" }),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),

    // Chunk details
    chunkIndex: integer("chunk_index").notNull(),
    paymentSequence: integer("payment_sequence").notNull(), // Order of payment

    // Payment amounts (in smallest token unit)
    amountPaid: bigint("amount_paid", { mode: "number" }).notNull(),
    platformFee: bigint("platform_fee", { mode: "number" }).notNull(),
    creatorAmount: bigint("creator_amount", { mode: "number" }).notNull(),

    // Transaction info
    transactionSignature: varchar("transaction_signature", {
      length: 500,
    }).notNull(),

    // Participants
    viewerPubkey: varchar("viewer_pubkey", { length: 500 }).notNull(),
    creatorPubkey: varchar("creator_pubkey", { length: 500 }).notNull(),

    paidAt: timestamp("paid_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      sessionIdx: index("chunk_payments_session_idx").on(table.sessionId),
      videoIdx: index("chunk_payments_video_idx").on(table.videoId),
      signatureIdx: index("chunk_payments_signature_idx").on(
        table.transactionSignature
      ),
      viewerIdx: index("chunk_payments_viewer_idx").on(table.viewerPubkey),
      creatorIdx: index("chunk_payments_creator_idx").on(table.creatorPubkey),
      // Composite unique: Each chunk can only be paid once per session
      sessionChunkUnique: uniqueIndex("chunk_payments_session_chunk_unique").on(
        table.sessionId,
        table.chunkIndex
      ),
    };
  }
);

// =============================================================================
// Settlements Table (Batch Settlement Records)
// =============================================================================

export const settlements = pgTable(
  "settlements",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => blockchainSessions.id, { onDelete: "cascade" }),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),

    // Settlement details
    chunkCount: integer("chunk_count").notNull(),
    totalPayment: bigint("total_payment", { mode: "number" }).notNull(),
    platformFee: bigint("platform_fee", { mode: "number" }).notNull(),
    creatorAmount: bigint("creator_amount", { mode: "number" }).notNull(),

    // Blockchain info
    transactionSignature: varchar("transaction_signature", {
      length: 500,
    })
      .notNull()
      .unique(),
    blockTime: timestamp("block_time"),
    slot: bigint("slot", { mode: "number" }),

    // Participants
    viewerPubkey: varchar("viewer_pubkey", { length: 500 }).notNull(),
    creatorPubkey: varchar("creator_pubkey", { length: 500 }).notNull(),

    // Session state after settlement
    chunksConsumedAfter: integer("chunks_consumed_after").notNull(),
    chunksRemaining: integer("chunks_remaining").notNull(),

    // Timestamps
    settlementTimestamp: timestamp("settlement_timestamp").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      sessionIdx: index("settlements_session_idx").on(table.sessionId),
      videoIdx: index("settlements_video_idx").on(table.videoId),
      viewerIdx: index("settlements_viewer_idx").on(table.viewerPubkey),
      creatorIdx: index("settlements_creator_idx").on(table.creatorPubkey),
      signatureIdx: index("settlements_signature_idx").on(
        table.transactionSignature
      ),
      createdAtIdx: index("settlements_created_at_idx").on(table.createdAt),
    };
  }
);

// =============================================================================
// Transactions Table (Payment Tracking)
// =============================================================================

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    buyerPubkey: varchar("buyer_pubkey", { length: 500 }).notNull(),
    creatorPubkey: varchar("creator_pubkey", { length: 500 }).notNull(),

    // Payment info
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USDC").notNull(),

    // Blockchain info
    transactionSignature: varchar("transaction_signature", { length: 500 }),
    network: varchar("network", { length: 50 })
      .default("solana-devnet")
      .notNull(),

    // Status
    status: transactionStatusEnum("status").default("pending").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at"),
  },
  (table) => {
    return {
      videoIdx: index("transactions_video_idx").on(table.videoId),
      buyerIdx: index("transactions_buyer_idx").on(table.buyerPubkey),
      creatorIdx: index("transactions_creator_idx").on(table.creatorPubkey),
      statusIdx: index("transactions_status_idx").on(table.status),
      signatureIdx: index("transactions_signature_idx").on(
        table.transactionSignature
      ),
    };
  }
);
// =============================================================================
// TypeScript Types Export
// =============================================================================

// Users
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Videos
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

// Plays
export type Play = typeof plays.$inferSelect;
export type NewPlay = typeof plays.$inferInsert;

// Likes
export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;

// Comments
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

// Transactions
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

// Blockchain Sessions
export type BlockchainSession = typeof blockchainSessions.$inferSelect;
export type NewBlockchainSession = typeof blockchainSessions.$inferInsert;

// Chunk Payments
export type ChunkPayment = typeof chunkPayments.$inferSelect;
export type NewChunkPayment = typeof chunkPayments.$inferInsert;

// Settlements
export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
