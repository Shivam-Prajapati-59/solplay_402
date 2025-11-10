"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Activity, Play, DollarSign } from "lucide-react";
import { SettlementDialog } from "@/components/custom/SettlementDialog";
import apiClient from "@/data/api-client";

interface ActiveSession {
    id: number;
    videoId: number;
    videoTitle: string;
    sessionPda: string;
    maxApprovedChunks: number;
    chunksConsumed: number;
    totalSpent: number;
    isActive: boolean;
}

export function ActiveSessionsWidget() {
    const { publicKey } = useWallet();
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
    const [showSettlement, setShowSettlement] = useState(false);

    useEffect(() => {
        if (publicKey) {
            loadActiveSessions();
        }
    }, [publicKey]);

    const loadActiveSessions = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(
                `/api/blockchain/sessions/viewer/${publicKey?.toString()}`
            );
            setSessions(response.data.sessions || []);
        } catch (error) {
            console.error("Failed to load active sessions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = (videoId: number) => {
        setSelectedVideoId(videoId.toString());
        setShowSettlement(true);
    };

    const handleSettlementComplete = () => {
        loadActiveSessions();
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    if (sessions.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active sessions</p>
                    <p className="text-sm mt-2">
                        Start watching a video to create a session
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session) => {
                    const progress =
                        (session.chunksConsumed / session.maxApprovedChunks) * 100;
                    const remaining =
                        session.maxApprovedChunks - session.chunksConsumed;

                    return (
                        <Card key={session.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <CardTitle className="text-base line-clamp-2">
                                        {session.videoTitle}
                                    </CardTitle>
                                    {session.isActive && (
                                        <Badge variant="default" className="shrink-0 ml-2">
                                            Active
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Progress */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Chunks watched
                                        </span>
                                        <span className="font-mono font-semibold">
                                            {session.chunksConsumed} /{" "}
                                            {session.maxApprovedChunks}
                                        </span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{remaining} chunks remaining</span>
                                        <span>{progress.toFixed(0)}%</span>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="space-y-2 pt-2 border-t">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <DollarSign className="h-3 w-3" />
                                            Total spent
                                        </span>
                                        <span className="font-mono font-semibold">
                                            {(session.totalSpent / 1e9).toFixed(4)} SOL
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() =>
                                            (window.location.href = `/viewer/watch/${session.videoId}`)
                                        }
                                    >
                                        <Play className="h-3 w-3 mr-1" />
                                        Resume
                                    </Button>
                                    {session.chunksConsumed > 0 && (
                                        <Button
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleSettle(session.videoId)}
                                        >
                                            Settle Now
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Settlement Dialog */}
            {selectedVideoId && (
                <SettlementDialog
                    open={showSettlement}
                    onOpenChange={setShowSettlement}
                    videoId={selectedVideoId}
                    onSettled={handleSettlementComplete}
                />
            )}
        </>
    );
}
