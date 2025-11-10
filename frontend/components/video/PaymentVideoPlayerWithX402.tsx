/**
 * Example: Integrating x402 Client into PaymentVideoPlayer
 * 
 * This shows how to modify the existing PaymentVideoPlayer to use
 * the new x402 client with delegate-based payments.
 * 
 * Key Changes:
 * 1. Use useX402 hook instead of direct API calls
 * 2. Automatically track chunks as video plays
 * 3. Handle HLS segment loading with payment tracking
 * 4. Cache session PDA after approval
 */

import React, { useRef, useEffect, useState } from "react";
import Hls from "hls.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useX402 } from "@/hooks/useX402";
import { useBlockchain } from "@/hooks/useBlockchain";
import { SettlementDialog } from "@/components/custom/SettlementDialog";
import { SettlementStats } from "@/components/custom/SettlementStats";

interface PaymentVideoPlayerProps {
    videoId: string;
    playlistUrl: string;
    pricePerChunk: number;
    title: string;
    creatorPubkey: string;
}

export function PaymentVideoPlayerWithX402({
    videoId,
    playlistUrl,
    pricePerChunk,
    title,
    creatorPubkey,
}: PaymentVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const { publicKey, connected } = useWallet();
    const { service, isInitialized } = useBlockchain();

    // Use x402 hook for payment tracking
    const {
        fetchChunk,
        isReady,
        cacheSessionPda,
        getUnsettledCount
    } = useX402(publicKey);

    const [approved, setApproved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentChunk, setCurrentChunk] = useState(0);
    const [unsettledChunks, setUnsettledChunks] = useState(0);
    const [showSettlement, setShowSettlement] = useState(false);

    // Track which chunks have been loaded/paid for
    const loadedChunksRef = useRef<Set<number>>(new Set());

    /**
     * Approve streaming session
     */
    const handleApprove = async () => {
        if (!publicKey || !isInitialized || !service) return;

        setLoading(true);
        try {
            const maxChunks = 100; // Default: approve 100 chunks

            console.log(`🔐 Approving streaming session for ${maxChunks} chunks...`);

            const { sessionPda } = await service.approveStreaming({
                videoId,
                maxChunks,
            });

            console.log(`✅ Session approved! PDA: ${sessionPda}`);

            // Cache the session PDA for x402 tracking
            cacheSessionPda(videoId, sessionPda);

            setApproved(true);
        } catch (error) {
            console.error("❌ Failed to approve streaming:", error);
            alert("Failed to approve streaming session");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Initialize HLS player with x402 chunk tracking
     */
    useEffect(() => {
        if (!videoRef.current || !approved || !isReady) return;

        const video = videoRef.current;

        if (Hls.isSupported()) {
            const hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: false,
            });

            // Load the playlist
            hls.loadSource(playlistUrl);
            hls.attachMedia(video);

            // Track segment loading
            hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
                const segmentIndex = data.frag.sn;

                // Skip init segments
                if (typeof segmentIndex !== 'number') return;

                // Only track if we haven't loaded this chunk yet
                if (!loadedChunksRef.current.has(segmentIndex)) {
                    console.log(`📊 Loading chunk ${segmentIndex}...`);

                    // Track chunk view via x402
                    fetchChunk(videoId, segmentIndex)
                        .then(() => {
                            console.log(`✅ Chunk ${segmentIndex} tracked`);
                            loadedChunksRef.current.add(segmentIndex);
                            setCurrentChunk(segmentIndex);
                        })
                        .catch((error) => {
                            console.error(`❌ Failed to track chunk ${segmentIndex}:`, error);

                            // If payment approval needed, pause video
                            if (error.message.includes("approval required")) {
                                hls.stopLoad();
                                alert(error.message);
                            }

                            // If settlement needed, pause video
                            if (error.message.includes("Settlement required")) {
                                hls.stopLoad();
                                setShowSettlement(true);
                            }
                        });
                }
            });

            // Handle errors
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error("Network error", data);
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error("Media error", data);
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error("Fatal error", data);
                            hls.destroy();
                            break;
                    }
                }
            });

            hlsRef.current = hls;

            return () => {
                hls.destroy();
            };
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            // Native HLS support (Safari)
            video.src = playlistUrl;

            // Track chunks manually for native HLS
            video.addEventListener("timeupdate", () => {
                const currentTime = video.currentTime;
                const segmentDuration = 10; // Assume 10s segments
                const segmentIndex = Math.floor(currentTime / segmentDuration);

                if (!loadedChunksRef.current.has(segmentIndex)) {
                    fetchChunk(videoId, segmentIndex)
                        .then(() => {
                            loadedChunksRef.current.add(segmentIndex);
                            setCurrentChunk(segmentIndex);
                        })
                        .catch(console.error);
                }
            });
        }
    }, [videoRef, approved, isReady, playlistUrl, videoId, fetchChunk]);

    /**
     * Periodically update unsettled chunk count
     */
    useEffect(() => {
        if (!approved || !isReady) return;

        const updateUnsettled = async () => {
            try {
                const count = await getUnsettledCount(videoId);
                setUnsettledChunks(count);
            } catch (error) {
                console.error("Failed to get unsettled count:", error);
            }
        };

        // Update immediately
        updateUnsettled();

        // Update every 10 seconds
        const interval = setInterval(updateUnsettled, 10000);

        return () => clearInterval(interval);
    }, [approved, isReady, videoId, getUnsettledCount]);

    return (
        <div className="space-y-4">
            {/* Video Player */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {!approved ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm">
                        <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
                        <p className="text-white/80 mb-6">
                            Price: {pricePerChunk} SOL per chunk (10 seconds)
                        </p>
                        <button
                            onClick={handleApprove}
                            disabled={!connected || loading}
                            className="px-6 py-3 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Approving..." : "Approve & Watch"}
                        </button>
                        {!connected && (
                            <p className="text-white/60 text-sm mt-4">
                                Please connect your wallet to watch
                            </p>
                        )}
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        controls
                        className="w-full h-full"
                        playsInline
                    />
                )}
            </div>

            {/* Settlement Stats */}
            {approved && (
                <div className="grid grid-cols-1 gap-4">
                    <SettlementStats
                        videoId={videoId}
                        onSettleClick={() => setShowSettlement(true)}
                    />

                    {/* Unsettled Chunks Widget */}
                    {unsettledChunks > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <p className="text-yellow-400 font-semibold">
                                {unsettledChunks} chunks pending settlement
                            </p>
                            <button
                                onClick={() => setShowSettlement(true)}
                                className="mt-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 font-semibold"
                            >
                                Settle Now
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Settlement Dialog */}
            {showSettlement && (
                <SettlementDialog
                    videoId={videoId}
                    open={showSettlement}
                    onOpenChange={setShowSettlement}
                />
            )}

            {/* Debug Info */}
            {approved && (
                <div className="text-sm text-white/60 space-y-1">
                    <p>Current chunk: {currentChunk}</p>
                    <p>Total chunks loaded: {loadedChunksRef.current.size}</p>
                    <p>Unsettled chunks: {unsettledChunks}</p>
                </div>
            )}
        </div>
    );
}

export default PaymentVideoPlayerWithX402;
