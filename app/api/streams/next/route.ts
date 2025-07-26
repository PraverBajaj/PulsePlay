// app/api/streams/next/route.ts
import { prismaClient } from "@/lib/db";
import { getServerSession } from "next-auth";
import {  NextResponse } from "next/server";


export async function GET() {
  const session = await getServerSession();

  const user = await prismaClient.user.findFirst({
    where: {
      email: session?.user?.email ?? "",
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: "Unauthenticated" },
      { status: 403 }
    );
  }

  console.log("Looking for the most upvoted unplayed stream");

  const mostUpvotedStream = await prismaClient.stream.findFirst({
    where: {
      userId: user.id,
      played: false,
    },
    orderBy: {
      upvotes: {
        _count: "desc",
      },
    },
    include: {
      upvotes: true, // in case you need to count or display
    },
  });

  if (!mostUpvotedStream) {
    return NextResponse.json(
      { message: "No unplayed stream found" },
      { status: 404 }
    );
  }

  // Mark this stream as currently playing & set it as "played"
  await Promise.all([
    prismaClient.currentStream.upsert({
      where: {
        userId: user.id,
      },
      update: {
        streamId: mostUpvotedStream.id,
      },
      create: {
        userId: user.id,
        streamId: mostUpvotedStream.id,
      },
    }),
    prismaClient.stream.update({
      where: {
        id: mostUpvotedStream.id,
      },
      data: {
        played: true,
        playedTs: new Date(),
      },
    }),
  ]);



  return NextResponse.json({ stream: mostUpvotedStream });
}
