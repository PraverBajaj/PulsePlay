"use client";
import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function Appbar() {
  const session = useSession();

  return (
    <header className="fixed top-0 left-0 w-full z-50 backdrop-blur bg-black/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
            <Logo />
           <span className="text-xl font-semibold tracking-tight">
          
            <span> Pulseplay</span> 
             </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex gap-8 text-sm font-medium text-white/80">
            <Link href="#about" className="hover:text-white cursor-pointer transition">About</Link>
            <Link href="#features" className="hover:text-white cursor-pointer transition">Features</Link>
          </nav>

          {/* Auth Button */}
          <div>
            {session.data?.user ? (
              <Button
                variant="ghost"
                className="text-white border border-white/20 hover:bg-white cursor-pointer px-4 py-2 rounded-xl"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="text-black border border-white/20 hover:bg-black hover:text-white cursor-pointer px-4 py-2 rounded-xl"
                onClick={() => signIn()}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
