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
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import { YT_REGEX } from "@/lib/utils";
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
  const [refreshLoading, setRefreshLoading] = useState(false);

  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize data without polling
  const initializeData = async () => {
    try {
      const { data } = await axios.get(`/api/streams/?creatorId=${creatorId}`, {
        withCredentials: true,
      });
      setQueue(
        data.streams.sort((a: Video, b: Video) => b.upvotes - a.upvotes)
      );
      setCurrentVideo(data.activeStream?.stream || null);
    } catch (error) {
      console.error("Error fetching initial streams:", error);
    }
  };

  const refreshQueue = async () => {
    setRefreshLoading(true);
    try {
      const { data } = await axios.get(`/api/streams/?creatorId=${creatorId}`, {
        withCredentials: true,
      });
      setQueue(
        data.streams.sort((a: Video, b: Video) => b.upvotes - a.upvotes)
      );
    } catch (error) {
      console.error("Error refreshing queue:", error);
      toast.error("Failed to refresh queue");
    } finally {
      setRefreshLoading(false);
    }
  };

  const playNext = useCallback(async () => {
    if (!queue.length) return;
    setPlayNextLoader(true);
    try {
      const { data } = await axios.get("/api/streams/next");
      setCurrentVideo(data.stream);
      setQueue((prevQueue) =>
        prevQueue.filter((x) => x.id !== data.stream?.id)
      );
    } catch (error) {
      console.error("Error playing next video:", error);
    } finally {
      setPlayNextLoader(false);
    }
  }, [queue.length]);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      // Replace with your actual WebSocket URL
      const wsUrl = `ws://localhost:3001/stream/${creatorId}`;
      // For production, use: `wss://yourdomain.com/stream/${creatorId}`

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        setWsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data);

          switch (data.type) {
            case "VIDEO_ADDED":
              setQueue((prevQueue) => {
                const newQueue = [...prevQueue, data.video].sort(
                  (a, b) => b.upvotes - a.upvotes
                );
                return newQueue;
              });
              if (data.userId !== "current-user-id") {
                // Replace with actual user ID logic
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
                          haveUpvoted: data.userVoted,
                        }
                      : video
                  )
                  .sort((a, b) => b.upvotes - a.upvotes)
              );
              break;

            case "VIDEO_PLAYING":
              setCurrentVideo(data.video);
              setQueue((prevQueue) =>
                prevQueue.filter((x) => x.id !== data.video?.id)
              );
              break;

            case "QUEUE_UPDATED":
              setQueue(
                data.queue.sort((a: Video, b: Video) => b.upvotes - a.upvotes)
              );
              break;

            default:
              console.log("Unknown WebSocket message type:", data.type);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setWsConnected(false);

        // Reconnect after delay if not intentionally closed
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
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      setWsConnected(false);
    }
  }, [creatorId]);

  // Initialize on mount
useEffect(() => {
  initializeData();

  // Delay WebSocket connection by 3 seconds
  const timeout = setTimeout(() => {
    connectWebSocket();
  }, 1000); // 3000ms = 3 seconds

  return () => {
    // Cleanup the delayed call if component unmounts early
    clearTimeout(timeout);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Component unmounting");
    }
  };
}, [connectWebSocket]);


  // YouTube player management
  useEffect(() => {
    if (!videoPlayerRef.current || !currentVideo?.extractedId || !playVideo)
      return;

    // Only recreate player if the video actually changed
    if (playerRef.current) {
      try {
        const currentUrl = playerRef.current.getVideoUrl?.();
        const currentVideoId = currentUrl?.split("v=")[1]?.split("&")[0];
        if (currentVideoId === currentVideo.extractedId) {
          return; // Same video, don't recreate
        }
      } catch (error) {
        // Continue with recreation if we can't determine current video
      }
    }

    // Clean up previous player
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (error) {
        console.error("Error destroying previous player:", error);
      }
      playerRef.current = null;
    }

    // Create new player
    try {
      const player = YouTubePlayer(videoPlayerRef.current, {
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          fs: 1,
          playsinline: 1,
        },
      });

      playerRef.current = player;

      const onStateChange = (event: any) => {
        console.log("Player state changed:", event.data);
        if (event.data === 0) {
          // Video ended
          console.log("Video ended, playing next...");
          playNext();
        }
      };

      player.on("ready", () => {
        console.log("Player ready, loading video:", currentVideo.extractedId);
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
          console.error("Error destroying player on cleanup:", error);
        }
        playerRef.current = null;
      }
    };
  }, [currentVideo?.extractedId, playVideo, playNext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLink.trim()) return;

    setLoading(true);
    try {
      const { data } = await axios.post("/api/streams/", {
        creatorId,
        url: inputLink,
      });

      // Don't update queue here - let WebSocket handle it
      // This prevents duplicate updates and ensures consistency
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
    // Optimistic update
    setQueue((prevQueue) =>
      prevQueue
        .map((video) =>
          video.id === id
            ? {
                ...video,
                upvotes: isUpvote ? video.upvotes + 1 : video.upvotes - 1,
                haveUpvoted: !video.haveUpvoted,
              }
            : video
        )
        .sort((a, b) => b.upvotes - a.upvotes)
    );

    try {
      await axios.post(`/api/streams/${isUpvote ? "upvote" : "downvote"}`, {
        streamId: id,
      });
      // WebSocket will handle the real update
    } catch (error) {
      console.error("Error voting:", error);
      // Revert optimistic update on error
      setQueue((prevQueue) =>
        prevQueue
          .map((video) =>
            video.id === id
              ? {
                  ...video,
                  upvotes: isUpvote ? video.upvotes - 1 : video.upvotes + 1,
                  haveUpvoted: !video.haveUpvoted,
                }
              : video
          )
          .sort((a, b) => b.upvotes - a.upvotes)
      );
      toast.error("Failed to vote. Please try again.");
    }
  };

  const handleShare = () => {
    const shareableLink = `${window.location.origin}/creator/${creatorId}`;
    navigator.clipboard
      .writeText(shareableLink)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch((err) => {
        console.error("Clipboard error:", err);
        toast.error("Failed to copy link. Please try again.");
      });
  };

  const handleManualPlayNext = () => {
    if (playerRef.current) {
      try {
        playerRef.current.stopVideo();
      } catch (error) {
        console.error("Error stopping current video:", error);
      }
    }
    playNext();
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
              <h2 className="text-2xl font-bold text-white flex items-center justify-between">
                <span>Upcoming Songs</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshQueue}
                  disabled={refreshLoading}
                  className="ml-4 bg-gray-800 text-white border-gray-700 hover:bg-gray-700 flex items-center space-x-2"
                >
                  {refreshLoading && (
                    <svg
                      className="animate-spin h-4 w-4 text-white mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  )}
                  <span>{refreshLoading ? "Refreshing..." : "Refresh"}</span>
                </Button>
              </h2>

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
                  disabled={loading}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white"
                >
                  {loading ? "Loading..." : "Add to Queue"}
                </Button>
              </form>

              {inputLink && inputLink.match(YT_REGEX) && !loading && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <LiteYouTubeEmbed title="" id={inputLink.split("?v=")[1]} />
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white">Now Playing</h2>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    {currentVideo ? (
                      playVideo ? (
                        <div ref={videoPlayerRef} className="w-full" />
                      ) : (
                        <>
                          <img
                            src={currentVideo.bigImg}
                            className="w-full h-72 object-cover rounded"
                          />
                          <p className="mt-2 text-center font-semibold text-white">
                            {currentVideo.title}
                          </p>
                        </>
                      )
                    ) : (
                      <p className="text-center py-8 text-gray-400">
                        No video playing
                      </p>
                    )}
                  </CardContent>
                </Card>
                {playVideo && (
                  <Button
                    onClick={handleManualPlayNext}
                    disabled={playNextLoader}
                    className="w-full bg-purple-700 hover:bg-purple-800 text-white"
                  >
                    <Play className="mr-2 h-4 w-4" />{" "}
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
