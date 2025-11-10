"use client";

import { useState, useEffect } from "react";
import { VideoCard } from "./VideoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Filter, Play } from "lucide-react";
import { getAllVideos, searchVideos } from "@/data/video.api";
import type { Video } from "@/data/types";

interface VideoGridProps {
    category?: string;
    limit?: number;
}

export function VideoGrid({ category, limit = 12 }: VideoGridProps) {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"createdAt" | "viewCount" | "likeCount">(
        "createdAt"
    );
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        loadVideos();
    }, [category, sortBy, page]);

    const loadVideos = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await getAllVideos({
                page,
                limit,
                category,
                sortBy,
                order: "desc",
            });

            if (page === 1) {
                setVideos(response.videos);
            } else {
                setVideos((prev) => [...prev, ...response.videos]);
            }

            setHasMore(response.videos.length === limit);
        } catch (err: any) {
            console.error("Failed to load videos:", err);
            setError(err.message || "Failed to load videos");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadVideos();
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await searchVideos({
                q: searchQuery,
                page: 1,
                limit,
            });

            setVideos(response.videos);
            setPage(1);
            setHasMore(false); // Disable load more for search results
        } catch (err: any) {
            console.error("Failed to search videos:", err);
            setError(err.message || "Failed to search videos");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        setPage((prev) => prev + 1);
    };

    if (loading && page === 1) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={loadVideos} variant="outline">
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                    <Input
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="flex-1"
                    />
                    <Button onClick={handleSearch} size="icon">
                        <Search className="h-4 w-4" />
                    </Button>
                </div>

                <Select
                    value={sortBy}
                    onValueChange={(value: any) => {
                        setSortBy(value);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="createdAt">Latest</SelectItem>
                        <SelectItem value="viewCount">Most Viewed</SelectItem>
                        <SelectItem value="likeCount">Most Liked</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Video Grid - More compact grid with better spacing */}
            {videos.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Play className="h-20 w-20 mx-auto mb-4 opacity-30" />
                    <p className="text-xl font-semibold mb-2">No videos found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {videos.map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                        <div className="flex justify-center pt-8">
                            <Button
                                onClick={handleLoadMore}
                                variant="outline"
                                disabled={loading}
                                size="lg"
                                className="min-w-[200px]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    "Load More Videos"
                                )}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
