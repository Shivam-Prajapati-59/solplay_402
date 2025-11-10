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
import { db } from "./db";
import { videos } from "./db/schema";
import { eq } from "drizzle-orm";

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

// x402 Payment Middleware - Protects video chunk endpoints
app.use(
  paymentMiddleware(
    payTo as any,
    {
      // Protect all HLS segment endpoints
      "GET /api/video/*/segment*.ts": {
        price: "$0.001", // Default price, will be dynamic based on video
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
