"use client";

import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { BlockchainService } from "@/lib/anchor/blockchain-service";
import { x402API } from "@/data/x402.api";
import { PLATFORM_AUTHORITY } from "@/lib/anchor/constants";
import { PublicKey } from "@solana/web3.js";

interface SettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  onSettled?: () => void;
}

interface SettlementPreview {
  unsettledChunks: number;
  totalPayment: number;
  platformFee: number;
  creatorAmount: number;
  pricePerChunk: number;
  chunksRemaining?: number;
}

export function SettlementDialog({
  open,
  onOpenChange,
  videoId,
  onSettled,
}: SettlementDialogProps) {
  const { publicKey, connected } = useWallet();
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    signature: string;
    chunkCount: number;
  } | null>(null);

  // Load settlement preview
  useEffect(() => {
    if (open && publicKey) {
      loadPreview();
    }
  }, [open, publicKey, videoId]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get unsettled chunk count first
      const unsettledData = await x402API.getUnsettledChunkCount(
        videoId,
        publicKey!.toString()
      );

      if (unsettledData.unsettledChunks === 0) {
        setPreview({
          unsettledChunks: 0,
          totalPayment: 0,
          platformFee: 0,
          creatorAmount: 0,
          pricePerChunk: 0,
        });
        setLoading(false);
        return;
      }

      // We use a dummy sessionPda since preview endpoint can work with viewer+video params
      const data = await x402API.getSettlementPreview("placeholder", {
        videoId,
        viewerPubkey: publicKey!.toString(),
      });

      // Assume a default price per chunk (can be fetched from session if needed)
      const pricePerChunk =
        data.preview.totalPayment / unsettledData.unsettledChunks || 1_000_000;

      setPreview({
        unsettledChunks: unsettledData.unsettledChunks,
        totalPayment: data.preview.totalPayment,
        platformFee: data.preview.platformFee,
        creatorAmount: data.preview.creatorAmount,
        pricePerChunk,
      });
    } catch (err: any) {
      console.error("Failed to load settlement preview:", err);
      setError(err.message || "Failed to load settlement preview");
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!publicKey || !preview || preview.unsettledChunks === 0) return;

    try {
      setSettling(true);
      setError(null);

      const blockchainService = new BlockchainService();

      const result = await blockchainService.settleSessionBatch({
        videoId,
        chunkCount: preview.unsettledChunks,
        platformAuthority: new PublicKey(PLATFORM_AUTHORITY),
      });

      setSuccess({
        signature: result.signature,
        chunkCount: result.chunkCount,
      });

      // Notify parent component
      if (onSettled) {
        onSettled();
      }
    } catch (err: any) {
      console.error("Settlement failed:", err);
      setError(err.message || "Failed to settle session");
    } finally {
      setSettling(false);
    }
  };

  const getSolanaExplorerUrl = (signature: string) => {
    const cluster = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
    return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
  };

  const handleClose = () => {
    setSuccess(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settle Session</DialogTitle>
          <DialogDescription>
            Batch settlement for your watched content
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success State */}
        {success && (
          <div className="space-y-4">
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Settlement successful! {success.chunkCount} chunks settled
                on-chain.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Transaction Signature</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {success.signature.slice(0, 8)}...
                  {success.signature.slice(-8)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(getSolanaExplorerUrl(success.signature), "_blank")
                }
              >
                View on Explorer
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Preview State */}
        {!loading && !success && preview && (
          <div className="space-y-4">
            {preview.unsettledChunks === 0 ? (
              <Alert>
                <AlertDescription>
                  No unsettled chunks found. Keep watching to accumulate chunks
                  for settlement!
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      Unsettled Chunks
                    </span>
                    <span className="text-lg font-bold">
                      {preview.unsettledChunks}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      Price per Chunk
                    </span>
                    <span className="font-mono">
                      {(preview.pricePerChunk / 1_000_000_000).toFixed(6)} SOL
                    </span>
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Total Payment
                      </span>
                      <span className="font-mono">
                        {(preview.totalPayment / 1_000_000_000).toFixed(6)} SOL
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Platform Fee (5%)
                      </span>
                      <span className="font-mono text-muted-foreground">
                        -{(preview.platformFee / 1_000_000_000).toFixed(6)} SOL
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-semibold">
                        Creator Receives
                      </span>
                      <span className="font-mono font-bold text-primary">
                        {(preview.creatorAmount / 1_000_000_000).toFixed(6)} SOL
                      </span>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertDescription className="text-xs">
                    Settlement is a batch transaction on Solana. You&apos;ll
                    only pay network fees once for all {preview.unsettledChunks}{" "}
                    chunks.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {!success ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSettle}
                disabled={
                  !connected ||
                  settling ||
                  loading ||
                  !preview ||
                  preview.unsettledChunks === 0
                }
              >
                {settling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Settling...
                  </>
                ) : (
                  "Settle Now"
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
