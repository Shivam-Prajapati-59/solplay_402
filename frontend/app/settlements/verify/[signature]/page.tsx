"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Loader2,
    ExternalLink,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Coins,
    Clock,
    Hash,
    User,
} from "lucide-react";
import { settlementsAPI, type Settlement } from "@/data/settlements.api";
import Link from "next/link";

export default function SettlementVerificationPage() {
    const params = useParams();
    const signature = params.signature as string;

    const [settlement, setSettlement] = useState<Settlement | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (signature) {
            loadSettlement();
        }
    }, [signature]);

    const loadSettlement = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await settlementsAPI.getSettlementBySignature(signature);
            setSettlement(response.settlement.settlement);
        } catch (err: any) {
            console.error("Failed to load settlement:", err);
            setError(err.message || "Settlement not found");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className="container mx-auto py-12 max-w-4xl">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-6 w-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !settlement) {
        return (
            <div className="container mx-auto py-12 max-w-4xl">
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center space-y-4">
                            <XCircle className="h-16 w-16 mx-auto text-destructive" />
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Settlement Not Found</h2>
                                <p className="text-muted-foreground">
                                    {error || "The requested settlement could not be found"}
                                </p>
                            </div>
                            <div className="pt-4">
                                <Link href="/viewer/dashboard">
                                    <Button>Back to Dashboard</Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    Settlement Verified
                </h1>
                <p className="text-muted-foreground mt-1">
                    On-chain settlement transaction details
                </p>
            </div>

            {/* Transaction Signature */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Transaction Signature
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg break-all font-mono text-sm">
                        {settlement.transactionSignature}
                    </div>
                    <Button
                        onClick={() =>
                            window.open(
                                settlementsAPI.getSolanaExplorerUrl(settlement.transactionSignature),
                                "_blank"
                            )
                        }
                        className="w-full"
                    >
                        View on Solana Explorer
                        <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>

            {/* Settlement Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        Settlement Details
                    </CardTitle>
                    <CardDescription>Payment breakdown and chunk information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Chunks Settled</p>
                            <p className="text-3xl font-bold">{settlement.chunkCount}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Total Payment</p>
                            <p className="text-3xl font-bold">
                                {settlementsAPI.formatSettlementAmount(settlement.totalPayment)} SOL
                            </p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Platform Fee (5%)</p>
                            <p className="text-3xl font-bold">
                                {settlementsAPI.formatSettlementAmount(settlement.platformFee)} SOL
                            </p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Creator Received</p>
                            <p className="text-3xl font-bold text-green-600">
                                {settlementsAPI.formatSettlementAmount(settlement.creatorAmount)} SOL
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">Chunks Consumed After</span>
                            <span className="font-mono font-semibold">
                                {settlement.chunksConsumedAfter}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">Chunks Remaining</span>
                            <span className="font-mono font-semibold">
                                {settlement.chunksRemaining}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Blockchain Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Blockchain Information
                    </CardTitle>
                    <CardDescription>On-chain transaction metadata</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">Settlement Time</span>
                        <span className="font-mono text-sm">
                            {formatDate(settlement.settlementTimestamp)}
                        </span>
                    </div>
                    {settlement.blockTime && (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">Block Time</span>
                            <span className="font-mono text-sm">
                                {formatDate(settlement.blockTime)}
                            </span>
                        </div>
                    )}
                    {settlement.slot && (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">Slot</span>
                            <span className="font-mono text-sm">{settlement.slot}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm text-muted-foreground">Recorded</span>
                        <span className="font-mono text-sm">
                            {formatDate(settlement.createdAt)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Participants */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Participants
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Viewer (Paid)</p>
                        <div className="p-3 bg-muted rounded-lg break-all font-mono text-sm">
                            {settlement.viewerPubkey}
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Creator (Received)</p>
                        <div className="p-3 bg-muted rounded-lg break-all font-mono text-sm">
                            {settlement.creatorPubkey}
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Video ID</p>
                        <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                            #{settlement.videoId}
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Session ID</p>
                        <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                            #{settlement.sessionId}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info Alert */}
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This settlement has been verified on the Solana blockchain. All transactions are
                    transparent and immutable. Click "View on Solana Explorer" to see the complete
                    transaction details on-chain.
                </AlertDescription>
            </Alert>
        </div>
    );
}
