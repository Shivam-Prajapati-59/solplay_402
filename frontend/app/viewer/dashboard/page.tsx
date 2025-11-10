"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettlementHistory } from "@/components/custom/SettlementHistory";
import { Eye, Coins, Activity } from "lucide-react";

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
                                Connect your wallet to view your settlement history and watch
                                analytics
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
                    <h1 className="text-3xl font-bold">Viewer Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Track your content consumption and settlements
                    </p>
                </div>
                <WalletMultiButton />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Settlements
                        </CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-xs text-muted-foreground">Coming soon</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Content Watched
                        </CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-xs text-muted-foreground">Coming soon</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Sessions
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-xs text-muted-foreground">Coming soon</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="settlements" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="settlements">Settlement History</TabsTrigger>
                    <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
                </TabsList>

                <TabsContent value="settlements" className="space-y-4">
                    <SettlementHistory mode="viewer" limit={20} />
                </TabsContent>

                <TabsContent value="sessions" className="space-y-4">
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Active sessions will be displayed here</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
