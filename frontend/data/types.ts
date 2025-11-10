// API Types

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  details?: string;
}

export interface User {
  id: number;
  pubkey: string;
  accountName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  pubkey: string;
  accountName?: string;
}

export interface UpdateUserRequest {
  accountName?: string;
}

// Video Types

export type VideoStatus = "processing" | "ready" | "failed";

export interface Video {
  id: string;
  creatorPubkey: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string;
  ipfsCid?: string; // IPFS Content Identifier from Lighthouse
  duration: number;
  category: string | null;
  tags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  status: VideoStatus;
  isPaid: boolean;
  price: number;
  createdAt: Date;
  updatedAt: Date;
  creator?: User;
}

export interface CreateVideoRequest {
  creatorPubkey: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl: string;
  duration: number;
  category?: string;
  tags?: string[];
  isPaid?: boolean;
  price?: number;
}

export interface UpdateVideoRequest {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  category?: string;
  tags?: string[];
  isPaid?: boolean;
  price?: number;
}

export interface GetVideosParams extends PaginationParams {
  category?: string;
  sortBy?: "createdAt" | "viewCount" | "likeCount";
  order?: "asc" | "desc";
}

export interface SearchVideosParams extends PaginationParams {
  q: string;
}

export interface GetTrendingParams {
  limit?: number;
  days?: number;
}

export interface VideosResponse {
  videos: Video[];
  pagination: PaginationResponse;
}

// Like Types

export interface Like {
  id: string;
  videoId: string;
  userPubkey: string;
  createdAt: Date;
  video?: Video;
  user?: User;
}

export interface LikeVideoRequest {
  userPubkey: string;
  videoId: string;
}

export interface UnlikeVideoRequest {
  userPubkey: string;
  videoId: string;
}

export interface CheckLikedParams {
  userPubkey: string;
  videoId: string;
}

export interface CheckLikedResponse {
  liked: boolean;
}

export interface LikesResponse {
  likes: Like[];
  pagination: PaginationResponse;
}

// Comment Types

export interface Comment {
  id: string;
  videoId: string;
  userPubkey: string;
  content: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  replies?: Comment[];
}

export interface AddCommentRequest {
  videoId: string;
  userPubkey: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentsResponse {
  comments: Comment[];
  pagination: PaginationResponse;
}

// Play Types

export interface Play {
  id: string;
  videoId: string;
  userPubkey: string;
  watchedSeconds: number;
  completed: boolean;
  deviceType: string | null;
  createdAt: Date;
  updatedAt: Date;
  video?: Video;
  user?: User;
}

export interface RecordPlayRequest {
  videoId: string;
  userPubkey: string;
  deviceType?: string;
}

export interface UpdatePlayProgressRequest {
  watchedSeconds: number;
  completed?: boolean;
}

export interface PlayAnalytics {
  videoId: string;
  totalViews: number;
  uniqueViewers: number;
  totalWatchTime: number;
  avgWatchTime: number;
  completionRate: number;
}

export interface CreatorAnalytics {
  creatorPubkey: string;
  totalViews: number;
  totalVideos: number;
  totalWatchTime: number;
  avgViewsPerVideo: number;
}

export interface PlaysResponse {
  plays: Play[];
  pagination: PaginationResponse;
}

export interface GetCreatorAnalyticsParams {
  days?: number;
}

// Transaction Types

export type TransactionStatus = "pending" | "confirmed" | "failed";

export interface Transaction {
  id: string;
  videoId: string;
  buyerPubkey: string;
  creatorPubkey: string;
  amount: number;
  signature: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
  video?: Video;
  buyer?: User;
  creator?: User;
}

export interface CreateTransactionRequest {
  videoId: string;
  buyerPubkey: string;
  creatorPubkey: string;
  amount: number;
  signature: string;
}

export interface FailTransactionRequest {
  reason?: string;
}

export interface GetUserPurchasesParams extends PaginationParams {
  status?: TransactionStatus;
}

export interface GetCreatorEarningsParams extends PaginationParams {
  startDate?: string;
  endDate?: string;
}

export interface CheckPurchaseParams {
  userPubkey: string;
  videoId: string;
}

export interface CheckPurchaseResponse {
  purchased: boolean;
  transaction?: Transaction;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: PaginationResponse;
}

export interface EarningsResponse {
  creatorPubkey: string;
  totalEarnings: number;
  transactionCount: number;
  transactions: Transaction[];
  pagination: PaginationResponse;
}

export interface VideoRevenueResponse {
  videoId: string;
  totalRevenue: number;
  transactionCount: number;
  transactions: Transaction[];
}
