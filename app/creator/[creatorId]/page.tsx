import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import StreamView from "@/app/components/StreamView";
import { prismaClient } from "@/lib/db";

export const dynamic = 'force-dynamic';

export default async function CreatorPage({
  params,
}: {
  params: { creatorId: string };
}) {
  const session = await getServerSession();

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/creator/${params.creatorId}`)}`);
  }

  const user = await prismaClient.user.findFirst({
    where: {
      email: session.user?.email || "",
    },
  });

  if (!user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/creator/${params.creatorId}`)}`);
  }

  return (
    <div>
      <StreamView creatorId={(await params).creatorId} playVideo={false} />
    </div>
  );
}
