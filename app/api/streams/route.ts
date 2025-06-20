import { prismaClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";
import { YT_REGEX } from "@/lib/utils";
import { getServerSession } from "next-auth";

// Schema validation
const CreateStreamSchema = z.object({
  creatorId: z.string(),
  url: z.string()
});

const MAX_QUEUE_LEN = 2000;

// Broadcast helper (assuming global is set somewhere else)
function broadcastToCreator(creatorId: string, data: any) {
  if ((global as any).broadcastToCreator) {
    (global as any).broadcastToCreator(creatorId, data);
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = CreateStreamSchema.parse(await req.json());
    const isYt = data.url.match(YT_REGEX);
    if (!isYt) {
      return NextResponse.json({ message: "Wrong URL format" }, { status: 411 });
    }

    const extractedId = data.url.split("?v=")[1];
    const res = await youtubesearchapi.GetVideoDetails(extractedId);

    const thumbnails = res.thumbnail.thumbnails || [];
    thumbnails.sort((a: { width: number }, b: { width: number }) =>
      a.width < b.width ? -1 : 1
    );

    const existingStreams = await prismaClient.stream.count({
      where: { userId: data.creatorId }
    });

    if (existingStreams >= MAX_QUEUE_LEN) {
      return NextResponse.json({ message: "Already at limit" }, { status: 411 });
    }

    const stream = await prismaClient.stream.create({
      data: {
        userId: data.creatorId,
        url: data.url,
        extractedId,
        type: "Youtube",
        title: res.title ?? "Can't find video",
        smallImg:
          (thumbnails.length > 1
            ? thumbnails[thumbnails.length - 2].url
            : thumbnails[thumbnails.length - 1]?.url) ??
          "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
        bigImg:
          thumbnails[thumbnails.length - 1]?.url ??
          "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg"
      }
    });

    // Broadcast to WebSocket clients
    broadcastToCreator(data.creatorId, {
      type: "VIDEO_ADDED",
      video: {
        ...stream,
        upvotes: 0,
        hasUpvoted: false
      },
      userId: stream.userId
    });

    return NextResponse.json({
      ...stream,
      upvotes: 0,
      hasUpvoted: false
    });
  } catch (e) {
    console.error("Error while adding stream:", e);
    return NextResponse.json({ message: "Error while adding a stream" }, { status: 411 });
  }
}

export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  const session = await getServerSession();

  const user = await prismaClient.user.findFirst({
    where: {
      email: session?.user?.email ?? ""
    }
  });

  if (!user) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 403 });
  }

  if (!creatorId) {
    return NextResponse.json({ message: "Missing creatorId" }, { status: 411 });
  }

  const [streams, activeStream] = await Promise.all([
    prismaClient.stream.findMany({
      where: {
        userId: creatorId,
        played: false
      },
      include: {
        _count: {
          select: {
            upvotes: true
          }
        },
        upvotes: {
          where: {
            userId: user.id
          }
        }
      }
    }),
    prismaClient.currentStream.findFirst({
      where: {
        userId: creatorId
      },
      include: {
        stream: true
      }
    })
  ]);

  return NextResponse.json({
    streams: streams.map(({ _count, upvotes, ...rest }) => ({
      ...rest,
      upvotes: _count.upvotes,
      haveUpvoted: upvotes.length > 0
    })),
    activeStream
  });
}
