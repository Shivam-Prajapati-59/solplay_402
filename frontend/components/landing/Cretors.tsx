"use client";
import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Creator = {
    id: number;
    name: string;
    username: string;
    followers: string;
    videosCreated: number;
    totalViews: number;
    avatar: string;
    thumbnails: string[];
};

const CREATORS: Creator[] = [
    {
        id: 1,
        name: "TechExplorer",
        username: "techexplorer",
        followers: "67,398",
        videosCreated: 214,
        totalViews: 892000,
        avatar: "/zomb.png",
        thumbnails: [
            "/movies/movie1.jpeg",
            "/movies/movie2.jpeg",
            "/movies/movie3.jpeg",
        ]
    },
    {
        id: 2,
        name: "CryptoTeacher",
        username: "cryptoteacher",
        followers: "120,456",
        videosCreated: 120,
        totalViews: 1200000,
        avatar: "/zomb.png",
        thumbnails: [
            "/movies/movie1.jpeg",
            "/movies/movie2.jpeg",
            "/movies/movie3.jpeg",
        ]
    },
    {
        id: 3,
        name: "CodeMaster",
        username: "codemaster",
        followers: "98,234",
        videosCreated: 187,
        totalViews: 750000,
        avatar: "/zomb.png",
        thumbnails: [
            "/movies/movie1.jpeg",
            "/movies/movie2.jpeg",
            "/movies/movie3.jpeg",
        ]
    },
    {
        id: 4,
        name: "Web3Wizard",
        username: "web3wizard",
        followers: "85,123",
        videosCreated: 156,
        totalViews: 680000,
        avatar: "/zomb.png",
        thumbnails: [
            "https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=400&h=400&fit=crop",
            "https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=400&h=400&fit=crop",
            "https://images.unsplash.com/photo-1643916861364-02e63ce3e52f?w=400&h=400&fit=crop",
        ]
    },
];

const Creators = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number>(0);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let scrollPosition = 0;
        const scrollSpeed = 0.5; // pixels per frame
        const cardWidth = 396; // card width + gap (380px + 24px gap)

        const animate = () => {
            if (!container) return;

            scrollPosition += scrollSpeed;

            // Reset scroll position when we've scrolled past half the content
            // This creates a seamless infinite loop effect
            const maxScroll = container.scrollWidth / 2;
            if (scrollPosition >= maxScroll) {
                scrollPosition = 0;
            }

            container.scrollLeft = scrollPosition;
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        // Start animation
        animationFrameRef.current = requestAnimationFrame(animate);

        // Pause on hover
        const handleMouseEnter = () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };

        const handleMouseLeave = () => {
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        container.addEventListener('mouseenter', handleMouseEnter);
        container.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            container.removeEventListener('mouseenter', handleMouseEnter);
            container.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    // Duplicate creators for infinite scroll effect
    const duplicatedCreators = [...CREATORS, ...CREATORS];

    return (
        <div className="bg-background pt-16 sm:pt-20 lg:pt-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                {/* Header Section */}
                <div className="mb-12 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                        Top creators of this week
                    </h2>
                    <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                        Discover the most popular video creators and start streaming premium content with micropayments on Solana.
                    </p>
                </div>

                {/* Carousel Section */}
                <div className="relative overflow-hidden">
                    {/* Scrollable Container */}
                    <div
                        ref={scrollContainerRef}
                        className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {duplicatedCreators.map((creator, index) => (
                            <Card
                                key={`${creator.id}-${index}`}
                                className="shrink-0 w-[340px] sm:w-[380px] bg-card hover:shadow-2xl transition-all duration-300 border-border/50 hover:border-primary/50 group/card overflow-hidden"
                            >
                                <CardContent className="p-6">
                                    {/* Creator Info */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-border/50 group-hover/card:ring-primary/50 transition-all">
                                                <img
                                                    src={creator.avatar}
                                                    alt={creator.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-foreground mb-0.5">
                                                    {creator.name}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {creator.username}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="rounded-full px-6"
                                        >
                                            Follow
                                        </Button>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Followers</p>
                                            <p className="text-lg font-bold text-foreground">{creator.followers}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Videos</p>
                                            <p className="text-lg font-bold text-foreground">{creator.videosCreated}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Total Views</p>
                                            <p className="text-lg font-bold text-foreground">{(creator.totalViews / 1000).toFixed(1)}K</p>
                                        </div>
                                    </div>

                                    {/* Video Thumbnails Gallery */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {creator.thumbnails.map((thumbnail: string, thumbIndex: number) => (
                                            <div
                                                key={thumbIndex}
                                                className="aspect-video rounded-xl overflow-hidden bg-muted/30 hover:scale-105 transition-transform duration-300 cursor-pointer relative"
                                            >
                                                <img
                                                    src={thumbnail}
                                                    alt={`Video ${thumbIndex + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                {/* Play icon overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-primary ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default Creators;