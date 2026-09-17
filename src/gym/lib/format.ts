import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import type { Units } from "../types";

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function formatLongDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function friendlyDate(iso: string): string {
  const date = parseISO(iso);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE d MMM");
}

export function shortDate(iso: string): string {
  return format(parseISO(iso), "d MMM");
}

export function formatWeight(value: number | null | undefined, units: Units): string {
  if (value == null) return "-";
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}${units}`;
}

export function formatVolume(value: number, units: Units): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k ${units}`;
  return `${Math.round(value)} ${units}`;
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
