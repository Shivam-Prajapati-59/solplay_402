import express from "express";
import cors from "cors";
import { paymentMiddleware, Resource, type SolanaAddress } from "x402-express";
import dotenv from "dotenv";

dotenv.config();
const facilitatorUrl = process.env.FACILITATOR_URL as Resource;
const payTo = process.env.ADDRESS as `0x${string}` | SolanaAddress;

// Database instance is now imported from ./db/index.ts
// This ensures proper initialization with schema and connection pooling

if (!facilitatorUrl || !payTo) {
  console.error(
    "Missing required environment variables: FACILITATOR_URL and ADDRESS"
  );
  console.error("Please check your .env file");
  process.exit(1);
}

// Detect if address is EVM (0x prefix) or Solana (base58)
const isEvmAddress = payTo.startsWith("0x");
const network = isEvmAddress ? "base-sepolia" : "solana-devnet";

console.log(`🔗 Network: ${network}`);
console.log(`💰 Payment Address: ${payTo}`);

const app = express();

// Enable CORS for frontend
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-PAYMENT",
      "X-PAYMENT-RESPONSE",
    ],
  })
);

app.use(express.json());

app.use(
  paymentMiddleware(
    payTo,
    {
      // Video endpoint requires payment
      "GET /api/videos/ww": {
        price: "$0.001", // Price in USD (USDC/SOL equivalent)
        network: "solana-devnet", // "base-sepolia" for EVM or "solana-devnet" for Solana
        config: {
          description: "Access to video content",
          mimeType: "application/json",
        },
      },
    },
    {
      url: facilitatorUrl,
    }
  )
);

// Default route
app.get("/", (_req, res) => res.send("Welcome to x402 Video API Backend!"));

export default app;
