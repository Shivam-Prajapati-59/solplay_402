# Frontend Data Access Layer Documentation

Complete guide to using the API services in your Next.js application.

## 📁 Structure

```
frontend/data/
├── index.ts                  # Main export file (use this for imports)
├── api-client.ts             # Axios instance configuration
├── types.ts                  # TypeScript interfaces
├── user.api.ts               # User API service (4 functions)
├── video.api.ts              # Video API service (10 functions)
├── likes.api.ts              # Likes API service (5 functions)
├── comments.api.ts           # Comments API service (5 functions)
├── plays.api.ts              # Plays API service (6 functions)
└── transactions.api.ts       # Transactions API service (8 functions)
```

---

## 🚀 Quick Start

### Installation

The data layer uses Axios. Make sure it's installed:

```bash
npm install axios
# or
yarn add axios
```

### Environment Setup

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Basic Usage

Import everything from the main index file:

```typescript
import { userApi, videoApi, type User, type Video } from "@/data";

// Or import specific functions
import { getUserProfile, getAllVideos } from "@/data";
```

---

## 📚 API Services

### 1. User API (`userApi`)

**Create or Get User**

```typescript
import { createOrGetUser } from "@/data";

const user = await createOrGetUser({
  pubkey: "user_wallet_address",
  username: "johndoe",
  email: "john@example.com",
});
```

**Get User Profile**

```typescript
import { getUserProfile } from "@/data";

const user = await getUserProfile("user_wallet_address");
console.log(user.username, user.subscriberCount);
```

**Update User Profile**

```typescript
import { updateUserProfile } from "@/data";

const updatedUser = await updateUserProfile("user_wallet_address", {
  username: "newusername",
  bio: "My new bio",
  profileImage: "https://example.com/avatar.jpg",
});
```

**Get User's Videos**

```typescript
import { getUserVideos } from "@/data";

const videos = await getUserVideos("creator_wallet_address");
```

---

### 2. Video API (`videoApi`)

**Create Video**

```typescript
import { createVideo } from "@/data";

const video = await createVideo({
  creatorPubkey: "creator_wallet",
  title: "My Awesome Video",
  description: "Video description here",
  videoUrl: "https://storage.com/video.mp4",
  thumbnailUrl: "https://storage.com/thumb.jpg",
  duration: 300, // 5 minutes in seconds
  category: "gaming",
  tags: ["gameplay", "tutorial"],
  isPaid: false,
  price: 0,
});
```

**Get Video by ID**

```typescript
import { getVideoById } from "@/data";

const video = await getVideoById("video-uuid");
console.log(video.title, video.creator?.username);
```

**Update Video**

```typescript
import { updateVideo } from "@/data";

const updated = await updateVideo("video-uuid", {
  title: "Updated Title",
  description: "New description",
});
```

**Delete Video**

```typescript
import { deleteVideo } from "@/data";

await deleteVideo("video-uuid");
```

**Get All Videos (Paginated)**

```typescript
import { getAllVideos } from "@/data";

const response = await getAllVideos({
  page: 1,
  limit: 10,
  category: "gaming",
  sortBy: "viewCount",
  order: "desc",
});

console.log(response.videos);
console.log(response.pagination); // { total, page, limit, totalPages }
```

**Get Videos by Category**

```typescript
import { getVideosByCategory } from "@/data";

const response = await getVideosByCategory("gaming", {
  page: 1,
  limit: 20,
});
```

**Search Videos**

```typescript
import { searchVideos } from "@/data";

const results = await searchVideos({
  q: "tutorial",
  page: 1,
  limit: 10,
});
```

**Get Trending Videos**

```typescript
import { getTrendingVideos } from "@/data";

const trending = await getTrendingVideos({
  limit: 10,
  days: 7, // Last 7 days
});
```

**Increment View Count**

```typescript
import { incrementViewCount } from "@/data";

const result = await incrementViewCount("video-uuid");
console.log(`New view count: ${result.viewCount}`);
```

**Get Video Stream URL**

```typescript
import { getVideoStreamUrl } from "@/data";

const streamUrl = getVideoStreamUrl("video-id", "playlist.m3u8");
// Use this URL in a video player
```

---

### 3. Likes API (`likesApi`)

**Like a Video**

```typescript
import { likeVideo } from "@/data";

const like = await likeVideo({
  userPubkey: "user_wallet",
  videoId: "video-uuid",
});
```

**Unlike a Video**

```typescript
import { unlikeVideo } from "@/data";

await unlikeVideo({
  userPubkey: "user_wallet",
  videoId: "video-uuid",
});
```

**Get Video Likes**

```typescript
import { getVideoLikes } from "@/data";

const response = await getVideoLikes("video-uuid", {
  page: 1,
  limit: 20,
});

console.log(response.likes); // Array of likes with user info
```

**Get User's Liked Videos**

```typescript
import { getUserLikedVideos } from "@/data";

const response = await getUserLikedVideos("user_wallet", {
  page: 1,
  limit: 20,
});

console.log(response.likes); // Each like includes video info
```

**Check If User Liked Video**

```typescript
import { checkIfLiked } from "@/data";

const result = await checkIfLiked({
  userPubkey: "user_wallet",
  videoId: "video-uuid",
});

if (result.liked) {
  console.log("User already liked this video");
}
```

---

### 4. Comments API (`commentsApi`)

**Add Comment**

```typescript
import { addComment } from "@/data";

const comment = await addComment({
  videoId: "video-uuid",
  userPubkey: "user_wallet",
  content: "Great video!",
});
```

**Add Reply to Comment**

```typescript
import { addComment } from "@/data";

const reply = await addComment({
  videoId: "video-uuid",
  userPubkey: "user_wallet",
  content: "Thanks!",
  parentId: "parent-comment-uuid", // Makes it a reply
});
```

**Update Comment**

```typescript
import { updateComment } from "@/data";

const updated = await updateComment("comment-uuid", {
  content: "Updated comment text",
});
```

**Delete Comment**

```typescript
import { deleteComment } from "@/data";

await deleteComment("comment-uuid");
```

**Get Video Comments**

```typescript
import { getVideoComments } from "@/data";

const response = await getVideoComments("video-uuid", {
  page: 1,
  limit: 20,
});

// Comments include nested replies
response.comments.forEach((comment) => {
  console.log(comment.content);
  comment.replies?.forEach((reply) => {
    console.log("  Reply:", reply.content);
  });
});
```

**Get User Comments**

```typescript
import { getUserComments } from "@/data";

const response = await getUserComments("user_wallet", {
  page: 1,
  limit: 20,
});
```

---

### 5. Plays API (`playsApi`)

**Record Video Play**

```typescript
import { recordPlay } from "@/data";

const play = await recordPlay({
  videoId: "video-uuid",
  userPubkey: "user_wallet",
  deviceType: "desktop", // Optional
});

// Store play.id to update progress later
```

**Update Play Progress**

```typescript
import { updatePlayProgress } from "@/data";

const updated = await updatePlayProgress("play-uuid", {
  watchedSeconds: 120,
  completed: false,
});

// When video is completed
await updatePlayProgress("play-uuid", {
  watchedSeconds: 300,
  completed: true,
});
```

**Get Watch History**

```typescript
import { getWatchHistory } from "@/data";

const response = await getWatchHistory("user_wallet", {
  page: 1,
  limit: 20,
});

// Each play includes video and creator info
response.plays.forEach((play) => {
  console.log(play.video?.title, play.watchedSeconds);
});
```

**Get Continue Watching**

```typescript
import { getContinueWatching } from "@/data";

const incompleteVideos = await getContinueWatching("user_wallet", 10);

// Show these on the homepage
incompleteVideos.forEach((play) => {
  console.log(`Continue: ${play.video?.title} at ${play.watchedSeconds}s`);
});
```

**Get Video Analytics**

```typescript
import { getVideoAnalytics } from "@/data";

const analytics = await getVideoAnalytics("video-uuid");

console.log(`Total views: ${analytics.totalViews}`);
console.log(`Unique viewers: ${analytics.uniqueViewers}`);
console.log(`Avg watch time: ${analytics.avgWatchTime}s`);
console.log(`Completion rate: ${analytics.completionRate * 100}%`);
```

**Get Creator Analytics**

```typescript
import { getCreatorAnalytics } from "@/data";

const analytics = await getCreatorAnalytics("creator_wallet", {
  days: 30, // Last 30 days
});

console.log(`Total views: ${analytics.totalViews}`);
console.log(`Videos: ${analytics.totalVideos}`);
console.log(`Avg views per video: ${analytics.avgViewsPerVideo}`);
```

---

### 6. Transactions API (`transactionsApi`)

**Create Transaction**

```typescript
import { createTransaction } from "@/data";

const transaction = await createTransaction({
  videoId: "video-uuid",
  buyerPubkey: "buyer_wallet",
  creatorPubkey: "creator_wallet",
  amount: 0.1,
  signature: "solana_transaction_signature",
});

// Transaction starts in "pending" status
console.log(transaction.status); // "pending"
```

**Confirm Transaction**

```typescript
import { confirmTransaction } from "@/data";

// After verifying on blockchain
const confirmed = await confirmTransaction("transaction-uuid");
console.log(confirmed.status); // "confirmed"
```

**Fail Transaction**

```typescript
import { failTransaction } from "@/data";

const failed = await failTransaction("transaction-uuid", {
  reason: "Blockchain verification failed",
});
```

**Get Transaction by ID**

```typescript
import { getTransactionById } from "@/data";

const transaction = await getTransactionById("transaction-uuid");
console.log(transaction.video?.title);
console.log(transaction.buyer?.username);
```

**Get User Purchases**

```typescript
import { getUserPurchases } from "@/data";

const response = await getUserPurchases("user_wallet", {
  page: 1,
  limit: 20,
  status: "confirmed", // Optional filter
});

// Show purchased videos
response.transactions.forEach((tx) => {
  console.log(`Purchased: ${tx.video?.title} for ${tx.amount} SOL`);
});
```

**Get Creator Earnings**

```typescript
import { getCreatorEarnings } from "@/data";

const response = await getCreatorEarnings("creator_wallet", {
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  page: 1,
  limit: 20,
});

console.log(`Total earnings: ${response.totalEarnings} SOL`);
console.log(`Transactions: ${response.transactionCount}`);
```

**Get Video Revenue**

```typescript
import { getVideoRevenue } from "@/data";

const revenue = await getVideoRevenue("video-uuid");

console.log(`Total revenue: ${revenue.totalRevenue} SOL`);
console.log(`Sales: ${revenue.transactionCount}`);
```

**Check Video Purchase**

```typescript
import { checkVideoPurchase } from "@/data";

const result = await checkVideoPurchase({
  userPubkey: "user_wallet",
  videoId: "video-uuid",
});

if (result.purchased) {
  console.log("User can watch this video");
  console.log("Purchased on:", result.transaction?.createdAt);
} else {
  console.log("User needs to purchase");
}
```

---

## 🎯 Usage Examples

### Example 1: Video Player Component

```typescript
"use client";

import { useEffect, useState } from "react";
import {
  getVideoById,
  incrementViewCount,
  recordPlay,
  updatePlayProgress,
} from "@/data";
import type { Video, Play } from "@/data";

export default function VideoPlayer({ videoId, userPubkey }: Props) {
  const [video, setVideo] = useState<Video | null>(null);
  const [playId, setPlayId] = useState<string | null>(null);

  useEffect(() => {
    // Load video
    getVideoById(videoId).then(setVideo);

    // Increment view count
    incrementViewCount(videoId);

    // Record play
    recordPlay({ videoId, userPubkey }).then((play) => {
      setPlayId(play.id);
    });
  }, [videoId]);

  const handleProgress = (seconds: number) => {
    if (playId) {
      updatePlayProgress(playId, { watchedSeconds: seconds });
    }
  };

  return (
    <div>
      <h1>{video?.title}</h1>
      {/* Video player here */}
    </div>
  );
}
```

### Example 2: Like Button Component

```typescript
"use client";

import { useState, useEffect } from "react";
import { likeVideo, unlikeVideo, checkIfLiked } from "@/data";

export default function LikeButton({ videoId, userPubkey }: Props) {
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    checkIfLiked({ userPubkey, videoId }).then((result) => {
      setLiked(result.liked);
    });
  }, [videoId, userPubkey]);

  const handleToggle = async () => {
    try {
      if (liked) {
        await unlikeVideo({ userPubkey, videoId });
        setLiked(false);
      } else {
        await likeVideo({ userPubkey, videoId });
        setLiked(true);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  return (
    <button onClick={handleToggle}>{liked ? "❤️ Unlike" : "🤍 Like"}</button>
  );
}
```

### Example 3: Video Feed Page

```typescript
"use client";

import { useEffect, useState } from "react";
import { getAllVideos, type Video } from "@/data";

export default function VideoFeed() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAllVideos({ page, limit: 12, sortBy: "createdAt" })
      .then((response) => setVideos(response.videos))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h1>All Videos</h1>
      <div className="grid grid-cols-3 gap-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      <button onClick={() => setPage((p) => p + 1)}>Load More</button>
    </div>
  );
}
```

### Example 4: Creator Dashboard

```typescript
"use client";

import { useEffect, useState } from "react";
import { getCreatorAnalytics, getCreatorEarnings } from "@/data";

export default function CreatorDashboard({ creatorPubkey }: Props) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      getCreatorAnalytics(creatorPubkey, { days: 30 }),
      getCreatorEarnings(creatorPubkey, { page: 1, limit: 5 }),
    ]).then(([analyticsData, earningsData]) => {
      setAnalytics(analyticsData);
      setEarnings(earningsData);
    });
  }, [creatorPubkey]);

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="stats">
        <div>Total Views: {analytics?.totalViews}</div>
        <div>Total Videos: {analytics?.totalVideos}</div>
        <div>Total Earnings: {earnings?.totalEarnings} SOL</div>
      </div>

      <h2>Recent Transactions</h2>
      {earnings?.transactions.map((tx: any) => (
        <div key={tx.id}>
          {tx.video?.title} - {tx.amount} SOL
        </div>
      ))}
    </div>
  );
}
```

---

## 🔧 Error Handling

All API functions return Promises and throw errors that you should catch:

```typescript
import { getUserProfile } from "@/data";

try {
  const user = await getUserProfile("wallet_address");
  console.log(user);
} catch (error: any) {
  if (error.response) {
    // Server responded with error
    console.error(error.response.data.error);
  } else if (error.request) {
    // Network error
    console.error("Network error");
  } else {
    console.error(error.message);
  }
}
```

---

## 📊 TypeScript Types

All request/response types are exported from `@/data`:

```typescript
import type {
  User,
  Video,
  Comment,
  Like,
  Play,
  Transaction,
  CreateVideoRequest,
  UpdateUserRequest,
  VideosResponse,
  PaginationResponse,
} from "@/data";
```

---

## 🚀 Best Practices

1. **Use Server Components when possible** - Fetch data on the server
2. **Handle loading states** - Show skeletons while loading
3. **Handle errors gracefully** - Show user-friendly error messages
4. **Cache responses** - Use SWR or React Query for caching
5. **Pagination** - Always paginate large lists
6. **Optimistic updates** - Update UI before API call completes

---

## 📝 Summary

- **9 Service Files**: Complete coverage of all backend endpoints
- **42 Functions**: Every backend endpoint has a corresponding function
- **Type-Safe**: Full TypeScript support with 30+ interfaces
- **Easy Imports**: Single entry point `@/data`
- **Error Handling**: Built-in interceptors for common errors
- **Flexible**: Use as objects (`userApi.getUserProfile`) or direct imports

Your frontend now has a complete, type-safe data access layer ready to use! 🎉
