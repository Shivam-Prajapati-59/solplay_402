"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Coins, Clock, TrendingUp } from "lucide-react";
import { x402API } from "@/data/x402.api";

interface SettlementStatsProps {
    videoId: string;
    onSettleClick?: () => void;
}

export function SettlementStats({
    videoId,
    onSettleClick,
}: SettlementStatsProps) {
    const { publicKey, connected } = useWallet();
    const [unsettledChunks, setUnsettledChunks] = useState(0);
    const [estimatedValue, setEstimatedValue] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (connected && publicKey) {
            loadStats();
        }
    }, [connected, publicKey, videoId]);

    const loadStats = async () => {
        try {
            setLoading(true);

            const data = await x402API.getUnsettledChunkCount(
                videoId,
                publicKey!.toString()
            );

            setUnsettledChunks(data.unsettledChunks);

            // Estimate value (assuming 0.001 SOL per chunk)
            const estimated = data.unsettledChunks * 0.001;
            setEstimatedValue(estimated);
        } catch (err: any) {
            console.error("Failed to load settlement stats:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!connected) {
        return null;
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="py-6">
                    <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (unsettledChunks === 0) {
        return null;
    }

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-primary" />
                    Pending Settlement
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Unsettled Chunks</p>
                        <p className="text-2xl font-bold">{unsettledChunks}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Estimated Value</p>
                        <p className="text-2xl font-bold flex items-center">
                            <Coins className="mr-1 h-5 w-5 text-primary" />
                            {estimatedValue.toFixed(4)} SOL
                        </p>
                    </div>
                </div>

                <Button onClick={onSettleClick} className="w-full" size="lg">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Settle Now
                </Button>

                <p className="text-xs text-muted-foreground mt-3 text-center">
                    Save on fees by settling in batches
                </p>
            </CardContent>
        </Card>
    );
}
