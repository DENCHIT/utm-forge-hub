import { TrainingWebinar } from "@/types/webinar";

const APP_NAME = "UTM Link Creator";

export function getWebinarEnd(webinar: TrainingWebinar): Date {
  return new Date(new Date(webinar.starts_at).getTime() + webinar.duration_minutes * 60_000);
}

/** True while the session has not yet finished. */
export function isUpcoming(webinar: TrainingWebinar, now: Date = new Date()): boolean {
  return getWebinarEnd(webinar).getTime() > now.getTime();
}

/** True from 15 minutes before the start until the session ends. */
export function isJoinable(webinar: TrainingWebinar, now: Date = new Date()): boolean {
  const start = new Date(webinar.starts_at).getTime() - 15 * 60_000;
  return now.getTime() >= start && now.getTime() < getWebinarEnd(webinar).getTime();
}

export function formatWebinarDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatWebinarTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatWebinarWhen(webinar: TrainingWebinar): string {
  return `${formatWebinarDate(webinar.starts_at)} at ${formatWebinarTime(webinar.starts_at)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (minutes > 60) {
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  }
  return `${minutes} min`;
}

/** Converts an ISO timestamp to a value usable by an <input type="datetime-local">. */
export function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Converts a datetime-local value (interpreted in the browser's timezone) to ISO. */
export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

function toCalendarUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildDescription(webinar: TrainingWebinar): string {
  const parts = [];
  if (webinar.description) parts.push(webinar.description);
  parts.push(`Join on Google Meet: ${webinar.meet_link}`);
  return parts.join("\n\n");
}

export function buildGoogleCalendarUrl(webinar: TrainingWebinar): string {
  const start = new Date(webinar.starts_at);
  const end = getWebinarEnd(webinar);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: webinar.title,
    dates: `${toCalendarUtc(start)}/${toCalendarUtc(end)}`,
    details: buildDescription(webinar),
    location: webinar.meet_link,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(webinar: TrainingWebinar): string {
  const start = new Date(webinar.starts_at);
  const end = getWebinarEnd(webinar);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: webinar.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: buildDescription(webinar),
    location: webinar.meet_link,
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds long lines to the 75 octet limit required by RFC 5545. */
function foldIcsLine(line: string): string {
  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > 73) {
    chunks.push(remaining.slice(0, 73));
    remaining = " " + remaining.slice(73);
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

export function buildIcs(webinar: TrainingWebinar): string {
  const start = new Date(webinar.starts_at);
  const end = getWebinarEnd(webinar);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${APP_NAME}//Training Webinar//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:webinar-${webinar.id}@utm-link-creator`,
    `DTSTAMP:${toCalendarUtc(new Date())}`,
    `DTSTART:${toCalendarUtc(start)}`,
    `DTEND:${toCalendarUtc(end)}`,
    `SUMMARY:${escapeIcsText(webinar.title)}`,
    `DESCRIPTION:${escapeIcsText(buildDescription(webinar))}`,
    `LOCATION:${escapeIcsText(webinar.meet_link)}`,
    `URL:${webinar.meet_link}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(webinar.title)} starts in 15 minutes`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

export function downloadIcs(webinar: TrainingWebinar): void {
  const blob = new Blob([buildIcs(webinar)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = webinar.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "webinar";
  a.href = url;
  a.download = `${safeTitle}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}

export function isValidMeetLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isGoogleMeetLink(value: string): boolean {
  try {
    return new URL(value).hostname === "meet.google.com";
  } catch {
    return false;
  }
}

// Per-browser state so the pop-up shows once per webinar and the banner
// remembers who has signed up.
const DISMISSED_KEY = (id: string) => `webinar-dismissed-${id}`;
const SIGNED_UP_KEY = (id: string) => `webinar-signed-up-${id}`;
const ATTENDEE_KEY = "webinar-attendee";

export interface StoredAttendee {
  name: string;
  email: string;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode etc.). The feature still works.
  }
}

export function wasPopupDismissed(webinarId: string): boolean {
  return safeGet(DISMISSED_KEY(webinarId)) === "true";
}

export function markPopupDismissed(webinarId: string): void {
  safeSet(DISMISSED_KEY(webinarId), "true");
}

export function hasSignedUp(webinarId: string): boolean {
  return safeGet(SIGNED_UP_KEY(webinarId)) === "true";
}

export function markSignedUp(webinarId: string, attendee: StoredAttendee): void {
  safeSet(SIGNED_UP_KEY(webinarId), "true");
  safeSet(ATTENDEE_KEY, JSON.stringify(attendee));
}

export function getStoredAttendee(): StoredAttendee | null {
  const raw = safeGet(ATTENDEE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.name === "string" && typeof parsed.email === "string") {
      return parsed;
    }
  } catch {
    // Ignore corrupt data.
  }
  return null;
}
