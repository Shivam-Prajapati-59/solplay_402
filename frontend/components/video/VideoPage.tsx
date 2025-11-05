"use client";
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { fetchWithPayment } from '@/lib/x402-payment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Video {
    id: string;
    title: string;
    url: string;
    description?: string;
}

interface VideoResponse {
    success: boolean;
    message: string;
    videos: Video[];
    timestamp: string;
}

const VideoPage = () => {
    const wallet = useWallet();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [mounted, setMounted] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);

    // Prevent hydration errors
    useEffect(() => {
        setMounted(true);
    }, []);

    const handlePayment = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setError('Please connect your wallet first');
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log('🔐 Initiating payment for video access...');

            const data: VideoResponse = await fetchWithPayment({
                url: 'http://localhost:5000/api/videos',
                wallet,
            });

            if (data.success && data.videos) {
                console.log('✅ Payment successful! Videos unlocked:', data.videos);
                setVideos(data.videos);
                setHasAccess(true);
            } else {
                setError('Failed to retrieve videos');
            }
        } catch (err: any) {
            console.error('❌ Payment error:', err);
            setError(err.message || 'Payment failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                            Premium Videos
                        </h1>
                        <p className="text-gray-400 mt-2">
                            Pay once with $0.01 USDC to unlock all videos
                        </p>
                    </div>
                    <div className="wallet-button">
                        <WalletMultiButton />
                    </div>
                </div>

                {/* Payment Section */}
                {!hasAccess && (
                    <Card className="bg-gray-800 border-purple-500 border-2 mb-8">
                        <CardHeader>
                            <CardTitle className="text-2xl text-purple-400">
                                🔒 Content Locked
                            </CardTitle>
                            <CardDescription className="text-gray-300">
                                Connect your Solana wallet and pay $0.01 USDC to unlock premium videos
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!wallet.connected ? (
                                <div className="text-center p-6">
                                    <p className="text-gray-400 mb-4">
                                        Please connect your Solana wallet to continue
                                    </p>
                                    <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                                        Wallet Required
                                    </Badge>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                                        <div>
                                            <p className="text-sm text-gray-400">Connected Wallet</p>
                                            <p className="font-mono text-sm text-purple-400">
                                                {wallet.publicKey?.toBase58().slice(0, 8)}...
                                                {wallet.publicKey?.toBase58().slice(-8)}
                                            </p>
                                        </div>
                                        <Badge className="bg-green-600">Connected</Badge>
                                    </div>

                                    <Button
                                        onClick={handlePayment}
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 text-lg"
                                    >
                                        {loading ? (
                                            <>
                                                <span className="animate-spin mr-2">⏳</span>
                                                Processing Payment...
                                            </>
                                        ) : (
                                            <>💳 Pay $0.01 USDC to Unlock</>
                                        )}
                                    </Button>

                                    {error && (
                                        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
                                            <p className="text-red-300 text-sm">❌ {error}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Videos Grid */}
                {hasAccess && videos.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <h2 className="text-3xl font-bold">Your Videos</h2>
                            <Badge className="bg-green-600">✓ Access Granted</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {videos.map((video) => (
                                <Card
                                    key={video.id}
                                    className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-all hover:shadow-lg hover:shadow-purple-500/50"
                                >
                                    <CardHeader>
                                        <CardTitle className="text-xl text-purple-400">
                                            {video.title}
                                        </CardTitle>
                                        {video.description && (
                                            <CardDescription className="text-gray-400">
                                                {video.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="aspect-video bg-gradient-to-br from-purple-900 to-pink-900 rounded-lg flex items-center justify-center mb-4">
                                            <span className="text-6xl">🎬</span>
                                        </div>
                                        <a
                                            href={video.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-400 hover:text-purple-300 text-sm"
                                        >
                                            🔗 {video.url}
                                        </a>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="animate-pulse text-6xl mb-4">💳</div>
                        <p className="text-gray-400">Processing your payment...</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Please approve the transaction in your wallet
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoPage;