"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown, Play, Share2 } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Appbar } from "../components/Appbar";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import YouTubePlayer from "youtube-player";


interface Video {
  id: string;
  type: string;
  url: string;
  extractedId: string;
  title: string;
  smallImg: string;
  bigImg: string;
  active: boolean;
  userId: string;
  upvotes: number;
  haveUpvoted: boolean;
  upvoters?: string[]; 
}

export default function StreamView({
  creatorId,
  playVideo = false,
}: {
  creatorId: string;
  playVideo: boolean;
}) {
  const [inputLink, setInputLink] = useState("");
  const [queue, setQueue] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [playNextLoader, setPlayNextLoader] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const fetchUser = async () => {
    try {
      const { data } = await axios.get("/api/user", { withCredentials: true });
      setCurrentUserId(data.user.id);
      return data.user.id;
    } catch (error) {
      toast.error("Failed to fetch user session");
      console.error("API /api/user error:", error);
      return null;
    }
  };

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = `wss://pulseplay.praverbajaj.tech/ws/${creatorId}`;
      wsRef.current = new WebSocket(wsUrl);

      // --- Heartbeat (ping/pong) ---
      let pingInterval: NodeJS.Timeout | null = null;
      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setWsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        // Send ping every 30 seconds
        pingInterval = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "PING" }));
          }
        }, 30000);
      };

      // --- Initial sync state ---
      let initialQueue: Video[] | null = null;
      let initialCurrentVideo: Video | null = null;
      let initialSynced = false;

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "PONG") return; // Ignore pong
          console.log("WebSocket message received:", data);

          switch (data.type) {
            case "INITIAL_QUEUE":
              initialQueue = data.queue;
              break;
            case "CURRENT_VIDEO":
              initialCurrentVideo = data.video;
              break;
          }

          // When both are received, set state and mark as synced
          if (
            !initialSynced &&
            initialQueue !== null &&
            initialCurrentVideo !== null
          ) {
            setQueue(
              initialQueue.filter((v: Video) => v.id !== initialCurrentVideo?.id)
            );
            setCurrentVideo(initialCurrentVideo);
            initialSynced = true;
          } else if (
            !initialSynced &&
            initialQueue !== null &&
            initialCurrentVideo === null
          ) {
            setQueue(initialQueue);
            setCurrentVideo(null);
            initialSynced = true;
          }

          // Handle all other updates as before
          switch (data.type) {
            case "VIDEO_ADDED":
              setQueue((prevQueue) => {
                const newQueue = [...prevQueue, data.video].sort(
                  (a, b) => b.upvotes - a.upvotes
                );
                return newQueue;
              });
              if (data.userId !== currentUserId) {
                toast.info(`New song added: ${data.video.title}`);
              }
              break;
            case "VIDEO_UPVOTED":
            case "VIDEO_DOWNVOTED":
              setQueue((prevQueue) =>
                prevQueue
                  .map((video) =>
                    video.id === data.videoId
                      ? {
                          ...video,
                          upvotes: data.newUpvotes,
                          haveUpvoted: data.userId === currentUserId ? data.userVoted : video.haveUpvoted,
                        }
                      : video
                  )
                  .sort((a, b) => b.upvotes - a.upvotes)
              );
              break;
            case "VIDEO_PLAYING":
            case "CURRENT_VIDEO":
              setCurrentVideo(data.video);
              setQueue((prevQueue) => prevQueue.filter((v) => v.id !== data.video?.id));
              break;
            case "QUEUE_UPDATED":
              setQueue(
                data.queue
                  .map((video: Video) => ({
                    ...video,
                    haveUpvoted: video.upvoters
                    ? currentUserId !== null && video.upvoters.includes(currentUserId)
                    : video.haveUpvoted,
                  }))
                  .sort((a: Video, b: Video) => b.upvotes - a.upvotes)
              );
              break;
            case "ERROR":
              toast.error(data.message);
              break;
            default:
              break;
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setWsConnected(false);
        if (pingInterval) clearInterval(pingInterval);
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect WebSocket...");
            connectWebSocket();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setWsConnected(false);
        if (pingInterval) clearInterval(pingInterval);
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      setWsConnected(false);
    }
  }, [creatorId, currentUserId]);

  // Initialize on mount
  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      connectWebSocket();
    }
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
    };
  }, [connectWebSocket, currentUserId]);

  // YouTube player management
  useEffect(() => {
    if (!playVideo || !currentVideo?.extractedId) return;

    const container = videoPlayerRef.current;
    if (!container) return;

    // Always destroy the player before loading a new one
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (error) {
        // Ignore removeChild errors
      }
      playerRef.current = null;
    }

    let player: any = null;
    try {
      player = YouTubePlayer(container, {
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          playsinline: 1,
        },
      });
      playerRef.current = player;

      const onStateChange = (event: any) => {
        if (event.data === 0) {
          handlePlayNext();
        }
      };

      player.on("ready", () => {
        player.loadVideoById(currentVideo.extractedId);
      });
      player.on("stateChange", onStateChange);
      player.loadVideoById(currentVideo.extractedId);
    } catch (error) {
      console.error("Error setting up YouTube player:", error);
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          // Ignore removeChild errors
        }
        playerRef.current = null;
      }
    };
  }, [currentVideo?.extractedId, playVideo]);

  // Extract YouTube video ID from any valid YouTube URL format
  function extractYouTubeId(url: string): string | null {
    // Try to match all common YouTube URL formats
    const regex = /(?:v=|\/v\/|embed\/|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    if (match && match[1]) return match[1];

    // Fallback: try to get v= param if present
    try {
      const u = new URL(url);
      if (u.searchParams.get('v')) {
        return u.searchParams.get('v');
      }
    } catch {}
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLink.trim() || !wsRef.current) return;

    setLoading(true);
    try {
      // Use robust YouTube ID extraction
      const videoId = extractYouTubeId(inputLink);
      if (!videoId) {
        toast.error("Invalid YouTube link");
        setLoading(false);
        return;
      }
      const videoInfo = await getVideoInfo(videoId);

      wsRef.current.send(
        JSON.stringify({
          type: "ADD_VIDEO",
          url: inputLink,
          extractedId: videoId,
          title: videoInfo.title,
          smallImg: videoInfo.smallImg,
          bigImg: videoInfo.bigImg,
          userId: currentUserId,
        })
      );

      setInputLink("");
      toast.success("Video added to queue!");
    } catch (error) {
      console.error("Error adding video:", error);
      toast.error("Failed to add video to queue");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (id: string, isUpvote: boolean) => {
    if (!wsRef.current || !currentUserId) return;

    wsRef.current.send(
      JSON.stringify({
        type: isUpvote ? "UPVOTE" : "DOWNVOTE",
        streamId: id,
        userId: currentUserId,
      })
    );
  };

  const handlePlayNext = () => {
    if (!wsRef.current) return;

    setPlayNextLoader(true);

    // Stop current video if playing
    if (playerRef.current) {
      try {
        playerRef.current.stopVideo();
      } catch (error) {
        console.error("Error stopping current video:", error);
      }
    }

    wsRef.current.send(
      JSON.stringify({
        type: "PLAY_NEXT",
      })
    );

    setTimeout(() => setPlayNextLoader(false), 1000);
  };

  const handleShare = () => {
    const shareableLink = `${window.location.origin}/creator/${creatorId}`;
    navigator.clipboard
      .writeText(shareableLink)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link"));
  };

  const getVideoInfo = async (videoId: string) => {
    return {
      title: "Video Title",
      smallImg: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      bigImg: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };
  };

  return (
    <div className="flex flex-col min-h-screen bg-[rgb(10,10,10)] text-gray-200">
      <Appbar />

      {/* WebSocket Connection Status */}
      <div className="fixed top-4 right-4 z-50">
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            wsConnected
              ? "bg-green-900 text-green-200 border border-green-700"
              : "bg-red-900 text-red-200 border border-red-700"
          }`}
        >
          {wsConnected ? "🟢 Live" : "🔴 Connecting..."}
        </div>
      </div>

      <div className="flex mt-10 justify-center">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 w-screen max-w-screen-xl pt-8">
          <div className="col-span-3">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Upcoming Songs</h2>

              {queue.length === 0 && (
                <Card className="bg-gray-900 border-gray-800 w-full">
                  <CardContent className="p-4">
                    <p className="text-center py-8 text-gray-400">
                      No videos in queue
                    </p>
                  </CardContent>
                </Card>
              )}

              {queue.map((video) => (
                <Card key={video.id} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4 flex items-center space-x-4">
                    <img
                      src={video.smallImg}
                      alt={video.title}
                      className="w-30 h-20 object-cover rounded"
                    />
                    <div className="flex-grow">
                      <h3 className="font-semibold text-white">
                        {video.title}
                      </h3>
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleVote(video.id, !video.haveUpvoted)
                          }
                          className="flex items-center space-x-1 bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                        >
                          {video.haveUpvoted ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                          <span>{video.upvotes}</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <div className="max-w-4xl mx-auto p-4 space-y-6 w-full">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-white">Add a song</h1>
                <Button
                  onClick={handleShare}
                  className="bg-purple-700 hover:bg-purple-800 text-white"
                >
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2">
                <Input
                  type="text"
                  placeholder="Paste YouTube link here"
                  value={inputLink}
                  onChange={(e) => setInputLink(e.target.value)}
                  className="bg-gray-900 text-white border-gray-700 placeholder-gray-500"
                />
                <Button
                  type="submit"
                  disabled={loading || !wsConnected}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white"
                >
                  {loading ? "Loading..." : "Add to Queue"}
                </Button>
              </form>

              {inputLink && extractYouTubeId(inputLink) && !loading && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <img
                      src={`https://img.youtube.com/vi/${extractYouTubeId(inputLink)}/mqdefault.jpg`}
                      alt="YouTube preview"
                      className="w-full h-48 object-cover rounded"
                    />
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white">Now Playing</h2>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    {/* Always use a stable wrapper div for the player to avoid React/DOM removal errors */}
                    {currentVideo && playVideo ? (
                      <div className="youtube-player-wrapper">
                        <div ref={videoPlayerRef} className="w-full" />
                      </div>
                    ) : currentVideo ? (
                      <>
                        <img
                          src={currentVideo.bigImg}
                          className="w-full h-72 object-cover rounded"
                        />
                        <p className="mt-2 text-center font-semibold text-white">
                          {currentVideo.title}
                        </p>
                      </>
                    ) : (
                      <p className="text-center py-8 text-gray-400">
                        No video playing
                      </p>
                    )}
                  </CardContent>
                </Card>
                {playVideo && (
                  <Button
                    onClick={handlePlayNext}
                    disabled={playNextLoader || !wsConnected || queue.length === 0}
                    className="w-full bg-purple-700 hover:bg-purple-800 text-white"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {playNextLoader ? "Loading..." : "Play next"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer theme="dark" />
    </div>
  );
}
