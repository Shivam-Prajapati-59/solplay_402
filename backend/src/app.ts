// =============================================================================
// Express App Configuration
// =============================================================================
// Main Express application setup with middleware and routes
// =============================================================================

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import routes from "./routes";
import { paymentMiddleware } from "x402-express";

const app: Express = express();

// =============================================================================
// Middleware
// =============================================================================

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/public", express.static(path.join(__dirname, "../public")));

// =============================================================================
// x402 Delegate-Based Payment System
// =============================================================================
// NOTE: We're using delegate-based batch settlement instead of per-chunk x402 payments
// This provides:
// - 99% gas savings (batch vs individual transactions)
// - Better UX (no payment popup per chunk)
// - Pre-approved spending limits (user controls max)
// - Full on-chain transparency
//
// Payment Flow:
// 1. User approves delegate → creates ViewerSession with max chunks
// 2. Video plays → chunks tracked off-chain via /api/x402/track-chunk
// 3. User settles → batch payment on-chain for all chunks at once
//
// If you want to enable per-chunk x402 payments instead, uncomment the code below:
// =============================================================================

/*
const payTo = process.env.ADDRESS || "";
const facilitatorUrl = (process.env.FACILITATOR_URL ||
  "https://facilitator.payai.network") as `${string}://${string}`;

if (!payTo) {
  console.warn("⚠️ WARNING: ADDRESS not set - x402 payments will not work!");
  console.warn("   Set ADDRESS in backend/.env to enable payments");
}

console.log(`🔗 Payment Network: solana-devnet`);
console.log(`💰 Payment Address: ${payTo || "NOT SET"}`);
console.log(`🌐 Facilitator URL: ${facilitatorUrl}`);

// x402 Payment Middleware - Protects video chunk endpoints
app.use(
  paymentMiddleware(
    payTo as any,
    {
      "GET /api/video/:videoId/:segment": {
        price: "$0.001",
        network: "solana-devnet",
        config: {
          description: "Access to video chunk",
          mimeType: "video/MP2T",
        },
      },
    },
    {
      url: facilitatorUrl,
    }
  )
);
*/

console.log(`💳 Using delegate-based batch settlement (99% gas savings)`);
console.log(`📊 Chunk tracking via /api/x402/track-chunk endpoint`);

console.log(`💳 Using delegate-based batch settlement (99% gas savings)`);
console.log(`📊 Chunk tracking via /api/x402/track-chunk endpoint`);

// =============================================================================
// Chunk Tracking Middleware
// =============================================================================

/**
 * Track chunk views for delegate-based payment system
 * This middleware records which chunks viewers have watched for later batch settlement
 */
app.use(
  "/api/video/:videoId/:segment",
  (req: Request, res: Response, next: NextFunction) => {
    // Only track .ts segment files (not .m3u8 playlists)
    if (!req.params.segment.endsWith(".ts")) {
      return next();
    }

    try {
      const viewerPubkey =
        (req.query.wallet as string) ||
        (req.headers["x-viewer-pubkey"] as string);

      // Create tracking record
      const paymentProof = {
        videoId: req.params.videoId,
        segment: req.params.segment,
        viewerPubkey: viewerPubkey || "anonymous",
        timestamp: Date.now(),
        delegateBased: true, // Flag that this uses delegate approval
      };

      // Attach to request for controller to use
      (req as any).x402PaymentProof = JSON.stringify(paymentProof);
      (req as any).x402Verified = true; // Mark as verified (delegate-based)

      console.log(
        `📊 Tracking chunk: ${req.params.videoId}/${req.params.segment}${
          viewerPubkey ? ` (${viewerPubkey.substring(0, 8)}...)` : ""
        }`
      );

      next();
    } catch (error) {
      console.error("Error tracking chunk:", error);
      next(); // Don't block video delivery
    }
  }
);

// =============================================================================
// Routes
// =============================================================================

app.use("/api", routes);

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "SolPlay 402 API",
    version: "1.0.0",
    status: "running",
    blockchain: "Solana",
  });
});

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: err.name || "ServerError",
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

export default app;
