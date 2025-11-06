'use client'

import React, { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

interface Video {
    name: string
    videoId: string
    isTranscoded: boolean
    playlistUrl: string | null
}

const StreamingPage = () => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const hlsRef = useRef<Hls | null>(null)
    const [videos, setVideos] = useState<Video[]>([])
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [transcoding, setTranscoding] = useState(false)
    const [ipfsUrl, setIpfsUrl] = useState('')
    const [customVideoId, setCustomVideoId] = useState('')

    // Fetch available videos
    useEffect(() => {
        fetchVideos()
    }, [])

    const fetchVideos = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/videos')
            const data = await response.json()
            setVideos(data.videos)
        } catch (err) {
            console.error('Error fetching videos:', err)
            setError('Failed to fetch videos')
        }
    }

    // Initialize HLS player
    const playVideo = (playlistUrl: string) => {
        if (!videoRef.current) return

        setLoading(true)
        setError(null)

        const video = videoRef.current
        const fullUrl = `http://localhost:5000${playlistUrl}`

        if (Hls.isSupported()) {
            // Destroy existing HLS instance if any
            if (hlsRef.current) {
                hlsRef.current.destroy()
            }

            // Create new HLS instance
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
                debug: false,
            })

            hlsRef.current = hls

            hls.loadSource(fullUrl)
            hls.attachMedia(video)

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setLoading(false)
                video.play().catch(err => {
                    console.error('Autoplay prevented:', err)
                })
            })

            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data)
                if (data.fatal) {
                    setLoading(false)
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            setError('Network error occurred')
                            hls.startLoad()
                            break
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            setError('Media error occurred')
                            hls.recoverMediaError()
                            break
                        default:
                            setError('Fatal error occurred')
                            hls.destroy()
                            break
                    }
                }
            })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = fullUrl
            video.addEventListener('loadedmetadata', () => {
                setLoading(false)
                video.play().catch(err => {
                    console.error('Autoplay prevented:', err)
                })
            })
        } else {
            setError('HLS is not supported in this browser')
            setLoading(false)
        }
    }

    // Transcode video
    const transcodeVideo = async (videoName: string, videoId: string) => {
        setTranscoding(true)
        setError(null)

        try {
            const response = await fetch('http://localhost:5000/api/transcode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ videoName }),
            })

            const data = await response.json()

            if (data.success) {
                await fetchVideos() // Refresh video list
                setSelectedVideo(videoId)
                playVideo(data.playlistUrl)
            } else {
                setError('Transcoding failed')
            }
        } catch (err) {
            console.error('Error transcoding video:', err)
            setError('Failed to transcode video')
        } finally {
            setTranscoding(false)
        }
    }

    // Transcode video from IPFS URL
    const transcodeFromUrl = async (url: string, customId?: string) => {
        setTranscoding(true)
        setError(null)

        try {
            const response = await fetch('http://localhost:5000/api/transcode-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url,
                    videoId: customId || undefined
                }),
            })

            const data = await response.json()

            if (data.success) {
                setSelectedVideo(data.videoId)
                playVideo(data.playlistUrl)
                // Clear input fields
                setIpfsUrl('')
                setCustomVideoId('')
            } else {
                setError(data.error || 'Transcoding failed')
            }
        } catch (err) {
            console.error('Error transcoding from URL:', err)
            setError('Failed to transcode video from URL')
        } finally {
            setTranscoding(false)
        }
    }

    // Quick test with the provided IPFS URL
    const testIpfsVideo = async () => {
        setTranscoding(true)
        setError(null)

        try {
            const response = await fetch('http://localhost:5000/api/test-ipfs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const data = await response.json()

            if (data.success) {
                setSelectedVideo(data.videoId)
                playVideo(data.playlistUrl)
            } else {
                setError(data.error || 'Test transcoding failed')
            }
        } catch (err) {
            console.error('Error testing IPFS:', err)
            setError('Failed to test IPFS video')
        } finally {
            setTranscoding(false)
        }
    }

    // Handle IPFS URL submit
    const handleIpfsSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (ipfsUrl.trim()) {
            transcodeFromUrl(ipfsUrl.trim(), customVideoId.trim() || undefined)
        }
    }

    // Handle video selection
    const handleVideoSelect = (video: Video) => {
        setSelectedVideo(video.videoId)

        if (video.isTranscoded && video.playlistUrl) {
            playVideo(video.playlistUrl)
        } else {
            transcodeVideo(video.name, video.videoId)
        }
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy()
            }
        }
    }, [])

    return (
        <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Video Streaming</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Video List & IPFS Input */}
                <div className="lg:col-span-1 space-y-6">
                    {/* IPFS URL Input Section */}
                    <div className="bg-card rounded-lg p-4 border border-border">
                        <h2 className="text-xl font-semibold mb-4">Stream from IPFS/URL</h2>
                        <form onSubmit={handleIpfsSubmit} className="space-y-3">
                            <div>
                                <label className="text-sm font-medium mb-1 block">
                                    IPFS Gateway URL or Video URL
                                </label>
                                <input
                                    type="url"
                                    value={ipfsUrl}
                                    onChange={(e) => setIpfsUrl(e.target.value)}
                                    placeholder="https://gateway.lighthouse.storage/ipfs/..."
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    disabled={transcoding}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">
                                    Custom Video ID (optional)
                                </label>
                                <input
                                    type="text"
                                    value={customVideoId}
                                    onChange={(e) => setCustomVideoId(e.target.value)}
                                    placeholder="my_video"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    disabled={transcoding}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={transcoding || !ipfsUrl.trim()}
                                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {transcoding ? 'Processing...' : 'Stream from URL'}
                            </button>
                        </form>

                        {/* Example URLs */}
                        <div className="mt-4 space-y-2">
                            <div className="text-xs text-muted-foreground">
                                <p className="font-medium mb-1">Quick Test:</p>
                            </div>
                            <button
                                onClick={testIpfsVideo}
                                disabled={transcoding}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                🧪 Test Lighthouse IPFS Video
                            </button>
                            <div className="text-xs text-muted-foreground mt-2">
                                <p className="font-medium mb-1">Or try your own URL:</p>
                                <button
                                    onClick={() => setIpfsUrl('https://gateway.lighthouse.storage/ipfs/bafybeidsezv5tygvlba45gyfkxj4zz6derqlc4crw6ofszaqphhl2yqyqq')}
                                    className="text-primary hover:underline break-all text-left"
                                    disabled={transcoding}
                                >
                                    lighthouse.storage/ipfs/bafy...
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Local Videos List */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Local Videos</h2>
                        <div className="space-y-2">
                            {videos.map((video) => (
                                <button
                                    key={video.videoId}
                                    onClick={() => handleVideoSelect(video)}
                                    disabled={transcoding}
                                    className={`w-full p-4 text-left rounded-lg border transition-colors ${selectedVideo === video.videoId
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-card hover:bg-accent border-border'
                                        } ${transcoding ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="font-medium">{video.name}</div>
                                    <div className="text-sm opacity-75 mt-1">
                                        {video.isTranscoded ? (
                                            <span className="text-green-500">✓ Ready to stream</span>
                                        ) : (
                                            <span className="text-yellow-500">⚠ Needs transcoding</span>
                                        )}
                                    </div>
                                </button>
                            ))}

                            {videos.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No local videos available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Video Player */}
                <div className="lg:col-span-2">
                    <div className="bg-card rounded-lg p-6 border border-border">
                        {error && (
                            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
                                {error}
                            </div>
                        )}

                        {transcoding && (
                            <div className="mb-4 p-4 bg-yellow-500/10 text-yellow-500 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                                    <span>Transcoding video... This may take a few moments.</span>
                                </div>
                            </div>
                        )}

                        <div className="relative bg-black rounded-lg overflow-hidden">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                                    <div className="text-white flex items-center gap-2">
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                        Loading video...
                                    </div>
                                </div>
                            )}

                            <video
                                ref={videoRef}
                                className="w-full aspect-video"
                                controls
                                playsInline
                            >
                                Your browser does not support HLS playback.
                            </video>
                        </div>

                        {!selectedVideo && (
                            <div className="mt-4 text-center text-muted-foreground">
                                <p className="mb-2">Select a local video or enter an IPFS URL to start streaming</p>
                                <p className="text-sm">Supports IPFS gateways, direct video URLs, and more!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StreamingPage