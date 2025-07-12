import { prismaClient } from "@/lib/db";
import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth"; // Make sure to import your auth options
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface BroadcastPayload {
  type: "VIDEO_DOWNVOTED";
  videoId: string;
  newUpvotes: number;
  userVoted: boolean;
}

function broadcastToCreator(creatorId: string, data: BroadcastPayload) {
  if ((global as any).broadcastToCreator) {
    (global as any).broadcastToCreator(creatorId, data);
  }
}

const DownvoteSchema = z.object({
  streamId: z.string(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 403 });
  }

  const user = await prismaClient.user.findFirst({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 403 });
  }

  try {
    const data = DownvoteSchema.parse(await req.json());

    // Delete upvote
    await prismaClient.upvote.delete({
      where: {
        userId_streamId: {
          userId: user.id,
          streamId: data.streamId,
        },
      },
    });

    const newUpvoteCount = await prismaClient.upvote.count({
      where: { streamId: data.streamId },
    });

    const stream = await prismaClient.stream.findUnique({
      where: { id: data.streamId },
      select: { userId: true },
    });

    if (stream?.userId) {
      broadcastToCreator(stream.userId, {
        type: "VIDEO_DOWNVOTED",
        videoId: data.streamId,
        newUpvotes: newUpvoteCount,
        userVoted: false,
      });
    }

    return NextResponse.json({ message: "Downvote successful" });
  } catch (e) {
    console.error("Downvote error:", e);
    return NextResponse.json(
      { message: "Error while downvoting" },
      { status: 500 }
    );
  }
}
