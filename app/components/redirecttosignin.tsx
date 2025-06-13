"use client"
import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

 
export function RedirecttoSignin(){
    const session = useSession()
    const router = useRouter()

    useEffect(()=>{
        if(!session.data?.user){
            router.replace("/api/auth/signin")
        }
    },[session, router])

    return null
}