import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Stable anonymous identity for one audience device, scoped to an event.
 * Kept in localStorage so a phone that reloads keeps its vote.
 */
export function participantToken(eventId: string): string {
  const key = `zoby-present:participant:${eventId}`;
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

export function pluralise(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/** Deterministic 0-1 value from a string, for jitter that does not reshuffle. */
export function hashUnit(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

export function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = n % 100;
  return `${n}${suffixes[(value - 20) % 10] ?? suffixes[value] ?? suffixes[0]}`;
}
