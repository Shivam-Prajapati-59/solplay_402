#!/bin/bash

# =============================================================================
# Video Upload API Test Script
# =============================================================================
# Tests the complete video upload workflow
# =============================================================================

echo "🧪 Testing SolPlay 402 Video Upload API"
echo "========================================"
echo ""

# Configuration
API_URL="http://localhost:5000"
TEST_PUBKEY="HeLLo8VZG3yXKFw7KjfZWcNzXqZ5r9vJXQKbJB9oBPX2"
TEST_CID="bafybeibe53x4tun7cs5xmksx6m564itglkh76nwtggj62fzytlkpsirjjm"

# =============================================================================
# Test 1: Create Video (with auto-user creation)
# =============================================================================

echo "📹 Test 1: Creating video..."
echo "--------------------------------------"

RESPONSE=$(curl -s -X POST "${API_URL}/api/videos/create" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Video - Auto User Creation",
    "description": "This is a test video with automatic user creation",
    "tags": ["test", "demo", "solana"],
    "category": "education",
    "creatorPubkey": "'"${TEST_PUBKEY}"'",
    "ipfsCid": "'"${TEST_CID}"'",
    "thumbnailUrl": "https://gateway.lighthouse.storage/ipfs/'"${TEST_CID}"'/thumbnail.jpg",
    "duration": 120,
    "videoSize": 50000000,
    "videoFormat": "mp4",
    "videoResolution": "1080p",
    "price": "0.001"
  }')

echo "$RESPONSE" | jq .

# Extract video ID if successful
VIDEO_ID=$(echo "$RESPONSE" | jq -r '.video.id // empty')

if [ -n "$VIDEO_ID" ]; then
  echo ""
  echo "✅ Video created successfully! ID: $VIDEO_ID"
  echo ""
  
  # =============================================================================
  # Test 2: Get Video by ID
  # =============================================================================
  
  echo "📖 Test 2: Retrieving video by ID..."
  echo "--------------------------------------"
  
  curl -s "${API_URL}/api/videos/${VIDEO_ID}" | jq .
  echo ""
  
  # =============================================================================
  # Test 3: Get All Videos
  # =============================================================================
  
  echo "📚 Test 3: Getting all videos..."
  echo "--------------------------------------"
  
  curl -s "${API_URL}/api/videos" | jq '.videos | length'
  echo ""
  
else
  echo ""
  echo "❌ Video creation failed!"
  echo ""
fi

# =============================================================================
# Test 4: Create Another Video (same user)
# =============================================================================

echo "📹 Test 4: Creating second video (same creator)..."
echo "--------------------------------------"

RESPONSE2=$(curl -s -X POST "${API_URL}/api/videos/create" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Second Test Video",
    "description": "Testing with existing user",
    "creatorPubkey": "'"${TEST_PUBKEY}"'",
    "ipfsCid": "QmTest456SecondVideo789",
    "price": "0.002"
  }')

echo "$RESPONSE2" | jq .
echo ""

# =============================================================================
# Summary
# =============================================================================

echo "========================================"
echo "✅ API Tests Complete!"
echo "========================================"
