"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useSession, signIn } from "next-auth/react";
import StreamView from "../components/StreamView";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("google"); 
      return;
    }

    if (status === "authenticated") {
      const fetchUser = async () => {
        try {
          const { data } = await axios.get("/api/user", { withCredentials: true });
          setCreatorId(data.user.id);
        } catch (error) {
          toast.error("Failed to fetch user session");
          console.error("API /api/user error:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black text-xl">
        Setting things up...
      </div>
    );
  }

  if (!creatorId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 bg-black text-xl">
        You must be logged in to view this page.
      </div>
    );
  }

  return (
    <>
      <StreamView creatorId={creatorId} playVideo={true} />
      <ToastContainer theme="dark" />
    </>
  );
}
