import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/app/lib/db";
// @ts-expect-error
import { GetVideoDetails } from "youtube-search-api";

const createStreamSchema = z.object({
  creatorId: z.string(),
  url: z
    .string()
    .regex(
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}$/,
      "URL must be a valid YouTube link"
    ),
});

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const parsed = createStreamSchema.safeParse(data);

    if (!parsed.success) {
      return new Response(JSON.stringify(parsed.error.format()), {
        status: 400,
      });
    }

    const { creatorId, url } = parsed.data;

    let extractedid = "";

    if (url.includes("watch?v=")) {
      extractedid = url.split("watch?v=")[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
      extractedid = url.split("youtu.be/")[1].split("?")[0];
    }

    const videodetails = await GetVideoDetails(extractedid);
    const title = videodetails.title;
    console.log(title)
    const thumbnails = videodetails.thumbnail.thumbnails;
    const sorted = thumbnails.sort(
      (
        a: { width: number; height: number },
        b: { width: number; height: number }
      ) => b.width * b.height - a.width * a.height
    );

    const bigimage = sorted[0];
    console.log(bigimage)
    const smallimg = sorted[1];
     console.log(smallimg)
    const stream = await prismaClient.stream.create({
      data: {
        userId: creatorId,
        url: url,
        type: "Youtube",
        extractedid,
        upvotes: 0,
        title : title.toString(),
        bigimage : bigimage.url,
        smallimg : smallimg.url,
      },
    });
    return NextResponse.json({
      message: "Stream Created",
      StreamId: stream.id,
    });
  } catch (e) {
    return new Response("Error" + e, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const creatorId = req.nextUrl.searchParams.get("creatorId");
    const streams = await prismaClient.stream.findMany({
      where: {
        userId: creatorId ?? "",
      },
    });
    return NextResponse.json({
      streams,
    });
  } catch (e) {
    NextResponse.json(
      {
        message: "Error while fetching Internal Server Error" + e,
      },
      { status: 500 }
    );
  }
}
