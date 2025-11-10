"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, Activity, CheckCircle2, PlayCircle, XCircle } from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { toast } from "sonner";

interface SessionInfo {
    sessionPda: string;
    videoId: string;
    maxApprovedChunks: number;
    chunksConsumed: number;
    totalSpent: number;
    approvedPricePerChunk: number;
    sessionStart: Date;
    lastActivity: Date;
    chunksRemaining: number;
}

export default function SessionsPage() {
    const { connected, publicKey } = useWallet();
    const { service: blockchainService, isInitialized } = useBlockchain();
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState<SessionInfo[]>([]);

    useEffect(() => {
        if (connected && publicKey && isInitialized) {
            // In a real app, you'd fetch active sessions from backend
            // For now, this is a placeholder
            loadSessions();
        }
    }, [connected, publicKey, isInitialized]);

    const loadSessions = async () => {
        setLoading(true);
        try {
            // TODO: Implement backend endpoint to fetch user's active sessions
            // This would query the blockchain for all viewer sessions for this user
            setSessions([]);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        } finally {
            setLoading(false);
        }
    };

    const approveSession = async (videoId: string, maxChunks: number) => {
        if (!blockchainService || !publicKey) return;

        try {
            toast.info("Approving session...", {
                description: "Please confirm the transaction in your wallet",
            });

            await blockchainService.approveStreaming({
                videoId,
                maxChunks,
            });

            toast.success("Session approved!", {
                description: `You can now watch up to ${maxChunks} chunks`,
            });

            loadSessions();
        } catch (error: any) {
            toast.error("Approval failed", {
                description: error.message || "Could not approve session",
            });
        }
    };

    if (!connected) {
        return (
            <div className="container mx-auto py-12">
                <Card className="max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle>Session Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center space-y-4">
                            <Activity className="h-16 w-16 mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground">
                                Connect your wallet to manage your streaming sessions
                            </p>
                            <WalletMultiButton />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Session Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your active streaming sessions and delegate approvals
                    </p>
                </div>
                <WalletMultiButton />
            </div>

            <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="active">Active Sessions</TabsTrigger>
                    <TabsTrigger value="history">Session History</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                    {loading ? (
                        <Card>
                            <CardContent className="py-12 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </CardContent>
                        </Card>
                    ) : sessions.length === 0 ? (
                        <Card>
                            <CardContent className="py-12">
                                <div className="text-center text-muted-foreground">
                                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-semibold">No Active Sessions</p>
                                    <p className="text-sm mt-2">
                                        Start watching a video to create a new session
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {sessions.map((session) => {
                                const progress =
                                    (session.chunksConsumed / session.maxApprovedChunks) * 100;
                                const isActive = session.chunksRemaining > 0;

                                return (
                                    <Card key={session.sessionPda}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-lg">
                                                        Video {session.videoId.slice(0, 12)}...
                                                    </CardTitle>
                                                    <CardDescription>
                                                        Session started{" "}
                                                        {new Date(session.sessionStart).toLocaleDateString()}
                                                    </CardDescription>
                                                </div>
                                                <Badge variant={isActive ? "default" : "secondary"}>
                                                    {isActive ? (
                                                        <>
                                                            <PlayCircle className="mr-1 h-3 w-3" />
                                                            Active
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="mr-1 h-3 w-3" />
                                                            Completed
                                                        </>
                                                    )}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Approved Chunks
                                                    </p>
                                                    <p className="text-2xl font-bold">
                                                        {session.maxApprovedChunks}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Consumed
                                                    </p>
                                                    <p className="text-2xl font-bold">
                                                        {session.chunksConsumed}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Remaining
                                                    </p>
                                                    <p className="text-2xl font-bold">
                                                        {session.chunksRemaining}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Total Spent
                                                    </p>
                                                    <p className="text-2xl font-bold">
                                                        {(session.totalSpent / 1_000_000_000).toFixed(4)} SOL
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Progress</span>
                                                    <span className="font-mono">
                                                        {progress.toFixed(0)}%
                                                    </span>
                                                </div>
                                                <Progress value={progress} />
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>Price per chunk:</span>
                                                <span className="font-mono">
                                                    {(
                                                        session.approvedPricePerChunk / 1_000_000_000
                                                    ).toFixed(6)}{" "}
                                                    SOL
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    Last activity:{" "}
                                                    {new Date(session.lastActivity).toLocaleString()}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Session history will be displayed here</p>
                            <p className="text-sm mt-2">
                                View your past streaming sessions and settlements
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                        Approve a new streaming session for a video
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">
                        <p className="mb-2">
                            To approve a new session, navigate to a video and click the
                            "Approve & Watch" button.
                        </p>
                        <p>
                            Sessions allow you to pre-approve a number of chunks for streaming
                            with batch settlement for lower fees.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
