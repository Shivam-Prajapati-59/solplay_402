"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, Lock, Unlock } from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";
import { WalletButton } from "../custom/WalletButton";
import { toast } from "sonner";

interface StreamingSessionManagerProps {
    videoId: string;
    videoTitle: string;
    pricePerChunk: number;
    totalChunks: number;
    onApproved: (sessionPda: string) => void;
    onCancel?: () => void;
}

export function StreamingSessionManager({
    videoId,
    videoTitle,
    pricePerChunk,
    totalChunks,
    onApproved,
    onCancel,
}: StreamingSessionManagerProps) {
    const { connected, publicKey } = useWallet();
    const { service, isInitialized } = useBlockchain();

    const [open, setOpen] = useState(true);
    const [maxChunks, setMaxChunks] = useState(100);
    const [loading, setLoading] = useState(false);
    const [approved, setApproved] = useState(false);

    const estimatedCost = (maxChunks * pricePerChunk).toFixed(4);
    const totalVideoCost = (totalChunks * pricePerChunk).toFixed(4);

    const handleApprove = async () => {
        if (!publicKey || !isInitialized || !service) {
            toast.error("Please connect your wallet first");
            return;
        }

        if (maxChunks < 1) {
            toast.error("Please approve at least 1 chunk");
            return;
        }

        if (maxChunks > totalChunks) {
            toast.warning(
                `Maximum chunks available is ${totalChunks}. Setting to ${totalChunks}.`
            );
            setMaxChunks(totalChunks);
            return;
        }

        setLoading(true);
        try {
            console.log(`🔐 Approving streaming session for ${maxChunks} chunks...`);

            const result = await service.approveStreaming({
                videoId,
                maxChunks,
            });

            console.log(`✅ Session approved! PDA: ${result.sessionPda}`);

            setApproved(true);
            toast.success("Streaming session approved successfully!");

            // Wait a moment to show success state
            setTimeout(() => {
                onApproved(result.sessionPda);
                setOpen(false);
            }, 1500);
        } catch (error: any) {
            console.error("❌ Failed to approve streaming:", error);
            toast.error(error.message || "Failed to approve streaming session");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setOpen(false);
        onCancel?.();
    };

    if (!connected) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Connect Wallet</DialogTitle>
                        <DialogDescription>
                            Please connect your wallet to start streaming
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        <Lock className="h-12 w-12 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                            You need to connect your Solana wallet to watch this video
                        </p>
                        <WalletButton />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {approved ? (
                            <>
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                Streaming Approved
                            </>
                        ) : (
                            <>
                                <Unlock className="h-5 w-5 text-primary" />
                                Approve Streaming Session
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {approved
                            ? "Your streaming session has been approved. Starting video..."
                            : "Approve token delegation to start watching this video"}
                    </DialogDescription>
                </DialogHeader>

                {!approved && (
                    <div className="space-y-4 py-4">
                        {/* Video Info */}
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                            <h4 className="font-semibold">{videoTitle}</h4>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Price per chunk:
                                </span>
                                <Badge variant="secondary">
                                    {pricePerChunk} SOL
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Total chunks:</span>
                                <span className="font-mono">{totalChunks}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Full video cost:
                                </span>
                                <span className="font-mono font-semibold">
                                    {totalVideoCost} SOL
                                </span>
                            </div>
                        </div>

                        {/* Approval Settings */}
                        <div className="space-y-2">
                            <Label htmlFor="maxChunks">
                                Approve Maximum Chunks
                            </Label>
                            <Input
                                id="maxChunks"
                                type="number"
                                min={1}
                                max={totalChunks}
                                value={maxChunks}
                                onChange={(e) =>
                                    setMaxChunks(parseInt(e.target.value) || 0)
                                }
                                disabled={loading}
                            />
                            <p className="text-sm text-muted-foreground">
                                You can approve fewer chunks and settle more later
                            </p>
                        </div>

                        {/* Cost Estimate */}
                        <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold">Estimated Cost:</span>
                                <span className="text-lg font-bold text-primary">
                                    {estimatedCost} SOL
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                This is the maximum you'll spend for {maxChunks} chunks
                            </p>
                        </div>

                        {/* Info Alert */}
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg flex gap-2">
                            <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-900 dark:text-blue-100">
                                <p className="font-semibold mb-1">How it works:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>Approve delegation once (no private key needed)</li>
                                    <li>Watch video chunks tracked via x402 HTTP</li>
                                    <li>Settle payment in batches when ready</li>
                                    <li>99% gas savings vs per-chunk payments</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {approved && (
                    <div className="py-8 flex flex-col items-center gap-4">
                        <div className="relative">
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                        </div>
                        <p className="text-center text-muted-foreground">
                            Session approved successfully!
                            <br />
                            <span className="text-sm">Starting video player...</span>
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {!approved && (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleCancel}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleApprove} disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Approving...
                                    </>
                                ) : (
                                    <>
                                        <Unlock className="h-4 w-4 mr-2" />
                                        Approve & Watch
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
