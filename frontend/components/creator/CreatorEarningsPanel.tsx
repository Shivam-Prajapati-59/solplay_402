// =============================================================================
// Creator Earnings Dashboard Component
// =============================================================================
// Displays blockchain earnings with real-time statistics
// =============================================================================

"use client";

import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingUp, Users, Video, Wallet, AlertCircle } from "lucide-react";
import { formatTokenAmount } from "@/lib/anchor/token-utils";
import { settlementsAPI } from "@/data/settlements.api";
import { SettlementHistory } from "@/components/custom/SettlementHistory";

interface VideoEarnings {
    videoId: string;
    title: string;
    totalEarned: bigint;
    totalChunksServed: number;
    totalSessions: number;
}

export default function CreatorEarningsPanel() {
    const { publicKey, connected } = useWallet();
    const { service: blockchainService, isInitialized } = useBlockchain();

    const [loading, setLoading] = useState(true);
    const [totalEarnings, setTotalEarnings] = useState<bigint>(BigInt(0));
    const [settlementEarnings, setSettlementEarnings] = useState(0); // In lamports
    const [totalSettlements, setTotalSettlements] = useState(0);
    const [videoEarnings, setVideoEarnings] = useState<VideoEarnings[]>([]);
    const [totalViews, setTotalViews] = useState(0);
    const [totalVideos, setTotalVideos] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isInitialized && publicKey) {
            loadEarnings();
        }
    }, [isInitialized, publicKey]);

    const loadEarnings = async () => {
        if (!publicKey) return;

        setLoading(true);
        setError(null);

        try {
            // Fetch settlement-based earnings from backend
            const settlementsData = await settlementsAPI.getCreatorSettlements(
                publicKey.toString(),
                { limit: 1000 } // Get all settlements for accurate totals
            );

            setSettlementEarnings(settlementsData.totalEarnings);
            setTotalSettlements(settlementsData.count);

            // Calculate total chunks from settlements
            const totalChunks = settlementsData.settlements.reduce(
                (sum, sw) => sum + sw.settlement.chunkCount,
                0
            );
            setTotalViews(totalChunks);

            // Optionally also fetch blockchain earnings (for comparison/legacy)
            if (blockchainService) {
                try {
                    const earnings = await blockchainService.getCreatorEarnings(publicKey.toBase58());
                    if (earnings) {
                        setTotalEarnings(earnings.totalEarned);
                    }
                } catch (err) {
                    console.warn("Could not fetch blockchain earnings:", err);
                }
            }

            // TODO: Aggregate video earnings from settlements
            setVideoEarnings([]);

        } catch (err: any) {
            console.error("Error loading earnings:", err);
            setError(err.message || "Failed to load earnings");
        } finally {
            setLoading(false);
        }
    };

    if (!connected) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Creator Earnings
                    </CardTitle>
                    <CardDescription>Connect your wallet to view earnings</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                        Please connect your wallet to view your creator earnings
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Creator Earnings</CardTitle>
                    <CardDescription>Loading your earnings...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        Error Loading Earnings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{error}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        Creator Earnings Dashboard
                    </CardTitle>
                    <CardDescription>
                        Your blockchain earnings from video streaming
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Earnings */}
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Coins className="h-4 w-4" />
                                <span>Settlement Earnings</span>
                            </div>
                            <div className="text-3xl font-bold">
                                {settlementsAPI.formatSettlementAmount(settlementEarnings)} SOL
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                From {totalSettlements} settlements
                            </p>
                        </div>

                        {/* Total Settlements */}
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Video className="h-4 w-4" />
                                <span>Total Settlements</span>
                            </div>
                            <div className="text-3xl font-bold">{totalSettlements}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Completed on-chain
                            </p>
                        </div>

                        {/* Total Chunks Served */}
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <TrendingUp className="h-4 w-4" />
                                <span>Chunks Served</span>
                            </div>
                            <div className="text-3xl font-bold">{totalViews.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Total streams
                            </p>
                        </div>

                        {/* Average Per Chunk */}
                        <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Users className="h-4 w-4" />
                                <span>Avg Per Chunk</span>
                            </div>
                            <div className="text-3xl font-bold">
                                {totalViews > 0
                                    ? settlementsAPI.formatSettlementAmount(
                                        Math.floor(settlementEarnings / totalViews)
                                    )
                                    : "0"} SOL
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Per chunk</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Settlement History */}
            <SettlementHistory mode="creator" limit={50} />

            {/* Video Breakdown */}
            {videoEarnings.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Earnings by Video</CardTitle>
                        <CardDescription>
                            Detailed breakdown of earnings per video
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {videoEarnings.map((video) => (
                                <div
                                    key={video.videoId}
                                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <h4 className="font-medium">{video.title}</h4>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                            <span>{video.totalSessions} sessions</span>
                                            <span>•</span>
                                            <span>{video.totalChunksServed} chunks</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold">
                                            {formatTokenAmount(video.totalEarned)}
                                        </div>
                                        <Badge variant="secondary" className="mt-1">
                                            Tokens
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* No Earnings Yet */}
            {settlementEarnings === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Coins className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Settlements Yet</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-md">
                            Your earnings will appear here when viewers watch your content and settle their sessions.
                            Settlements are batched on-chain for efficiency.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
