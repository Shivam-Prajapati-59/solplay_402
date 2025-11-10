// =============================================================================
// Blockchain Payment Video Player
// =============================================================================
// HLS video player with integrated chunk payment processing
// =============================================================================

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Wallet,
    Coins
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { toast } from "sonner";
import { formatTokenAmount } from "@/lib/anchor/token-utils";
import { x402API } from "@/data/x402.api";
import { SettlementDialog, SettlementStats } from "@/components/custom/settlement-components";

interface PaymentVideoPlayerProps {
    videoId: string;
    playlistUrl: string;
    blockchainVideoId?: string;
    pricePerChunk?: number;
    totalChunks?: number;
    title?: string;
    creator?: string;
}

type PaymentStatus = "idle" | "approving" | "approved" | "paying" | "completed" | "error";

export default function PaymentVideoPlayer({
    videoId,
    playlistUrl,
    blockchainVideoId,
    pricePerChunk = 0.001,
    totalChunks = 100,
    title,
    creator,
}: PaymentVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [loading, setLoading] = useState(false);

    // Payment states
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
    const [sessionPda, setSessionPda] = useState<string | null>(null);
    const [chunksApproved, setChunksApproved] = useState(0);
    const [chunksWatched, setChunksWatched] = useState(0);
    const [lastWatchedChunk, setLastWatchedChunk] = useState<number>(-1);
    const [totalSpent, setTotalSpent] = useState(0);
    const [tokenBalance, setTokenBalance] = useState<bigint>(BigInt(0));
    const [showSettlementDialog, setShowSettlementDialog] = useState(false);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);

    const { publicKey, connected } = useWallet();
    const { service: blockchainService, isInitialized } = useBlockchain();

    // Fetch token balance
    useEffect(() => {
        if (isInitialized && blockchainService) {
            loadTokenBalance();
        }
    }, [isInitialized, blockchainService, publicKey]);

    const loadTokenBalance = async () => {
        if (!blockchainService || !publicKey) return;

        try {
            const balance = await blockchainService.getWalletTokenBalance(publicKey);
            setTokenBalance(balance.balance);
        } catch (error) {
            console.error("Error fetching token balance:", error);
        }
    };

    // Initialize HLS player
    useEffect(() => {
        if (!videoRef.current || !playlistUrl) return;

        const video = videoRef.current;

        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
                debug: false,
            });

            hlsRef.current = hls;
            hls.loadSource(playlistUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log("HLS manifest loaded");
                setLoading(false);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error("HLS Error:", data);
                if (data.fatal) {
                    toast.error("Video playback error", {
                        description: data.type === Hls.ErrorTypes.NETWORK_ERROR
                            ? "Network error - trying to recover"
                            : "Media error occurred",
                    });
                }
            });

            return () => {
                hls.destroy();
            };
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            // Native HLS support (Safari)
            video.src = playlistUrl;
        }
    }, [playlistUrl]);

    // Update time
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateTime = () => {
            setCurrentTime(video.currentTime);
            setDuration(video.duration);
        };

        video.addEventListener("timeupdate", updateTime);
        video.addEventListener("loadedmetadata", updateTime);

        return () => {
            video.removeEventListener("timeupdate", updateTime);
            video.removeEventListener("loadedmetadata", updateTime);
        };
    }, []);

    // Track chunk view (x402 micropayment)
    const trackChunkView = useCallback(async (chunkIndex: number) => {
        if (!blockchainVideoId || !publicKey) {
            console.log("Missing video ID or wallet");
            return false;
        }

        try {
            // In production, this would include the actual x402 payment proof
            // For now, we simulate the chunk view tracking
            await x402API.trackChunkView({
                videoId: blockchainVideoId,
                segment: `chunk-${chunkIndex}`,
                paymentProof: `proof-${Date.now()}-${chunkIndex}`, // Replace with actual x402 proof
                viewerPubkey: publicKey.toString(),
            });

            setChunksWatched(prev => prev + 1);
            setLastWatchedChunk(chunkIndex);
            setTotalSpent(prev => prev + pricePerChunk);

            console.log(`Chunk ${chunkIndex} tracked via x402`);
            return true;
        } catch (error: any) {
            console.error("x402 tracking error:", error);
            return false;
        }
    }, [blockchainVideoId, publicKey, pricePerChunk]);

    // Track chunks as video plays (every 10 seconds = 1 chunk)
    useEffect(() => {
        if (!isPlaying || !blockchainVideoId || paymentStatus !== "approved") return;

        const CHUNK_DURATION = 10; // 10 seconds per chunk
        const newChunkIndex = Math.floor(currentTime / CHUNK_DURATION);

        if (newChunkIndex > currentChunkIndex && newChunkIndex <= chunksApproved) {
            setCurrentChunkIndex(newChunkIndex);
            trackChunkView(newChunkIndex);
        }
    }, [currentTime, isPlaying, blockchainVideoId, paymentStatus, currentChunkIndex, chunksApproved, trackChunkView]);

    // Approve streaming session
    const approveStreaming = async () => {
        if (!connected || !publicKey) {
            toast.error("Wallet not connected", {
                description: "Please connect your wallet to watch this video",
            });
            return;
        }

        if (!blockchainService || !blockchainVideoId) {
            toast.error("Blockchain not available", {
                description: "This video requires blockchain payment",
            });
            return;
        }

        setPaymentStatus("approving");

        try {
            const maxChunks = Math.min(totalChunks, 100); // Approve first 100 chunks
            const requiredAmount = BigInt(Math.floor(maxChunks * pricePerChunk * 1_000_000));

            // Check balance
            if (tokenBalance < requiredAmount) {
                toast.error("Insufficient balance", {
                    description: `You need ${formatTokenAmount(requiredAmount)} tokens. You have ${formatTokenAmount(tokenBalance)}`,
                });
                setPaymentStatus("error");
                return;
            }

            toast.info("Approving streaming session...", {
                description: "Please confirm the transaction in your wallet",
            });

            const result = await blockchainService.approveStreaming({
                videoId: blockchainVideoId,
                maxChunks,
            });

            setSessionPda(result.sessionPda);
            setChunksApproved(maxChunks);
            setPaymentStatus("approved");

            toast.success("Session approved!", {
                description: `You can now watch up to ${maxChunks} chunks`,
            });

            // Start playing
            if (videoRef.current) {
                videoRef.current.play();
                setIsPlaying(true);
            }
        } catch (error: any) {
            console.error("Approval error:", error);
            toast.error("Approval failed", {
                description: error.message || "Could not approve streaming session",
            });
            setPaymentStatus("error");
        }
    };

    // Play/Pause
    const togglePlay = () => {
        if (!videoRef.current) return;

        if (paymentStatus === "idle" && blockchainVideoId) {
            // Need to approve first
            toast.info("Payment required", {
                description: "Please approve payment to watch this video",
            });
            return;
        }

        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    // Volume
    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (value: number[]) => {
        if (!videoRef.current) return;
        const newVolume = value[0];
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    };

    // Seek
    const handleSeek = (value: number[]) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = value[0];
    };

    // Fullscreen
    const toggleFullscreen = () => {
        if (!videoRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            videoRef.current.requestFullscreen();
        }
    };

    // Format time
    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const requiresPayment = !!blockchainVideoId;
    const canPlay = !requiresPayment || paymentStatus === "approved";
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle>{title || "Video"}</CardTitle>
                        {creator && (
                            <CardDescription>By {creator}</CardDescription>
                        )}
                    </div>
                    {requiresPayment && (
                        <Badge variant={paymentStatus === "approved" ? "default" : "secondary"}>
                            {paymentStatus === "approved" ? "Session Active" : "Payment Required"}
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Video Player */}
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <video
                        ref={videoRef}
                        className="w-full h-full"
                        onClick={togglePlay}
                    />

                    {/* Loading overlay */}
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Loader2 className="h-12 w-12 animate-spin text-white" />
                        </div>
                    )}

                    {/* Payment required overlay */}
                    {requiresPayment && (paymentStatus === "idle" || paymentStatus === "approving") && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                            <div className="text-center space-y-4 p-6">
                                <Wallet className="h-16 w-16 mx-auto text-white" />
                                <div className="text-white">
                                    <h3 className="text-xl font-bold mb-2">Payment Required</h3>
                                    <p className="text-sm text-gray-300 mb-4">
                                        This video costs {formatTokenAmount(BigInt(Math.floor(pricePerChunk * totalChunks * 1_000_000)))} tokens
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {pricePerChunk} tokens per chunk × {totalChunks} chunks
                                    </p>
                                </div>
                                <Button
                                    onClick={approveStreaming}
                                    disabled={!connected || paymentStatus !== "idle"}
                                    size="lg"
                                >
                                    {paymentStatus === "approving" ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Approving...
                                        </>
                                    ) : (
                                        <>
                                            <Coins className="mr-2 h-4 w-4" />
                                            Approve & Watch
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4">
                        {/* Progress bar */}
                        <div className="mb-2">
                            <input
                                type="range"
                                min={0}
                                max={duration || 0}
                                value={currentTime}
                                onChange={(e) => handleSeek([parseFloat(e.target.value)])}
                                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #4b5563 ${progress}%, #4b5563 100%)`,
                                }}
                            />
                        </div>

                        {/* Control buttons */}
                        <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={togglePlay}
                                    disabled={!canPlay}
                                    className="text-white hover:text-white hover:bg-white/20"
                                >
                                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleMute}
                                    className="text-white hover:text-white hover:bg-white/20"
                                >
                                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                </Button>

                                <span className="text-sm">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </span>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleFullscreen}
                                className="text-white hover:text-white hover:bg-white/20"
                            >
                                <Maximize className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Payment Stats */}
                {requiresPayment && paymentStatus !== "idle" && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Approved</p>
                            <p className="text-2xl font-bold">{chunksApproved}</p>
                            <p className="text-xs text-muted-foreground">chunks</p>
                        </div>

                        <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Consumed</p>
                            <p className="text-2xl font-bold">{chunksWatched}</p>
                            <p className="text-xs text-muted-foreground">chunks</p>
                        </div>

                        <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Total Spent</p>
                            <p className="text-2xl font-bold">{totalSpent.toFixed(3)}</p>
                            <p className="text-xs text-muted-foreground">tokens</p>
                        </div>

                        <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Balance</p>
                            <p className="text-2xl font-bold">{formatTokenAmount(tokenBalance)}</p>
                            <p className="text-xs text-muted-foreground">tokens</p>
                        </div>
                    </div>
                )}

                {/* Settlement Stats Widget */}
                {requiresPayment && paymentStatus === "approved" && blockchainVideoId && (
                    <SettlementStats
                        videoId={blockchainVideoId}
                        onSettleClick={() => setShowSettlementDialog(true)}
                    />
                )}

                {/* Settlement Dialog */}
                {blockchainVideoId && (
                    <SettlementDialog
                        open={showSettlementDialog}
                        onOpenChange={setShowSettlementDialog}
                        videoId={blockchainVideoId}
                        onSettled={() => {
                            setChunksWatched(0);
                            setCurrentChunkIndex(0);
                            toast.success("Settlement completed!", {
                                description: "Your chunks have been settled on-chain",
                            });
                        }}
                    />
                )}

                {/* Status Messages */}
                {paymentStatus === "error" && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive rounded-lg">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <p className="text-sm text-destructive">Payment error occurred. Please try again.</p>
                    </div>
                )}

                {paymentStatus === "approved" && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <p className="text-sm text-green-700 dark:text-green-400">
                            Streaming session approved. Enjoy your video!
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
