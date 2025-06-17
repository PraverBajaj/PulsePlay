import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const YT_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
