"use client";
import { Zap } from "lucide-react";
import React from "react";

type User = {
    id: string;
    name: string;
    subtitle?: string;
    avatarUrl?: string;
};

const USERS: User[] = [
    { id: "1", name: "PandaBear", subtitle: "Created 128 NFTs", avatarUrl: "/zomb.png" },
    { id: "2", name: "Farworld", subtitle: "Created 128 NFTs", avatarUrl: "/zomb.png" },
    { id: "3", name: "Basilian", subtitle: "Created 128 NFTs", avatarUrl: "/zomb.png" },
    { id: "4", name: "Captain & Morgan", subtitle: "Created 128 NFTs", avatarUrl: "/zomb.png" },
    { id: "5", name: "Karafuru", subtitle: "Created 128 NFTs", avatarUrl: "/zomb.png" }
];

export default function UserBar() {
    return (
        <div className="w-3/4 mx-auto bg-background/30 dark:bg-background/80 backdrop-blur-xl border border-border/50 dark:border-border/30 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-5 px-20">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" fill="currentColor" />
                    <h3 className="text-sm sm:text-base font-semibold text-foreground">Top creators of this week</h3>
                </div>
                <button className="text-sm text-primary font-medium hover:underline transition-all">
                    See more
                </button>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
                <div className="flex items-center justify-center gap-6 sm:gap-8 min-w-max pb-2">
                    {USERS.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center gap-3 min-w-[140px] sm:min-w-[160px] group cursor-pointer transition-all hover:scale-105"
                        >
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-border/50 dark:ring-border/30 group-hover:ring-primary/50 transition-all shadow-md">
                                <img
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-foreground truncate">
                                    {user.name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {user.subtitle}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}