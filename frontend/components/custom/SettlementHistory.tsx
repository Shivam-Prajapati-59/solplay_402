"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink, Eye } from "lucide-react";
import { settlementsAPI } from "@/data/settlements.api";
import type { Settlement } from "@/data/settlements.api";

interface SettlementHistoryProps {
    mode: "viewer" | "creator";
    videoId?: string;
    limit?: number;
}

export function SettlementHistory({
    mode,
    videoId,
    limit = 10,
}: SettlementHistoryProps) {
    const { publicKey } = useWallet();
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (publicKey) {
            loadSettlements();
        }
    }, [publicKey, videoId, mode]);

    const loadSettlements = async () => {
        try {
            setLoading(true);
            setError(null);

            if (videoId) {
                const response = await settlementsAPI.getVideoSettlements(
                    parseInt(videoId),
                    { limit }
                );
                setSettlements(response.settlements);
            } else if (mode === "viewer") {
                const response = await settlementsAPI.getViewerSettlements(
                    publicKey!.toString(),
                    { limit }
                );
                setSettlements(response.settlements.map((sw) => sw.settlement));
            } else {
                const response = await settlementsAPI.getCreatorSettlements(
                    publicKey!.toString(),
                    { limit }
                );
                setSettlements(response.settlements.map((sw) => sw.settlement));
            }
        } catch (err: any) {
            console.error("Failed to load settlements:", err);
            setError(err.message || "Failed to load settlement history");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const truncateSignature = (signature: string) => {
        return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-red-500">{error}</p>
                <Button onClick={loadSettlements} className="mt-4" variant="outline">
                    Retry
                </Button>
            </div>
        );
    }

    if (settlements.length === 0) {
        return (
            <Card>
                <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                        <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No settlements yet</p>
                        <p className="text-sm mt-2">
                            {mode === "viewer"
                                ? "Start watching content to see your settlement history"
                                : "Settlements will appear here when viewers watch your content"}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Settlement History</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Chunks</TableHead>
                                {!videoId && <TableHead>Video</TableHead>}
                                <TableHead>Amount</TableHead>
                                {mode === "creator" && <TableHead>Platform Fee</TableHead>}
                                <TableHead>Transaction</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {settlements.map((settlement) => (
                                <TableRow key={settlement.id}>
                                    <TableCell className="font-mono text-sm">
                                        {formatDate(settlement.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{settlement.chunkCount}</Badge>
                                    </TableCell>
                                    {!videoId && (
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            Video #{settlement.videoId}
                                        </TableCell>
                                    )}
                                    <TableCell className="font-mono font-semibold">
                                        {settlementsAPI.formatSettlementAmount(
                                            mode === "creator"
                                                ? settlement.creatorAmount
                                                : settlement.totalPayment
                                        )}{" "}
                                        SOL
                                    </TableCell>
                                    {mode === "creator" && (
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {settlementsAPI.formatSettlementAmount(
                                                settlement.platformFee
                                            )}{" "}
                                            SOL
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                window.open(
                                                    settlementsAPI.getSolanaExplorerUrl(
                                                        settlement.transactionSignature
                                                    ),
                                                    "_blank"
                                                )
                                            }
                                            className="font-mono"
                                        >
                                            {truncateSignature(settlement.transactionSignature)}
                                            <ExternalLink className="ml-2 h-3 w-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {settlements.length >= limit && (
                    <div className="mt-4 text-center">
                        <Button variant="outline" onClick={loadSettlements}>
                            Load More
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
