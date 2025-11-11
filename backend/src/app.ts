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
// x402 Payment Middleware for HLS Chunk Streaming
// =============================================================================

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
// This middleware intercepts requests to video segments and requires payment
app.use(
  paymentMiddleware(
    payTo as any,
    {
      // Protect all HLS segment endpoints (.ts files)
      // Pattern matches: /api/video/*/segment*.ts or /api/video/*/*.ts
      "GET /api/video/:videoId/:segment": {
        price: "$0.001", // Default price per chunk (will be dynamic in production)
        network: "solana-devnet",
        config: {
          description: "Access to video chunk",
          mimeType: "video/MP2T", // MPEG-2 Transport Stream
        },
      },
    },
    {
      url: facilitatorUrl,
    }
  )
);

// =============================================================================
// Custom Middleware - Extract Payment Data After x402
// =============================================================================

/**
 * After x402 verifies payment, extract payment proof for tracking
 * This middleware runs AFTER paymentMiddleware validates the payment
 */
app.use(
  "/api/video/:videoId/:segment",
  (req: Request, res: Response, next: NextFunction) => {
    // Only process .ts segment files (not .m3u8 playlist)
    if (!req.params.segment.endsWith(".ts")) {
      return next();
    }

    try {
      // Extract payment data from x402 middleware
      // x402-express stores payment info in headers or request object
      const paymentHeader =
        req.headers["x-payment"] || req.headers["x-payment-response"];
      const viewerPubkey =
        (req.query.wallet as string) ||
        (req.headers["x-viewer-pubkey"] as string);

      // Create payment proof for tracking
      const paymentProof = {
        videoId: req.params.videoId,
        segment: req.params.segment,
        viewerPubkey: viewerPubkey || "anonymous",
        timestamp: Date.now(),
        paymentHeader: paymentHeader || "verified-by-x402",
      };

      // Attach to request for controller to use
      (req as any).x402PaymentProof = JSON.stringify(paymentProof);
      (req as any).x402Verified = true;

      console.log(
        `✅ x402 payment verified for ${req.params.videoId}/${req.params.segment}`
      );

      next();
    } catch (error) {
      console.error("Error extracting payment data:", error);
      next(); // Don't block the request
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
