"use client";
import React, { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

const Strips = () => {
    const scrollerTopRef = useRef<HTMLDivElement | null>(null);
    const scrollerBottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Dynamically import gsap
        const initAnimations = async () => {
            const gsap = (await import("gsap")).default;

            const top = scrollerTopRef.current;
            const bottom = scrollerBottomRef.current;

            if (top) {
                // Clone the content for seamless loop
                const firstChild = top.children[0] as HTMLElement;
                if (firstChild) {
                    const width = firstChild.offsetWidth;

                    // Set initial position to 0
                    gsap.set(top, { x: 0 });

                    // Animate LEFT: from 0 to -width, then repeat
                    gsap.to(top, {
                        x: -width,
                        duration: 20,
                        ease: "none",
                        repeat: -1,
                        modifiers: {
                            x: function (x) {
                                // This ensures seamless looping
                                return `${parseFloat(x) % width}px`;
                            }
                        }
                    });
                }
            }

            if (bottom) {
                const firstChild = bottom.children[0] as HTMLElement;
                if (firstChild) {
                    const width = firstChild.offsetWidth;

                    // Set initial position to -width
                    gsap.set(bottom, { x: -width });

                    // Animate RIGHT: from -width to 0, then repeat
                    gsap.to(bottom, {
                        x: 0,
                        duration: 20,
                        ease: "none",
                        repeat: -1,
                        modifiers: {
                            x: function (x) {
                                // This ensures seamless looping in opposite direction
                                const val = parseFloat(x);
                                return `${val >= 0 ? -width : val}px`;
                            }
                        }
                    });
                }
            }
        };

        initAnimations();
    }, []);

    const items = [
        "Stream Premium Content!",
        "Pay-per-chunk streaming!",
        "99% Gas Savings!",
        "Support Your Creators!",
    ];

    const ContentBlock = ({ idPrefix }: { idPrefix: string }) => (
        <div className="flex items-center gap-8 sm:gap-12 shrink-0">
            {items.map((item, index) => (
                <div
                    key={`${idPrefix}-${index}`}
                    className="flex items-center gap-3 sm:gap-4 pr-8 sm:pr-12"
                >
                    <Sparkles
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                        fill="currentColor"
                    />
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-white italic whitespace-nowrap">
                        {item}
                    </span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="relative h-36 sm:h-48 lg:h-56 overflow-hidden">
            {/* TOP STRIP - Scrolls LEFT - Rotated */}
            <div
                className="absolute left-1/2 top-1/2 w-[150%] overflow-hidden bg-linear-to-r from-purple-600 to-pink-600 py-2 sm:py-3"
                style={{
                    transform: 'translate(-50%, -50%) rotate(-4deg)',
                    transformOrigin: 'center center'
                }}
            >
                <div
                    ref={scrollerTopRef}
                    className="flex items-center"
                    style={{ willChange: "transform" }}
                >
                    <ContentBlock idPrefix="top-a" />
                    <ContentBlock idPrefix="top-b" />
                </div>
            </div>

            {/* BOTTOM STRIP - Scrolls RIGHT - Rotated opposite */}
            <div
                className="absolute left-1/2 top-1/2 w-[150%] overflow-hidden bg-linear-to-r from-blue-600 to-purple-600 py-2 sm:py-3"
                style={{
                    transform: 'translate(-50%, -50%) rotate(4deg)',
                    transformOrigin: 'center center'
                }}
            >
                <div
                    ref={scrollerBottomRef}
                    className="flex items-center"
                    style={{ willChange: "transform" }}
                >
                    <ContentBlock idPrefix="bot-a" />
                    <ContentBlock idPrefix="bot-b" />
                </div>
            </div>
        </div>
    );
};

export default Strips;