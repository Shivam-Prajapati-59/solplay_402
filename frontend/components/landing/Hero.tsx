"use client";
import React, { useEffect, useRef } from 'react';
import { Sparkles, Image, Users } from 'lucide-react';
import { Button } from '../ui/button';

const Hero = () => {
    const heroRef = useRef<HTMLDivElement>(null);
    const statsRef = useRef<(HTMLDivElement | null)[]>([]);
    const cardRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const animateOnLoad = () => {
            if (heroRef.current) {
                heroRef.current.style.opacity = '0';
                heroRef.current.style.transform = 'translateY(30px)';
                setTimeout(() => {
                    if (heroRef.current) {
                        heroRef.current.style.transition = 'all 0.8s ease-out';
                        heroRef.current.style.opacity = '1';
                        heroRef.current.style.transform = 'translateY(0)';
                    }
                }, 100);
            }

            statsRef.current.forEach((stat, index) => {
                if (stat) {
                    stat.style.opacity = '0';
                    stat.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        if (stat) {
                            stat.style.transition = 'all 0.6s ease-out';
                            stat.style.opacity = '1';
                            stat.style.transform = 'translateY(0)';
                        }
                    }, 300 + index * 150);
                }
            });

            if (cardRef.current) {
                cardRef.current.style.opacity = '0';
                cardRef.current.style.transform = 'translateX(50px) rotate(5deg)';
                setTimeout(() => {
                    if (cardRef.current) {
                        cardRef.current.style.transition = 'all 1s ease-out';
                        cardRef.current.style.opacity = '1';
                        cardRef.current.style.transform = 'translateX(0) rotate(0deg)';
                    }
                }, 400);
            }

            if (buttonRef.current) {
                buttonRef.current.style.opacity = '0';
                buttonRef.current.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    if (buttonRef.current) {
                        buttonRef.current.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                        buttonRef.current.style.opacity = '1';
                        buttonRef.current.style.transform = 'scale(1)';
                    }
                }, 600);
            }
        };

        animateOnLoad();
    }, []);

    const stats = [
        { icon: Sparkles, value: '99%', label: 'Gas Savings' },
        { icon: Image, value: '1000+', label: 'Videos Streamed' },
        { icon: Users, value: '500+', label: 'Active Users' },
    ];

    return (
        <div className="bg-background overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:pt-25">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">
                    {/* Left Content */}
                    <div ref={heroRef} className="space-y-6 lg:space-y-8">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-5xl font-bold leading-tight text-foreground">
                            Stream and Create <br />
                            <span className="bg-linear-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                                Premium Video Content
                            </span>
                        </h1>
                        <p className="text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed">
                            SolPlay brings creators and viewers together with blockchain-powered
                            micropayments. Watch premium content with delegate-based settlement
                            and save 99% on gas fees.
                        </p>

                        <Button
                            ref={buttonRef}
                            size="lg"
                            className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            Start Watching
                        </Button>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-8 sm:gap-10 lg:gap-12 pt-4 sm:pt-6 lg:pt-8">
                            {stats.map((stat, index) => (
                                <div
                                    key={index}
                                    ref={el => { statsRef.current[index] = el; }}
                                    className="flex items-center gap-3 sm:gap-4"
                                >
                                    <div className="bg-primary/10 dark:bg-primary/20 p-2.5 sm:p-3 rounded-xl border border-primary/20 dark:border-primary/30">
                                        <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
                                        <div className="text-muted-foreground text-xs sm:text-sm">{stat.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Content - Video Preview Card */}
                    <div className="relative flex justify-center lg:justify-end items-center">
                        <div
                            ref={cardRef}
                            className="relative bg-linear-to-br from-primary via-purple-600 to-pink-600 rounded-3xl p-1 shadow-2xl hover:shadow-primary/50 dark:hover:shadow-primary/30 transition-all duration-500 hover:scale-105 max-w-lg w-full"
                        >
                            {/* Card Inner */}
                            <div className="bg-card rounded-3xl overflow-hidden shadow-xl relative">
                                {/* Video Thumbnail */}
                                <div className="bg-muted/30 dark:bg-muted/20 relative h-[400px] sm:h-[450px] lg:h-[400px]">
                                    <img
                                        src="https://i.pinimg.com/236x/a5/78/03/a57803e6f37f73382bf89b007a4b5954.jpg"
                                        alt="Video Preview"
                                        className="w-full h-full object-cover rounded-t-3xl"
                                    />

                                    {/* Play Button Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer">
                                            <svg className="w-8 h-8 text-primary ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Floating Creator Info with Glass Effect */}
                                    <div className="absolute top-4 left-4 right-4 bg-background/80 dark:bg-background/60 backdrop-blur-xl border border-border/50 dark:border-border/30 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
                                        <div className="w-10 h-10 bg-linear-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                            <span className="text-sm font-bold text-white">SP</span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-foreground leading-tight">SolPlay Creator</div>
                                            <div className="text-xs text-muted-foreground">Premium Content</div>
                                        </div>
                                    </div>

                                    {/* Floating Stats with Glass Effect */}
                                    <div className="absolute bottom-4 left-4 right-4 bg-background/30 dark:bg-background/80 backdrop-blur-xl border border-border/50 dark:border-border/30 rounded-2xl px-4 sm:px-5 py-4 shadow-2xl">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-lg sm:text-xl font-bold text-foreground">0.001 SOL</div>
                                                <div className="text-xs sm:text-sm text-muted-foreground">Per Chunk</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg sm:text-xl font-bold text-foreground">12.5K Views</div>
                                                <div className="text-xs sm:text-sm text-muted-foreground">Total Streams</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Hero;