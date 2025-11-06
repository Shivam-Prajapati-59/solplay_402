// =============================================================================
// CORS Middleware Configuration
// =============================================================================
// Configures Cross-Origin Resource Sharing for frontend communication
// =============================================================================

import cors from "cors";

/**
 * CORS configuration
 * Allows requests from localhost:3000 and localhost:3001
 */
export const corsMiddleware = cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-PAYMENT",
    "X-PAYMENT-RESPONSE",
  ],
});
