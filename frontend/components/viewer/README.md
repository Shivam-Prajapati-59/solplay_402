# Viewer Components

Complete set of components for the viewer dashboard and video watching experience.

## Components

### `VideoCard.tsx`

Individual video card component displaying:

- Thumbnail with play overlay on hover
- Video title and description
- View count and like count
- Category badge
- Price badge (for paid videos)
- Duration badge
- Watch Now button

**Usage:**

```tsx
import { VideoCard } from "@/components/viewer";

<VideoCard video={videoData} />;
```

### `VideoGrid.tsx`

Grid layout for browsing all available videos with:

- Search functionality
- Sort options (Latest, Most Viewed, Most Liked)
- Infinite scroll / Load More
- Category filtering
- Responsive grid layout

**Usage:**

```tsx
import { VideoGrid } from "@/components/viewer";

<VideoGrid category="education" limit={12} />;
```

### `StreamingSessionManager.tsx`

Handles the delegate approval flow before streaming:

- Wallet connection check
- Approve max chunks dialog
- Cost estimation display
- Session creation on blockchain
- Info about x402 micropayment system

**Usage:**

```tsx
import { StreamingSessionManager } from "@/components/viewer";

<StreamingSessionManager
  videoId="123"
  videoTitle="My Video"
  pricePerChunk={0.001}
  totalChunks={100}
  onApproved={(sessionPda) => console.log("Approved:", sessionPda)}
  onCancel={() => router.back()}
/>;
```

### `VideoWatchPage.tsx`

Complete video watch page with:

- Video player integration (PaymentVideoPlayerWithX402)
- Streaming session management
- Video metadata display
- Settlement stats widget
- Settlement history for this video
- Creator information
- Social actions (share, like)

**Usage:**

```tsx
import { VideoWatchPage } from "@/components/viewer";

<VideoWatchPage videoId="123" />;
```

### `ActiveSessionsWidget.tsx`

Displays all active viewing sessions with:

- Progress bars for chunks watched
- Total spent tracking
- Resume watching button
- Quick settlement button
- Session status badges

**Usage:**

```tsx
import { ActiveSessionsWidget } from "@/components/viewer";

<ActiveSessionsWidget />;
```

## Complete User Flow

1. **Browse Videos** (`VideoGrid`)

   - User browses available videos
   - Filters and searches content
   - Clicks "Watch Now" on a video

2. **Approve Session** (`StreamingSessionManager`)

   - Connect wallet (if not connected)
   - Approve max chunks (default 100)
   - Review cost estimate
   - Create blockchain session with delegate approval
   - No private key needed!

3. **Watch Video** (`VideoWatchPage`)

   - HLS video player loads
   - Chunks tracked via x402 HTTP (off-chain)
   - Real-time settlement stats shown
   - Watch as much as approved

4. **Settle Payment** (via `SettlementStats` widget)

   - View unsettled chunks count
   - Click "Settle Now"
   - Batch settlement on blockchain (1 transaction)
   - Payment splits: creator (95%) + platform (5%)

5. **View History** (`SettlementHistory`)
   - All past settlements
   - Transaction signatures with Solana Explorer links
   - Amount breakdown

## Integration with Backend & Blockchain

### Backend APIs Used:

- `GET /api/videos` - List all videos
- `GET /api/videos/:id` - Get video details
- `GET /api/blockchain/sessions/viewer/:pubkey` - Active sessions
- `POST /api/x402/track` - Track chunk views (via x402 middleware)

### Blockchain Interactions:

- `approveStreaming()` - Create ViewerSession PDA, approve delegation
- `settleSessionBatch()` - Batch settlement of watched chunks
- `getViewerSession()` - Get session state from blockchain

### x402 Integration:

- Chunks tracked via HTTP headers during HLS playback
- Backend accumulates chunk views off-chain
- Settlement triggers blockchain transaction

## Dependencies

Required packages:

```json
{
  "@radix-ui/react-select": "^2.0.0",
  "@solana/wallet-adapter-react": "^0.15.39",
  "@solana/wallet-adapter-react-ui": "^0.9.39",
  "hls.js": "^1.6.14",
  "sonner": "^2.0.7",
  "lucide-react": "^0.552.0"
}
```

## File Structure

```
components/viewer/
├── index.ts                      # Export all components
├── VideoCard.tsx                 # Individual video card
├── VideoGrid.tsx                 # Grid of videos with filters
├── StreamingSessionManager.tsx   # Approval dialog
├── VideoWatchPage.tsx            # Complete watch page
├── ActiveSessionsWidget.tsx      # Active sessions display
└── README.md                     # This file
```

## Routes

These components are used in:

- `/app/viewer/dashboard/page.tsx` - Main viewer dashboard
- `/app/viewer/watch/[id]/page.tsx` - Individual video watch page

## Styling

All components use:

- shadcn/ui components (Card, Button, Dialog, etc.)
- Tailwind CSS for styling
- lucide-react for icons
- Responsive design (mobile-first)

## Notes

- All paid videos require wallet connection and approval
- Free videos (isPaid: false) skip the approval step
- Session PDAs are cached for quick access
- Settlement can happen at any time (user-controlled)
- All blockchain transactions show toast notifications
