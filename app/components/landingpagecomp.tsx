"use client"
import { FlipWords } from "../../components/ui/flip-words";
import { EvervaultCard, Icon } from "../../components/ui/evervault-card";
import { HoverEffect } from "../../components/ui/card-hover-effect";

export function WordsFlip() {
  const words = ["vote", "choose", "play", "enjoy"];

  return (
    <div className="w-full pt-10 max-w-2xl">
      <div className="md:text-5xl text-3xl font-semibold text-left text-neutral-300 dark:text-neutral-400 leading-snug">
        With Pulse Play, you <br />
        <FlipWords words={words} /> the music. <br />
        Let your crowd decide what plays next.
      </div>
    </div>
  );
}



export function CardHoverEffectDemo() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8">
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


export function EvervaultCardDemo() {
  return (
    <div className="border border-black/[0.2] dark:border-white/[0.2]  flex-col items-start max-w-sm mx-auto p-4 md:block hidden relative h-[30rem]">
      <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
      <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />

      <EvervaultCard text="PulsePlay" />
    </div>
  );
}
