import React from "react";
import { Appbar } from "./components/Appbar";
import { cn } from "@/lib/utils";
import { Github, Twitter } from "lucide-react";
import {
  CardHoverEffectDemo,
  EvervaultCardDemo,
  WordsFlip,
} from "./components/landingpagecomp";
import { Redirect } from "./components/redirect";

export default function LandingPage() {
  return (
    <div>
      <div className="relative flex flex-col h-[130rem] md:h-[80rem] w-full items-center justify-center bg-black overflow-hidden">
        <Appbar />
        <Redirect/>
        <div
          className={cn(
            "absolute inset-0 pointer-events-none z-0 opacity-45",
            "[background-size:80px_80px]",
            "[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]"
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-orange-500/20 blur-3xl opacity-80 pointer-events-none z-10" />
        <div className="absolute inset-0 bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none z-20" />
        <div className="relative z-30 text-center top-[3%] md:top-[0%] text-neutral-200 px-4">
          <div className="flex justify-center mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="white"
              className="w-12 h-12 md:w-16 md:h-16"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19V6l12-2v13"
              />
              <circle cx="6" cy="18" r="3" fill="white" />
              <circle cx="18" cy="16" r="3" fill="white" />
            </svg>
          </div>
          <p className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight">
            Let Your Fans Choose the Beat
          </p>
          <p className="text-5xl md:text-6xl lg:text-7xl pb-3 font-medium tracking-tight">
            Where Votes Create the Vibe
          </p>
          <p className="text-lg md:text-xl text-white/70 mb-12 max-w-3xl mx-auto leading-relaxed">
            Experience music like never before. Vote for your favorite tracks
            and watch as the community's pulse shapes the playlist in real-time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-6 py-3 cursor-pointer bg-white text-black rounded-xl font-medium hover:bg-neutral-200 transition">
              Get Started
            </button>
            <button className="px-6 py-3 border cursor-pointer border-white/40 text-white rounded-xl font-medium hover:bg-white/10 transition">
              Learn More
            </button>
          </div>
        </div>

        <div className="relative z-40 mt-8  w-full flex justify-center px-4">
          <CardHoverEffectDemo />
        </div>
      </div>

      <div className="bg-black h-[20rem] md:h-[30rem]">
        <div className="md:mx-40 pt-10 md:pt-0 flex flex-col md:flex-row justify-center gap-8 px-4 md:px-0">
          <WordsFlip />

          <EvervaultCardDemo />
        </div>
      </div>

      <footer className="bg-black text-white text-center py-6 border-t border-white/10 px-4">
        <p className="text-sm mb-4">
          Made with <span className="text-red-500">❤️</span> by{" "}
          <span className="font-semibold">Praver</span>
        </p>
        <div className="flex justify-center gap-6">
          <a
            href="https://github.com/your-github-username"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white text-white/80 transition"
          >
            <Github className="w-6 h-6" />
          </a>
          <a
            href="https://twitter.com/your-twitter-handle"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white text-white/80 transition"
          >
            <Twitter className="w-6 h-6" />
          </a>
        </div>
      </footer>
    </div>
  );
}
