-- Migration: Remove per-chunk payment tracking, align with x402 batch settlement
-- Date: 2024-01-XX
-- Description: Removes lastPaidChunkIndex column, drops chunkPayments table, adds settlements table

-- Remove lastPaidChunkIndex column from blockchainSessions table
ALTER TABLE blockchain_sessions DROP COLUMN IF EXISTS last_paid_chunk_index;

-- Drop chunkPayments table (replaced by in-memory tracking + batch settlement)
DROP TABLE IF EXISTS chunk_payments CASCADE;

-- Create settlements table for transparency (records every batch settlement)
CREATE TABLE IF NOT EXISTS settlements (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES blockchain_sessions(id) ON DELETE CASCADE,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Settlement details
  chunk_count INTEGER NOT NULL,
  total_payment BIGINT NOT NULL,
  platform_fee BIGINT NOT NULL,
  creator_amount BIGINT NOT NULL,
  
  -- Blockchain info
  transaction_signature VARCHAR(500) NOT NULL UNIQUE,
  block_time TIMESTAMP,
  slot BIGINT,
  
  -- Participants
  viewer_pubkey VARCHAR(500) NOT NULL,
  creator_pubkey VARCHAR(500) NOT NULL,
  
  -- Session state after settlement
  chunks_consumed_after INTEGER NOT NULL,
  chunks_remaining INTEGER NOT NULL,
  
  -- Timestamps
  settlement_timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS settlements_session_idx ON settlements(session_id);
CREATE INDEX IF NOT EXISTS settlements_video_idx ON settlements(video_id);
CREATE INDEX IF NOT EXISTS settlements_viewer_idx ON settlements(viewer_pubkey);
CREATE INDEX IF NOT EXISTS settlements_creator_idx ON settlements(creator_pubkey);
CREATE INDEX IF NOT EXISTS settlements_signature_idx ON settlements(transaction_signature);
CREATE INDEX IF NOT EXISTS settlements_created_at_idx ON settlements(created_at);

-- Add comments to document changes
COMMENT ON TABLE blockchain_sessions IS 'Viewer sessions for x402 streaming with batch settlement (updated 2024-01-XX)';
COMMENT ON TABLE settlements IS 'Batch settlement records for transparency - stores every settle_session transaction';


