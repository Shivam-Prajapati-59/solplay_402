"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, Heart, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Video } from "@/data/types";

interface VideoCardProps {
    video: Video;
}

export function VideoCard({ video }: VideoCardProps) {
    const router = useRouter();

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const formatPrice = (price: number) => {
        return `${price} SOL`;
    };

    const handleWatch = () => {
        router.push(`/viewer/watch/${video.id}`);
    };

    return (
        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-border/50 p-0">
            {/* Thumbnail Section */}
            <div className="relative aspect-video bg-muted/50 overflow-hidden" onClick={handleWatch}>
                {video.thumbnailUrl ? (
                    <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10">
                        <Play className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                )}

                {/* Duration Badge */}
                {video.duration && video.duration > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/90 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(video.duration)}</span>
                    </div>
                )}

                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-primary rounded-full p-4 transform group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-primary-foreground fill-current" />
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 space-y-1">
                {/* Title Row */}
                <div className="flex items-start gap-2">
                    <h3 className="font-semibold text-base line-clamp-2 flex-1 leading-snug">
                        {video.title}
                    </h3>
                    {video.isPaid && (
                        <Badge variant="default" className="shrink-0 text-xs font-semibold">
                            {formatPrice(video.price)}
                        </Badge>
                    )}
                </div>

                {/* Description */}
                {video.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {video.description}
                    </p>
                )}

                {/* Stats Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Eye className="h-4 w-4" />
                            <span className="font-medium">{video.viewCount?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Heart className="h-4 w-4" />
                            <span className="font-medium">{video.likeCount?.toLocaleString() || 0}</span>
                        </div>
                    </div>
                    {video.category && (
                        <Badge variant="outline" className="text-xs font-medium">
                            {video.category}
                        </Badge>
                    )}
                </div>

                {/* Watch Button */}
                <Button
                    onClick={handleWatch}
                    className="w-full font-semibold"
                    size="default"
                >
                    <Play className="h-4 w-4 mr-2 fill-current" />
                    Watch Now
                </Button>
            </div>
        </Card>
    );
}