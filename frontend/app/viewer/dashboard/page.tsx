"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettlementHistory } from "@/components/custom/SettlementHistory";
import { VideoGrid } from "@/components/viewer/VideoGrid";
import { ActiveSessionsWidget } from "@/components/viewer/ActiveSessionsWidget";
import { WalletButton } from "@/components/custom/WalletButton";
import { Eye, Coins, Activity, Video } from "lucide-react";

export default function ViewerDashboard() {
    const { connected, publicKey } = useWallet();

    if (!connected) {
        return (
            <div className="container mx-auto py-12">
                <Card className="max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle>Viewer Dashboard</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center space-y-4">
                            <Eye className="h-16 w-16 mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground">
                                Connect your wallet to browse videos and manage your streaming sessions
                            </p>
                            <WalletButton />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="pt-13 px-4 sm:px-6 lg:px-8">
            <div className="container mx-auto py-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Viewer Dashboard</h1>
                        <p className="text-muted-foreground mt-1">
                            Browse videos, manage sessions, and track settlements
                        </p>
                    </div>
                    <WalletButton />
                </div>

                <Tabs defaultValue="browse" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="browse">
                            <Video className="h-4 w-4 mr-2" />
                            Browse
                        </TabsTrigger>
                        <TabsTrigger value="sessions">
                            <Activity className="h-4 w-4 mr-2" />
                            Sessions
                        </TabsTrigger>
                        <TabsTrigger value="history">
                            <Coins className="h-4 w-4 mr-2" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    {/* Browse Videos Tab */}
                    <TabsContent value="browse" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Available Videos</h2>
                        </div>
                        <VideoGrid limit={12} />
                    </TabsContent>

                    {/* Active Sessions Tab */}
                    <TabsContent value="sessions" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Active Sessions</h2>
                            <p className="text-sm text-muted-foreground">
                                Videos you're currently watching
                            </p>
                        </div>
                        <ActiveSessionsWidget />
                    </TabsContent>

                    {/* Settlement History Tab */}
                    <TabsContent value="history" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">Settlement History</h2>
                            <p className="text-sm text-muted-foreground">
                                Your payment history
                            </p>
                        </div>
                        <SettlementHistory mode="viewer" limit={20} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

