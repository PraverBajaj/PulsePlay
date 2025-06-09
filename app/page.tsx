"use client";
import React from "react";
import { Appbar } from "./components/Appbar";
import { cn } from "@/lib/utils";
import { Github, Twitter } from "lucide-react";

export default function LandingPage() {
  return (
    <div>
      <div className="relative flex flex-col h-[80rem] w-full items-center justify-center bg-black overflow-hidden">
        <Appbar />
        {/* Grid lines at bottom layer */}
        <div
          className={cn(
            "absolute inset-0 pointer-events-none z-0 opacity-15",
            "[background-size:80px_80px]",
            "[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]"
          )}
        />

        {/* Blurred multicolor gradient layer above grid */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-orange-500/20 blur-3xl opacity-80 pointer-events-none z-10" />

        {/* Optional radial fade mask on top of blur */}
        <div className="absolute inset-0 bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none z-20" />

        {/* Text above everything */}
        <div className="relative z-30 text-center text-neutral-200 px-4">
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

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-6 py-3 cursor-pointer bg-white text-black rounded-xl font-medium hover:bg-neutral-200 transition">
              Get Started
            </button>
            <button className="px-6 py-3 border cursor-pointer border-white/40 text-white rounded-xl font-medium hover:bg-white/10 transition">
              Learn More
            </button>
          </div>
        </div>

        {/* Center card below text */}
        <div className="relative z-40 mt-8 w-full flex justify-center px-4">
          <CardHoverEffectDemo />
        </div>
      </div>

      <div className="bg-black h-[30rem]">
        <div className="mx-40 flex justify-center">
          <WordsFlip />
          <EvervaultCardDemo />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white text-center py-6 border-t border-white/10">
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

import { FlipWords } from "../components/ui/flip-words";

export function WordsFlip() {
  const words = ["vote", "choose", "play", "enjoy"];

  return (
    <div className="w-full max-w-2xl">
      <div className="md:text-5xl text-3xl font-semibold text-left text-neutral-300 dark:text-neutral-400 leading-snug">
        With Pulse Play, you <br />
        <FlipWords words={words} /> the music. <br />
        Let your crowd decide what plays next.
      </div>
    </div>
  );
}

import { HoverEffect } from "../components/ui/card-hover-effect";

export function CardHoverEffectDemo() {
  return (
    <div className="max-w-5xl mx-auto px-8">
      <HoverEffect items={projects} />
    </div>
  );
}
export const projects = [
  {
    title: "Real-Time Voting",
    description:
      "Users upvote their favorite music videos or audio tracks live, influencing what plays next in real-time.",
  },
  {
    title: "Community-Powered Playlists",
    description:
      "The platform dynamically curates playlists based on collective user preferences and votes.",
  },
  {
    title: "Interactive Music Experience",
    description:
      "Engage your audience by letting them decide the vibe through voting, creating an immersive and participatory music session.",
  },
  {
    title: "Seamless Video & Audio Integration",
    description:
      "Supports both music videos and audio tracks for diverse content consumption.",
  },
  {
    title: "PulsePlay Analytics",
    description:
      "Track voting trends and listener engagement to understand what’s resonating with your community.",
  },
  {
    title: "Scalable SaaS Platform",
    description:
      "Built to handle growing audiences, PulsePlay offers robust performance for live interactive music voting at scale.",
  },
];

import { EvervaultCard, Icon } from "../components/ui/evervault-card";

export function EvervaultCardDemo() {
  return (
    <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start max-w-sm mx-auto p-4 relative h-[30rem]">
      <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />

      <EvervaultCard text="hover" />

      <h2 className="dark:text-white text-black mt-4 text-sm font-light">
        Hover over this card to reveal an awesome effect. Running out of copy
        here.
      </h2>
      <p className="text-sm border font-light dark:border-white/[0.2] border-black/[0.2] rounded-full mt-4 text-black dark:text-white px-2 py-0.5">
        Watch me hover
      </p>
    </div>
  );
}
