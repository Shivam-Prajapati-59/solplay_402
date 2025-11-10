"use client";

import { VideoWatchPage } from "@/components/viewer/VideoWatchPage";
import { use } from "react";

export default function WatchVideoPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);

    return <VideoWatchPage videoId={id} />;
}
