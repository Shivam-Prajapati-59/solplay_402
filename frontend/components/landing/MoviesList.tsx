"use client";
import React, { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';

type NFT = {
    id: number;
    title: string;
    creator: string;
    floor: string;
    volume: string;
    image: string;
    level?: number;
};

const MovieList = () => {
    const column1Ref = useRef<HTMLDivElement | null>(null);
    const column2Ref = useRef<HTMLDivElement | null>(null);
    const column3Ref = useRef<HTMLDivElement | null>(null);

    const nfts: NFT[] = [
        {
            id: 1,
            title: "Red Dragon",
            creator: "Fire Studios",
            floor: "0.64 ETH",
            volume: "46.8 ETH",
            image: "/movies/movie1.jpeg"
        },
        {
            id: 2,
            title: "Desert Warrior",
            creator: "Sand Games",
            floor: "0.16 ETH",
            volume: "56.8 ETH",
            image: "/movies/movie2.jpeg"
        },
        {
            id: 3,
            title: "Purple Knight",
            creator: "Epic Games",
            floor: "0.64 ETH",
            volume: "83.8 ETH",
            image: "/movies/movie3.jpeg"
        },
        {
            id: 4,
            title: "Golden Egg",
            creator: "Kev Gaming Saver",
            floor: "0.34 ETH",
            volume: "12.8 ETH",
            image: "/movies/movie1.jpeg",
            level: 2
        },
        {
            id: 5,
            title: "Golden Egg",
            creator: "Lee Chong Saver",
            floor: "0.64 ETH",
            volume: "64.8 ETH",
            image: "/movies/movie2.jpeg"
        },
        {
            id: 6,
            title: "Golden Egg",
            creator: "Lee Chong Saver",
            floor: "0.44 ETH",
            volume: "63.8 ETH",
            image: "/movies/movie3.jpeg",
            level: 1
        },
        {
            id: 7,
            title: "Golden Egg",
            creator: "Lee Chong Saver",
            floor: "0.05 ETH",
            volume: "60.4 ETH",
            image: "/movies/movie1.jpeg",
            level: 2
        },
        {
            id: 8,
            title: "Golden Egg",
            creator: "Lee Chong Saver",
            floor: "0.24 ETH",
            volume: "42.3 ETH",
            image: "/movies/movie2.jpeg"
        },
        {
            id: 9,
            title: "Golden Egg",
            creator: "Lee Chong Saver",
            floor: "0.04 ETH",
            volume: "44.8 ETH",
            image: "/movies/movie3.jpeg",
            level: 1
        }
    ];

    useEffect(() => {
        const animateColumn = async (columnRef: React.RefObject<HTMLDivElement | null>, direction: 'up' | 'down') => {
            const column = columnRef.current;
            if (!column) return;

            const gsap = (await import('gsap')).default;

            // Wait for images to load
            const images = column.querySelectorAll('img');
            await Promise.all(
                Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                })
            );

            // Get the height of one set of cards (each card is 324px: 320px + 4px margin)
            const cardHeight = 324; // 320px card + 4px margin-bottom
            const cardsPerSet = 9; // We have 9 unique NFTs
            const singleSetHeight = cardHeight * cardsPerSet;

            // Set initial position and animate
            if (direction === 'down') {
                gsap.set(column, { y: 0 });
                gsap.to(column, {
                    y: -singleSetHeight,
                    duration: 45,
                    ease: 'none',
                    repeat: -1,
                    onRepeat: () => {
                        gsap.set(column, { y: 0 });
                    }
                });
            } else {
                gsap.set(column, { y: -singleSetHeight });
                gsap.to(column, {
                    y: 0,
                    duration: 45,
                    ease: 'none',
                    repeat: -1,
                    onRepeat: () => {
                        gsap.set(column, { y: -singleSetHeight });
                    }
                });
            }
        };

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            animateColumn(column1Ref, 'down');
            animateColumn(column2Ref, 'up');
            animateColumn(column3Ref, 'down');
        }, 200);

        return () => clearTimeout(timer);
    }, []);

    const NFTCard = ({ nft }: { nft: NFT }) => (
        <div className="mb-4 overflow-hidden rounded-xl border border-border/50 hover:border-primary/50 transition-all duration-300 group cursor-pointer h-[320px] relative">
            {/* Full Card Image */}
            <img
                src={nft.image}
                alt={nft.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />

            {/* Level Badge */}
            {nft.level && (
                <div className="absolute top-3 right-3 z-10">
                    <Badge variant="secondary" className="bg-blue-500/90 hover:bg-blue-500 text-white border-0">
                        <span className="text-xs font-bold">LVL {nft.level}</span>
                    </Badge>
                </div>
            )}

            {/* Floating Glassmorphism Bar - Single Row */}
            <div className="absolute bottom-3 left-3 right-3 bg-background/70 dark:bg-background/80 backdrop-blur-xl border border-border/30 rounded-xl z-10 shadow-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-pink-500 shrink-0"></div>

                    {/* Title & Creator */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-xs leading-tight truncate">{nft.title}</h3>
                        <p className="text-[10px] text-muted-foreground truncate">{nft.creator}</p>
                    </div>

                    {/* Floor Price */}
                    <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">Floor</p>
                        <p className="font-bold text-foreground text-xs leading-tight">{nft.floor}</p>
                    </div>

                    {/* Total Volume */}
                    <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">Volume</p>
                        <p className="font-bold text-foreground text-xs leading-tight">{nft.volume}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Duplicate NFTs for seamless loop (3 copies)
    const duplicatedNFTs = [...nfts, ...nfts, ...nfts];

    return (
        <div className="bg-background pt-4 pb-12 sm:pb-16 lg:pb-20 overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8 sm:mb-10 lg:mb-12">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                        Trending NFTs
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Discover the most popular digital collectibles
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
                    {/* Column 1 - Scrolls Down */}
                    <div className="overflow-hidden h-[700px] sm:h-[800px] relative">
                        <div ref={column1Ref}>
                            {duplicatedNFTs.map((nft, idx) => (
                                <NFTCard key={`col1-${idx}`} nft={nft} />
                            ))}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-linear-to-t from-background to-transparent pointer-events-none"></div>
                    </div>

                    {/* Column 2 - Scrolls Up */}
                    <div className="overflow-hidden h-[700px] sm:h-[800px] relative hidden md:block">
                        <div ref={column2Ref}>
                            {duplicatedNFTs.map((nft, idx) => (
                                <NFTCard key={`col2-${idx}`} nft={{ ...nft, id: nft.id + 100 }} />
                            ))}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-linear-to-t from-background to-transparent pointer-events-none"></div>
                    </div>

                    {/* Column 3 - Scrolls Down */}
                    <div className="overflow-hidden h-[700px] sm:h-[800px] relative hidden lg:block">
                        <div ref={column3Ref}>
                            {duplicatedNFTs.map((nft, idx) => (
                                <NFTCard key={`col3-${idx}`} nft={{ ...nft, id: nft.id + 200 }} />
                            ))}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-linear-to-t from-background to-transparent pointer-events-none"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MovieList;