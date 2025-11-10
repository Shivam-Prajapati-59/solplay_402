// =============================================================================
// Transaction Loading States
// =============================================================================
// Reusable loading components for blockchain transactions
// =============================================================================

"use client";

import React from "react";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type TransactionStatus = "idle" | "signing" | "sending" | "confirming" | "confirmed" | "failed";

interface TransactionLoadingProps {
    status: TransactionStatus;
    message?: string;
    className?: string;
}

export function TransactionLoading({ status, message, className }: TransactionLoadingProps) {
    const statusConfig = {
        idle: {
            icon: null,
            text: "Ready",
            color: "text-muted-foreground",
        },
        signing: {
            icon: <Loader2 className="h-5 w-5 animate-spin" />,
            text: "Please sign transaction in your wallet...",
            color: "text-blue-500",
        },
        sending: {
            icon: <Loader2 className="h-5 w-5 animate-spin" />,
            text: "Sending transaction to blockchain...",
            color: "text-blue-500",
        },
        confirming: {
            icon: <Clock className="h-5 w-5 animate-pulse" />,
            text: "Waiting for confirmation...",
            color: "text-yellow-500",
        },
        confirmed: {
            icon: <CheckCircle2 className="h-5 w-5" />,
            text: "Transaction confirmed!",
            color: "text-green-500",
        },
        failed: {
            icon: <XCircle className="h-5 w-5" />,
            text: "Transaction failed",
            color: "text-red-500",
        },
    };

    const config = statusConfig[status];

    if (status === "idle" || !config.icon) {
        return null;
    }

    return (
        <div className={cn("flex items-center gap-2", config.color, className)}>
            {config.icon}
            <span className="text-sm font-medium">
                {message || config.text}
            </span>
        </div>
    );
}

// Inline loading spinner
export function InlineLoader({ className }: { className?: string }) {
    return (
        <Loader2 className={cn("h-4 w-4 animate-spin", className)} />
    );
}

// Full page loading
export function PageLoader({ message = "Loading..." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );
}

// Skeleton loader for video cards
export function VideoCardSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="bg-muted rounded-lg aspect-video mb-3" />
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
        </div>
    );
}
