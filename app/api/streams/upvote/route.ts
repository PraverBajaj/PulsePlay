import { prismaClient } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


const UpvoteSchema = z.object({
  streamId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession();

  const user = await prismaClient.user.findFirst({
    where: {
      email: session?.user?.email ?? "",
    },
  });

  if (!user) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 403 });
  }

  try {
    const data = UpvoteSchema.parse(await req.json());

    // Check if user has already upvoted
    const existing = await prismaClient.upvote.findFirst({
      where: {
        userId: user.id,
        streamId: data.streamId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Already upvoted" },
        { status: 409 }
      );
    }

    // Register the upvote
    await prismaClient.upvote.create({
      data: {
        userId: user.id,
        streamId: data.streamId,
      },
    });

    // Count updated upvotes
    const updatedUpvoteCount = await prismaClient.upvote.count({
      where: { streamId: data.streamId },
    });

    // Get stream info for broadcasting
    const stream = await prismaClient.stream.findUnique({
      where: { id: data.streamId },
      select: { userId: true },
    });



    return NextResponse.json({ message: "Upvoted!" });
  } catch (e) {
    console.error("Upvote error:", e);
    return NextResponse.json(
      { message: "Error while upvoting" },
      { status: 500 }
    );
  }
}
