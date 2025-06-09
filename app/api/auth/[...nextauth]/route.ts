import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google";
import { prismaClient } from "@/app/lib/db";

const handler = NextAuth({
   
  providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
  })
],
callbacks : {
    async signIn(params) {
        if(!params.user.email)  {
        return false
        }
        await prismaClient.user.create({
            data :{
                email :params.user.email,
                provider:"Google"
            }
        })
        return true
    }
}
})
export { handler as GET, handler as POST }