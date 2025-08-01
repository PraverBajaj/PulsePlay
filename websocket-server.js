import { WebSocketServer } from "ws";
import { createServer } from "http";
import { PrismaClient } from "@prisma/client";
import { parse } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const server = createServer();
const wss = new WebSocketServer({ server });

// Store active connections by creatorId
const connections = new Map();

// Helper function to broadcast to all clients in a room
function broadcastToRoom(creatorId, message) {
  const roomConnections = connections.get(creatorId);
  if (roomConnections) {
    const messageStr = JSON.stringify(message);
    roomConnections.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(messageStr);
      }
    });
  }
}

async function getUpdatedQueue(creatorId) {
  try {
    const streams = await prisma.stream.findMany({
      where: {
        userId: creatorId,
        played: false,
        active: false, // Only get non-active videos for the queue
      },
      include: {
        _count: {
          select: {
            upvotes: true,
          },
        },
        upvotes: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: [
        {
          upvotes: {
            _count: "desc",
          },
        },
        {
          id: "asc",
        },
      ],
    });

    return streams.map((stream) => ({
      id: stream.id,
      type: stream.type,
      url: stream.url,
      extractedId: stream.extractedId,
      title: stream.title,
      smallImg: stream.smallImg,
      bigImg: stream.bigImg,
      active: stream.active,
      userId: stream.userId,
      upvotes: stream._count.upvotes,
      haveUpvoted: false,
    }));
  } catch (error) {
    console.error("Error in getUpdatedQueue:", error);
    return [];
  }
}
wss.on("connection", (ws, request) => {
  const { pathname } = parse(request.url || "", true);
  const creatorId = pathname?.split("/").pop();

  if (!creatorId) {
    ws.close(1008, "Invalid creator ID");
    return;
  }

  console.log(`Client connected to room: ${creatorId}`);

  // Add connection to room
  if (!connections.has(creatorId)) {
    connections.set(creatorId, new Set());
  }
  connections.get(creatorId).add(ws);

  // Send initial data (queue + current video)
  Promise.all([
    getUpdatedQueue(creatorId),
    getCurrentVideo(creatorId)
  ])
    .then(([queue, currentVideo]) => {
      // Send initial queue
      ws.send(
        JSON.stringify({
          type: "INITIAL_QUEUE",
          queue,
        })
      );

      // Send current video if exists
      if (currentVideo) {
        ws.send(
          JSON.stringify({
            type: "CURRENT_VIDEO",
            video: currentVideo,
          })
        );
      }
    })
    .catch((error) => {
      console.error("Error fetching initial data:", error);
      ws.send(
        JSON.stringify({
          type: "ERROR",
          message: "Failed to fetch initial data",
        })
      );
    });

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());
      // Heartbeat: respond to ping
      if (message.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG" }));
        return;
      }

      console.log("Received message:", message);

      switch (message.type) {
        case "ADD_VIDEO":
          try {
            // Add video to database
            const newStream = await prisma.stream.create({
              data: {
                userId: creatorId,
                url: message.url,
                extractedId: message.extractedId,
                type: message.videoType || "Youtube",
                title: message.title,
                smallImg: message.smallImg,
                bigImg: message.bigImg,
                active: false, // New videos are not active by default
                played: false,
              },
              include: {
                _count: {
                  select: {
                    upvotes: true,
                  },
                },
              },
            });

            const videoData = {
              id: newStream.id,
              type: newStream.type,
              url: newStream.url,
              extractedId: newStream.extractedId,
              title: newStream.title,
              smallImg: newStream.smallImg,
              bigImg: newStream.bigImg,
              active: newStream.active,
              userId: newStream.userId,
              upvotes: newStream._count.upvotes,
              haveUpvoted: false,
            };

            // Broadcast to all clients in the room
            broadcastToRoom(creatorId, {
              type: "VIDEO_ADDED",
              video: videoData,
              userId: message.userId,
            });
          } catch (error) {
            console.error("Error adding video:", error);
            ws.send(
              JSON.stringify({
                type: "ERROR",
                message: "Failed to add video",
              })
            );
          }
          break;

        case "UPVOTE":
        case "DOWNVOTE":
          try {
            const { streamId, userId } = message;
            const isUpvote = message.type === "UPVOTE";

            // Check if user already voted
            const existingVote = await prisma.upvote.findUnique({
              where: {
                userId_streamId: {
                  userId,
                  streamId,
                },
              },
            });

            let newUpvotes = 0;
            let userVoted = false;

            if (existingVote) {
              // Remove existing vote
              await prisma.upvote.delete({
                where: {
                  userId_streamId: {
                    userId,
                    streamId,
                  },
                },
              });
              userVoted = false;
            } else if (isUpvote) {
              // Add upvote
              await prisma.upvote.create({
                data: {
                  userId,
                  streamId,
                },
              });
              userVoted = true;
            }

            // Get updated vote count
            const voteCount = await prisma.upvote.count({
              where: { streamId },
            });
            newUpvotes = voteCount;

            // Broadcast vote update
            broadcastToRoom(creatorId, {
              type: isUpvote ? "VIDEO_UPVOTED" : "VIDEO_DOWNVOTED",
              videoId: streamId,
              newUpvotes,
              userVoted,
              userId,
            });

            // Send updated queue to maintain order
            const updatedQueue = await getUpdatedQueue(creatorId);
            broadcastToRoom(creatorId, {
              type: "QUEUE_UPDATED",
              queue: updatedQueue,
            });
          } catch (error) {
            console.error("Error handling vote:", error);
            ws.send(
              JSON.stringify({
                type: "ERROR",
                message: "Failed to process vote",
              })
            );
          }
          break;

        case "PLAY_NEXT":
          try {
            // First, mark current active stream as played (but keep it active until new one starts)
            const currentActiveStream = await prisma.stream.findFirst({
              where: {
                userId: creatorId,
                active: true,
              },
            });

            // Get the most upvoted video from the queue (non-active, non-played)
            const nextStream = await prisma.stream.findFirst({
              where: {
                userId: creatorId,
                played: false,
                active: false, // Only get videos that are not currently playing
              },
              include: {
                _count: {
                  select: {
                    upvotes: true,
                  },
                },
              },
              orderBy: [
                {
                  upvotes: {
                    _count: "desc",
                  },
                },
                {
                  id: "asc",
                },
              ],
            });

            if (nextStream) {
              // Mark current active stream as inactive and played
              if (currentActiveStream) {
                await prisma.stream.update({
                  where: { id: currentActiveStream.id },
                  data: {
                    active: false,
                    played: true,
                  },
                });
              }

              // Mark next stream as active (but not played yet)
              await prisma.stream.update({
                where: { id: nextStream.id },
                data: {
                  active: true,
                  played: false, // Keep as false until it actually finishes playing
                },
              });

              const videoData = {
                id: nextStream.id,
                type: nextStream.type,
                url: nextStream.url,
                extractedId: nextStream.extractedId,
                title: nextStream.title,
                smallImg: nextStream.smallImg,
                bigImg: nextStream.bigImg,
                active: true,
                userId: nextStream.userId,
                upvotes: nextStream._count.upvotes,
                haveUpvoted: false,
              };

              // Broadcast new playing video
              broadcastToRoom(creatorId, {
                type: "VIDEO_PLAYING",
                video: videoData,
              });

              // Send updated queue (without the now playing video)
              const updatedQueue = await getUpdatedQueue(creatorId);
              broadcastToRoom(creatorId, {
                type: "QUEUE_UPDATED",
                queue: updatedQueue,
              });
            } else {
              // No more videos in queue
              if (currentActiveStream) {
                await prisma.stream.update({
                  where: { id: currentActiveStream.id },
                  data: {
                    active: false,
                    played: true,
                  },
                });
              }

              broadcastToRoom(creatorId, {
                type: "VIDEO_PLAYING",
                video: null,
              });

              broadcastToRoom(creatorId, {
                type: "QUEUE_UPDATED",
                queue: [],
              });
            }
          } catch (error) {
            console.error("Error playing next video:", error);
            ws.send(
              JSON.stringify({
                type: "ERROR",
                message: "Failed to play next video",
              })
            );
          }
          break;

        case "GET_CURRENT_VIDEO":
          try {
            const currentVideo = await prisma.stream.findFirst({
              where: {
                userId: creatorId,
                active: true,
              },
              include: {
                _count: {
                  select: {
                    upvotes: true,
                  },
                },
              },
            });

            if (currentVideo) {
              ws.send(
                JSON.stringify({
                  type: "CURRENT_VIDEO",
                  video: {
                    id: currentVideo.id,
                    type: currentVideo.type,
                    url: currentVideo.url,
                    extractedId: currentVideo.extractedId,
                    title: currentVideo.title,
                    smallImg: currentVideo.smallImg,
                    bigImg: currentVideo.bigImg,
                    active: currentVideo.active,
                    userId: currentVideo.userId,
                    upvotes: currentVideo._count.upvotes,
                    haveUpvoted: false,
                  },
                })
              );
            }
          } catch (error) {
            console.error("Error getting current video:", error);
          }
          break;

        default:
          console.log("Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
      ws.send(
        JSON.stringify({
          type: "ERROR",
          message: "Invalid message format",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log(`Client disconnected from room: ${creatorId}`);
    const roomConnections = connections.get(creatorId);
    if (roomConnections) {
      roomConnections.delete(ws);
      if (roomConnections.size === 0) {
        connections.delete(creatorId);
      }
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

async function getCurrentVideo(creatorId) {
  try {
    const currentVideo = await prisma.stream.findFirst({
      where: {
        userId: creatorId,
        active: true,
      },
      include: {
        _count: {
          select: {
            upvotes: true,
          },
        },
      },
    });

    if (!currentVideo) return null;

    return {
      id: currentVideo.id,
      type: currentVideo.type,
      url: currentVideo.url,
      extractedId: currentVideo.extractedId,
      title: currentVideo.title,
      smallImg: currentVideo.smallImg,
      bigImg: currentVideo.bigImg,
      active: currentVideo.active,
      userId: currentVideo.userId,
      upvotes: currentVideo._count.upvotes,
      haveUpvoted: false,
    };
  } catch (error) {
    console.error("Error getting current video:", error);
    return null;
  }
}

const PORT = process.env.WS_PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(
    `Database URL configured: ${process.env.DATABASE_URL ? "Yes" : "No"}`
  );
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down WebSocket server...");
  await prisma.$disconnect();
  server.close();
});

process.on("SIGINT", async () => {
  console.log("Shutting down WebSocket server...");
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});
