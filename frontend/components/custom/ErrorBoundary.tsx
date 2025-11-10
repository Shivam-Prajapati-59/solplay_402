// =============================================================================
// Error Boundary Component
// =============================================================================
// Catches React errors and displays fallback UI
// =============================================================================

"use client";

import React, { Component, ReactNode, ErrorInfo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);

        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Something Went Wrong
                        </CardTitle>
                        <CardDescription>
                            An unexpected error occurred while rendering this component
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-destructive/10 rounded-lg">
                            <p className="text-sm font-mono text-destructive">
                                {this.state.error?.message || "Unknown error"}
                            </p>
                        </div>
                        <Button onClick={this.handleReset} variant="outline">
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            );
        }

        return this.props.children;
    }
}

// Blockchain-specific error boundary
export function BlockchainErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary
            fallback={
                <Card className="border-yellow-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-600">
                            <AlertCircle className="h-5 w-5" />
                            Blockchain Connection Error
                        </CardTitle>
                        <CardDescription>
                            There was an issue connecting to the Solana blockchain
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Please check the following:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Your wallet is connected</li>
                            <li>You are on the correct network (Devnet/Mainnet)</li>
                            <li>The RPC endpoint is accessible</li>
                            <li>The smart contract is deployed</li>
                        </ul>
                    </CardContent>
                </Card>
            }
            onError={(error) => {
                // Log to monitoring service in production
                console.error("Blockchain error:", error);
            }}
        >
            {children}
        </ErrorBoundary>
    );
}
