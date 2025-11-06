# 🎯 Backend Architecture Overview

## 📊 Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                          app.ts                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Middleware Layer                                   │    │
│  │  • CORS (cors.config.ts)                           │    │
│  │  • Body Parser                                      │    │
│  │  • Directory Init (directories.config.ts)          │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     routes/index.ts                          │
│                   (Main Route Combiner)                      │
└────────────┬───────────────────────────────┬────────────────┘
             │                               │
             ▼                               ▼
┌────────────────────────┐      ┌──────────────────────────┐
│  health.routes.ts      │      │   video.routes.ts        │
│  ┌──────────────────┐ │      │  ┌────────────────────┐  │
│  │ GET /            │ │      │  │ POST /api/test-ipfs│  │
│  │ GET /health      │ │      │  │ POST /api/transcode│  │
│  └──────────────────┘ │      │  │ POST /api/transcode│  │
└──────────┬─────────────┘      │  │      -url           │  │
           │                    │  │ GET  /api/videos   │  │
           │                    │  │ GET  /api/video/   │  │
           │                    │  │      :id/*.m3u8    │  │
           │                    │  │ GET  /api/video/   │  │
           │                    │  │      :id/:segment  │  │
           │                    │  └────────────────────┘  │
           │                    └──────────┬───────────────┘
           │                               │
           ▼                               ▼
┌────────────────────────┐      ┌──────────────────────────┐
│ health.controller.ts   │      │  video.controller.ts     │
│  ┌──────────────────┐ │      │  ┌────────────────────┐  │
│  │ welcome()        │ │      │  │ testIpfsTranscode()│  │
│  │ healthCheck()    │ │      │  │ transcodeFromUrl() │  │
│  └──────────────────┘ │      │  │ transcodeLocalFile │  │
└────────────────────────┘      │  │ servePlaylist()    │  │
                                │  │ serveSegment()     │  │
                                │  │ listVideos()       │  │
                                │  └─────────┬──────────┘  │
                                └────────────┼─────────────┘
                                             │
                                             ▼
                                ┌──────────────────────────┐
                                │  utils/trancrodeToHLS.ts │
                                │  ┌────────────────────┐  │
                                │  │ FFmpeg Processing  │  │
                                │  │ HLS Transcoding    │  │
                                │  │ System FFmpeg 7.1  │  │
                                │  └────────────────────┘  │
                                └──────────────────────────┘
```

## 🔄 Request Flow Example

### Example: Transcoding IPFS Video

```
1. Client POST → http://localhost:5000/api/transcode-url
   Body: { url: "https://gateway.lighthouse.storage/ipfs/..." }

2. app.ts
   ├─ CORS middleware ✓
   ├─ Body parser ✓
   └─ Routes ↓

3. routes/index.ts
   └─ Forwards to /api/* → video.routes.ts

4. routes/video.routes.ts
   └─ POST /transcode-url → transcodeFromUrl()

5. controllers/video.controller.ts
   ├─ Validate URL ✓
   ├─ Generate videoId
   ├─ Check cache
   └─ Call transcodeToHLS() ↓

6. utils/trancrodeToHLS.ts
   ├─ System FFmpeg path detection
   ├─ Protocol whitelist setup
   ├─ FFmpeg transcoding
   └─ HLS output (playlist + segments)

7. Response → { success: true, playlistUrl: "/api/video/xxx/playlist.m3u8" }
```

## 📂 File Responsibilities

| Layer           | Files              | Responsibility                                          |
| --------------- | ------------------ | ------------------------------------------------------- |
| **Entry**       | `app.ts`           | App initialization, middleware setup, route mounting    |
| **Config**      | `config/*.ts`      | CORS, directories, environment variables                |
| **Routes**      | `routes/*.ts`      | Endpoint definitions, HTTP methods, path params         |
| **Controllers** | `controllers/*.ts` | Business logic, request validation, response formatting |
| **Utils**       | `utils/*.ts`       | Reusable functions, FFmpeg transcoding                  |
| **Services**    | `services/*.ts`    | Complex business logic (future)                         |
| **DB**          | `db/*.ts`          | Database connection, queries (future)                   |

## 🎨 Code Organization Benefits

### Before Refactoring

```typescript
// app.ts (385 lines)
import everything...
const app = express();
app.use(cors({...}));
app.use(express.json());
app.post("/api/test-ipfs", async (req, res) => {
  // 50 lines of business logic
});
app.post("/api/transcode-url", async (req, res) => {
  // 70 lines of business logic
});
app.post("/api/transcode", async (req, res) => {
  // 40 lines of business logic
});
app.get("/api/video/:id/playlist.m3u8", (req, res) => {
  // 20 lines of business logic
});
// ... 10 more endpoints ...
export default app;
```

### After Refactoring

```typescript
// app.ts (85 lines)
import express from "express";
import { corsMiddleware } from "./config/cors.config";
import { initializeDirectories } from "./config/directories.config";
import routes from "./routes";

const app = express();
initializeDirectories();
app.use(corsMiddleware);
app.use(express.json());
app.use(routes);

export default app;
```

## 📈 Scalability Example

### Adding a New Feature: User Authentication

```
1. Create controller
   controllers/auth.controller.ts
   ├─ register()
   ├─ login()
   └─ logout()

2. Create routes
   routes/auth.routes.ts
   ├─ POST /api/auth/register
   ├─ POST /api/auth/login
   └─ POST /api/auth/logout

3. Mount in main router
   routes/index.ts
   import authRoutes from "./auth.routes";
   router.use("/api/auth", authRoutes);

4. Done! No changes to app.ts needed ✅
```

## 🔒 Security Benefits

- **Separation of Concerns**: Security logic isolated in middleware
- **Easy Validation**: Add validation layer without touching controllers
- **Centralized Auth**: Authentication middleware applies to all routes
- **Error Handling**: Consistent error responses across all endpoints

## 🧪 Testing Benefits

```typescript
// Easy to test controllers in isolation
import { transcodeFromUrl } from "./controllers/video.controller";

describe("Video Controller", () => {
  it("should validate URL format", async () => {
    const req = { body: { url: "invalid-url" } };
    const res = { status: jest.fn(), json: jest.fn() };

    await transcodeFromUrl(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

## 🎯 Summary

| Metric              | Before       | After             | Improvement      |
| ------------------- | ------------ | ----------------- | ---------------- |
| **app.ts size**     | 385 lines    | 85 lines          | 78% smaller      |
| **Files**           | 1 large file | 9 organized files | Better structure |
| **Maintainability** | Low          | High              | ⭐⭐⭐⭐⭐       |
| **Scalability**     | Limited      | Excellent         | ⭐⭐⭐⭐⭐       |
| **Testability**     | Difficult    | Easy              | ⭐⭐⭐⭐⭐       |
| **Readability**     | Hard         | Clear             | ⭐⭐⭐⭐⭐       |

**Result**: Professional, production-ready backend structure! 🚀
