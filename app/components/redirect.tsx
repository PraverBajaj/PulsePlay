"use client"
import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

 
export function Redirect(){
    const session = useSession()
    const router = useRouter()

    useEffect(()=>{
        if(session.data?.user){
            router.replace("/dashboard")
        }
    },[session, router])

    return null
}