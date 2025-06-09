import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/app/lib/db";

const upvoteSchema = z.object({
  streamId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      });
    }

    const body = await req.json();
    const parsed = upvoteSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
      });
    }

    const { streamId } = parsed.data;

    const user = await prismaClient.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    await prismaClient.upvote.create({
      data: {
        streamId,
        userId: user.id,
      },
    });

    return new Response(JSON.stringify({ message: "Upvote recorded" }), {
      status: 200,
    });
  } catch (error) {
    console.error("POST /upvote error:", error);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}
