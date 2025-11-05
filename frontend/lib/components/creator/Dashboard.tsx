"use client";
import React, { useState } from 'react';
import {
    Eye,
    Heart,
    DollarSign,
    TrendingUp,
    Users,
    Clock,
    Upload,
    Share2,
    BarChart3,
    Calendar,
    FileVideo,
    Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CreatorDashboard = () => {
    const [timeRange, setTimeRange] = useState('7d');
    const router = useRouter();

    const recentUploads = [
        {
            id: 1,
            title: 'Getting Started with Web3',
            thumbnail: '🎬',
            views: 12453,
            likes: 892,
            duration: '12:34',
            uploadDate: '2 days ago',
            status: 'published',
            revenue: 124.5,
        },
        {
            id: 2,
            title: 'Blockchain Tutorial for Beginners',
            thumbnail: '📚',
            views: 8234,
            likes: 654,
            duration: '15:22',
            uploadDate: '5 days ago',
            status: 'published',
            revenue: 82.3,
        },
        {
            id: 3,
            title: 'NFT Marketplace Deep Dive',
            thumbnail: '🖼️',
            views: 15678,
            likes: 1243,
            duration: '18:45',
            uploadDate: '1 week ago',
            status: 'published',
            revenue: 156.8,
        },
        {
            id: 4,
            title: 'Smart Contracts Explained',
            thumbnail: '⚡',
            views: 6543,
            likes: 432,
            duration: '10:12',
            uploadDate: '1 week ago',
            status: 'processing',
            revenue: 0,
        },
    ];

    const topPerformers = [
        { title: 'Crypto Trading Guide', views: 45234, change: '+12%', progress: 90 },
        { title: 'DeFi Explained', views: 38921, change: '+8%', progress: 75 },
        { title: 'Web3 Development', views: 32156, change: '+15%', progress: 60 },
    ];

    const stats = [
        {
            title: 'Total Revenue',
            value: '$12,345',
            change: '+12.5%',
            icon: DollarSign,
            description: 'From last 30 days',
        },
        {
            title: 'Total Views',
            value: '1.2M',
            change: '+8.3%',
            icon: Eye,
            description: 'Across all videos',
        },
        {
            title: 'Subscribers',
            value: '45.2K',
            change: '+5.7%',
            icon: Users,
            description: 'Active subscribers',
        },
        {
            title: 'Engagement Rate',
            value: '7.8%',
            change: '+2.1%',
            icon: Heart,
            description: 'Likes & comments',
        },
    ];

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <BarChart3 className="h-8 w-8 text-blue-600" />
                            Creator Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Welcome back! Here's your channel overview
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Tabs value={timeRange} onValueChange={setTimeRange}>
                            <TabsList>
                                <TabsTrigger value="7d">7 Days</TabsTrigger>
                                <TabsTrigger value="30d">30 Days</TabsTrigger>
                                <TabsTrigger value="90d">90 Days</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button className="gap-2" onClick={() => router.push('/creator/upload')}>
                            <Upload className="h-4 w-4" />
                            Upload
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, index) => (
                        <Card key={index}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {stat.title}
                                </CardTitle>
                                <stat.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                    <span className="text-green-600 font-medium">{stat.change}</span>
                                    <span>{stat.description}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Uploads - Takes 2 columns */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Recent Uploads</CardTitle>
                                    <CardDescription>Your latest video content</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm">
                                    View All
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Video</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Stats</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentUploads.map((video) => (
                                        <TableRow key={video.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-2xl">{video.thumbnail}</div>
                                                    <div>
                                                        <div className="font-medium">{video.title}</div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {video.duration}
                                                            </span>
                                                            <span>{video.uploadDate}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={video.status === 'published' ? 'default' : 'secondary'}>
                                                    {video.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        <Eye className="h-3 w-3 text-muted-foreground" />
                                                        <span>{video.views.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Heart className="h-3 w-3 text-muted-foreground" />
                                                        <span>{video.likes.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {video.status === 'published' && (
                                                    <div className="font-bold text-green-600">
                                                        ${video.revenue}
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Sidebar - Takes 1 column */}
                    <div className="space-y-6">
                        {/* Top Performers */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-500" />
                                    Top Performers
                                </CardTitle>
                                <CardDescription>Your best videos this week</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {topPerformers.map((video, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{video.title}</span>
                                            <Badge variant="outline" className="text-green-600">
                                                {video.change}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Progress value={video.progress} className="flex-1" />
                                            <span className="text-xs text-muted-foreground min-w-[60px] text-right">
                                                {video.views.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                                <CardDescription>Manage your channel</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button variant="outline" className="w-full justify-start gap-2">
                                    <FileVideo className="h-4 w-4" />
                                    Manage Videos
                                </Button>
                                <Button variant="outline" className="w-full justify-start gap-2">
                                    <BarChart3 className="h-4 w-4" />
                                    View Analytics
                                </Button>
                                <Button variant="outline" className="w-full justify-start gap-2">
                                    <Share2 className="h-4 w-4" />
                                    Share Channel
                                </Button>
                                <Button variant="outline" className="w-full justify-start gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Schedule Upload
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Content Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Content Overview</CardTitle>
                                <CardDescription>Your content breakdown</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                                            Videos
                                        </span>
                                        <span className="font-bold">45</span>
                                    </div>
                                    <Progress value={75} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-green-500" />
                                            Shorts
                                        </span>
                                        <span className="font-bold">23</span>
                                    </div>
                                    <Progress value={45} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                            Live Streams
                                        </span>
                                        <span className="font-bold">8</span>
                                    </div>
                                    <Progress value={15} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatorDashboard;