import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

// Create the connection
const sql = neon(process.env.DATABASE_URL);

// Create the database instance with schema
export const db = drizzle(sql, { schema });

// Export schema for easy access
export { schema };
