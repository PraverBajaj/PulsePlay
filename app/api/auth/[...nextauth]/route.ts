import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prismaClient } from "@/lib/db";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET ?? "",
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const existingUser = await prismaClient.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) {
        await prismaClient.user.create({
          data: {
            email: user.email,
            provider: "Google",
          },
        });
      }

      return true;
    },
  },
});

export { handler as GET, handler as POST };
