"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Loader2,
    Lock,
    Eye,
    Heart,
    Share2,
    ArrowLeft,
    AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { StreamingSessionManager } from "./StreamingSessionManager";
import { PaymentVideoPlayerWithX402 } from "../video/PaymentVideoPlayerWithX402";
import { SettlementStats } from "../custom/SettlementStats";
import { SettlementHistory } from "../custom/SettlementHistory";
import { WalletButton } from "../custom/WalletButton";
import { getVideoById } from "@/data/video.api";
import type { Video } from "@/data/types";
import { toast } from "sonner";

interface VideoWatchPageProps {
    videoId: string;
}

export function VideoWatchPage({ videoId }: VideoWatchPageProps) {
    const router = useRouter();
    const { connected, publicKey } = useWallet();

    const [video, setVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showApproval, setShowApproval] = useState(false);
    const [sessionPda, setSessionPda] = useState<string | null>(null);
    const [isApproved, setIsApproved] = useState(false);

    useEffect(() => {
        loadVideo();
    }, [videoId]);

    useEffect(() => {
        // Check if user needs to approve when wallet connects
        if (connected && video && video.isPaid && !isApproved) {
            setShowApproval(true);
        }
    }, [connected, video, isApproved]);

    const loadVideo = async () => {
        try {
            setLoading(true);
            setError(null);
            const videoData = await getVideoById(videoId);
            setVideo(videoData);

            // Check if this is a paid video
            if (videoData.isPaid && connected) {
                // TODO: Check if user already has an active session
                // For now, always show approval for paid videos
                setShowApproval(true);
            } else if (!videoData.isPaid) {
                // Free video, no approval needed
                setIsApproved(true);
            }
        } catch (err: any) {
            console.error("Failed to load video:", err);
            setError(err.message || "Failed to load video");
            toast.error("Failed to load video");
        } finally {
            setLoading(false);
        }
    };

    const handleApproved = (pda: string) => {
        setSessionPda(pda);
        setIsApproved(true);
        setShowApproval(false);
        toast.success("Ready to stream!");
    };

    const handleApprovalCancel = () => {
        setShowApproval(false);
        router.push("/viewer/dashboard");
    };

    const handleBack = () => {
        router.back();
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8 space-y-6">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="aspect-video w-full" />
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            </div>
        );
    }

    if (error || !video) {
        return (
            <div className="container mx-auto py-12">
                <Card>
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                        <h2 className="text-xl font-semibold mb-2">
                            Failed to Load Video
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            {error || "Video not found"}
                        </p>
                        <Button onClick={handleBack} variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Construct video URL - prefer HLS playlist, fallback to IPFS
    const videoData = video as any; // Backend returns different structure
    const playlistUrl = videoData.hlsPlaylistUrl ||
        (videoData.ipfsCid ? `https://gateway.lighthouse.storage/ipfs/${videoData.ipfsCid}` : '');

    const pricePerChunk = video.price || 0.001;
    const totalChunks = 100; // TODO: Get from video metadata

    console.log("🎬 Video data:", {
        hlsPlaylistUrl: videoData.hlsPlaylistUrl,
        ipfsCid: videoData.ipfsCid,
        constructedUrl: playlistUrl
    });

    return (
        <div className="min-h-screen bg-background">
            {/* Header with Back Button */}
            <div className="border-b bg-card/50 backdrop-blur">
                <div className="container mx-auto px-4 py-3 flex items-center gap-4">
                    <Button variant="ghost" onClick={handleBack} size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    {video.isPaid && (
                        <Badge variant="default" className="ml-auto">
                            {video.price} SOL per video
                        </Badge>
                    )}
                </div>
            </div>

            {/* Main Content - Single Screen Layout */}
            <div className="container mx-auto px-4 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-120px)]">
                    {/* Left: Video Player */}
                    <div className="lg:col-span-8 flex flex-col gap-3">
                        {/* Player */}
                        <div className="shrink-0">
                            {!connected ? (
                                <Card className="aspect-video flex items-center justify-center bg-muted">
                                    <div className="text-center space-y-3 p-6">
                                        <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                                        <h3 className="text-lg font-semibold">Connect Wallet to Watch</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Connect your Solana wallet to start streaming
                                        </p>
                                        <WalletButton />
                                    </div>
                                </Card>
                            ) : !isApproved && video.isPaid ? (
                                <Card className="aspect-video flex items-center justify-center bg-muted">
                                    <div className="text-center space-y-3 p-6">
                                        <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                                        <h3 className="text-lg font-semibold">Approval Required</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Approve streaming session to start watching
                                        </p>
                                        <Button onClick={() => setShowApproval(true)} size="lg">
                                            Approve & Watch
                                        </Button>
                                    </div>
                                </Card>
                            ) : (
                                <PaymentVideoPlayerWithX402
                                    videoId={videoId}
                                    playlistUrl={playlistUrl}
                                    pricePerChunk={pricePerChunk}
                                    title={video.title}
                                    creatorPubkey={video.creatorPubkey}
                                />
                            )}
                        </div>

                        {/* Video Info - Compact */}
                        <Card className="flex-1 overflow-auto">
                            <CardContent className="p-4 space-y-3">
                                <div>
                                    <h1 className="text-xl font-bold mb-1">{video.title}</h1>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            {video.viewCount?.toLocaleString() || 0} views
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Heart className="h-3 w-3" />
                                            {video.likeCount?.toLocaleString() || 0} likes
                                        </div>
                                        <Button variant="ghost" size="sm" className="ml-auto h-7 px-2">
                                            <Share2 className="h-3 w-3 mr-1" />
                                            Share
                                        </Button>
                                    </div>
                                </div>

                                {video.description && (
                                    <div className="border-t pt-3">
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                            {video.description}
                                        </p>
                                    </div>
                                )}

                                {video.tags && video.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {video.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Sidebar - Compact */}
                    <div className="lg:col-span-4 flex flex-col gap-3 overflow-auto">
                        {/* Settlement Stats - Compact */}
                        {isApproved && video.isPaid && (
                            <SettlementStats
                                videoId={videoId}
                                onSettleClick={() => {
                                    /* Internal dialog */
                                }}
                            />
                        )}

                        {/* Creator Info - Compact */}
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-sm font-semibold mb-2">Creator</h3>
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-purple-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-xs truncate text-muted-foreground">
                                            {video.creatorPubkey}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Settlement History - Compact */}
                        {isApproved && video.isPaid && (
                            <Card className="flex-1 overflow-hidden flex flex-col">
                                <CardContent className="p-4 flex-1 flex flex-col">
                                    <h3 className="text-sm font-semibold mb-2">Settlement History</h3>
                                    <div className="flex-1 overflow-auto">
                                        <SettlementHistory mode="viewer" videoId={videoId} limit={5} />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Approval Dialog */}
            {showApproval && video.isPaid && (
                <StreamingSessionManager
                    videoId={videoId}
                    videoTitle={video.title}
                    pricePerChunk={pricePerChunk}
                    totalChunks={totalChunks}
                    onApproved={handleApproved}
                    onCancel={handleApprovalCancel}
                />
            )}
        </div>
    );
}
