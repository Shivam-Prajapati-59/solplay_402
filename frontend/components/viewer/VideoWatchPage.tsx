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

    const playlistUrl = video.videoUrl || `https://gateway.lighthouse.storage/ipfs/${video.ipfsCid}`;
    const pricePerChunk = video.price || 0.001;
    const totalChunks = 100; // TODO: Get from video metadata

    return (
        <div className="pt-15 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto py-6 space-y-6">
                {/* Back Button */}
                <Button variant="ghost" onClick={handleBack} size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                {/* Video Player Section */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Player */}
                        {!connected ? (
                            <Card className="aspect-video flex items-center justify-center bg-muted">
                                <div className="text-center space-y-4 p-8">
                                    <Lock className="h-16 w-16 mx-auto text-muted-foreground" />
                                    <h3 className="text-xl font-semibold">
                                        Connect Wallet to Watch
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Please connect your Solana wallet to start streaming
                                    </p>
                                    <WalletButton />
                                </div>
                            </Card>
                        ) : !isApproved && video.isPaid ? (
                            <Card className="aspect-video flex items-center justify-center bg-muted">
                                <div className="text-center space-y-4 p-8">
                                    <Lock className="h-16 w-16 mx-auto text-muted-foreground" />
                                    <h3 className="text-xl font-semibold">
                                        Approval Required
                                    </h3>
                                    <p className="text-muted-foreground">
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

                        {/* Video Info */}
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h1 className="text-2xl font-bold mb-2">
                                            {video.title}
                                        </h1>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Eye className="h-4 w-4" />
                                                {video.viewCount?.toLocaleString() || 0} views
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Heart className="h-4 w-4" />
                                                {video.likeCount?.toLocaleString() || 0} likes
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        {video.isPaid && (
                                            <Badge variant="default" className="text-base px-3">
                                                {video.price} SOL
                                            </Badge>
                                        )}
                                        <Button variant="outline" size="icon">
                                            <Share2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {video.description && (
                                    <div className="border-t pt-4">
                                        <p className="text-muted-foreground whitespace-pre-wrap">
                                            {video.description}
                                        </p>
                                    </div>
                                )}

                                {video.tags && video.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {video.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {isApproved && video.isPaid && (
                            <SettlementStats
                                videoId={videoId}
                                onSettleClick={() => {
                                    /* SettlementStats has internal dialog */
                                }}
                            />
                        )}

                        {/* Creator Info */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <h3 className="font-semibold">Creator</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary to-purple-500" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-mono text-xs truncate">
                                                {video.creatorPubkey}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Settlement History */}
                {isApproved && video.isPaid && (
                    <div>
                        <h2 className="text-xl font-bold mb-4">Your Settlement History</h2>
                        <SettlementHistory mode="viewer" videoId={videoId} limit={5} />
                    </div>
                )}

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
        </div>
    );
}
