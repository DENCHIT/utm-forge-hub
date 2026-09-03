export type SlideType =
  | "title"
  | "text"
  | "bullets"
  | "quote"
  | "table"
  | "chart"
  | "image"
  | "video"
  | "embed"
  | "collect"
  | "cluster"
  | "vote"
  | "results";

export type SlidePhase =
  | "idle"
  | "collecting"
  | "clustering"
  | "shortlist"
  | "voting"
  | "results";

export interface Org {
  id: string;
  name: string;
  slug: string;
  brand: Partial<ThemeTokens>;
}

export interface EventRecord {
  id: string;
  org_id: string;
  name: string;
  join_code: string;
  is_live: boolean;
  theme: Partial<ThemeTokens>;
  starts_at: string | null;
}

export interface SessionRecord {
  id: string;
  event_id: string;
  title: string;
  subtitle: string | null;
  position: number;
  status: "draft" | "live" | "complete";
  current_slide_id: string | null;
  /** Slot length, driving the stage clock's colour. */
  target_minutes: number | null;
}

/** One person who asked to hear back when their problem gets covered. */
export interface Contact {
  id: string;
  event_id: string;
  participant_id: string | null;
  email: string;
  consent_at: string;
  notified_at: string | null;
}

/** A row of the staff-only follow-up view. */
export interface SubmissionExportRow {
  event_id: string;
  session_id: string;
  session_title: string;
  slide_id: string;
  submission_id: string;
  body: string;
  source: SubmissionSource;
  source_label: string | null;
  created_at: string;
  cluster_id: string | null;
  cluster_label: string | null;
  is_finalist: boolean | null;
  cluster_rank: number | null;
  upvotes: number;
  email: string | null;
  notified_at: string | null;
}

export interface Slide {
  id: string;
  session_id: string;
  position: number;
  type: SlideType;
  content: SlideContent;
  notes: string | null;
  phase: SlidePhase;
}

export type SubmissionSource = "audience" | "seed" | "presenter";

/**
 * `pending` never reaches the stage. `flagged` was blocked by the screener and
 * is waiting for a human to overrule. `hidden` was pulled by one.
 */
export type SubmissionStatus = "pending" | "approved" | "flagged" | "hidden";

export interface Submission {
  id: string;
  slide_id: string;
  participant_id: string | null;
  body: string;
  cluster_id: string | null;
  created_at: string;
  /** Where it came from. Anything but `audience` is labelled on the stage. */
  source: SubmissionSource;
  source_label: string | null;
  status: SubmissionStatus;
  moderation_reason: string | null;
}

/** An upvote on somebody else's submission. */
export interface SubmissionVote {
  id: string;
  submission_id: string;
  participant_id: string;
  slide_id: string;
}

export interface Cluster {
  id: string;
  slide_id: string;
  label: string;
  summary: string | null;
  rank: number | null;
  is_finalist: boolean;
  accent: string | null;
}

export interface Vote {
  id: string;
  slide_id: string;
  cluster_id: string;
  participant_id: string;
}

// --- slide content -------------------------------------------------------
// One shape per slide type. `content` is stored as jsonb, so a new slide type
// needs a renderer and an entry here, never a migration.

export interface TitleContent {
  heading: string;
  subheading?: string;
  eyebrow?: string;
  background?: MediaRef;
}

export interface TextContent {
  heading?: string;
  body: string;
  align?: "left" | "centre";
}

export interface BulletsContent {
  heading?: string;
  items: string[];
  /** Reveal one bullet per arrow press instead of all at once. */
  reveal?: boolean;
}

export interface QuoteContent {
  quote: string;
  attribution?: string;
}

export interface TableContent {
  heading?: string;
  columns: string[];
  rows: (string | number)[][];
  /** Column index to emphasise, e.g. the result column of a study. */
  highlightColumn?: number;
}

export interface ChartSeries {
  name: string;
  colour?: string;
}

export interface ChartContent {
  heading?: string;
  variant: "bar" | "line" | "area" | "pie";
  /** Key in each row used for the category axis. */
  categoryKey: string;
  series: ChartSeries[];
  rows: Record<string, string | number>[];
  valueSuffix?: string;
  caption?: string;
}

export interface MediaRef {
  url: string;
  alt?: string;
}

export interface ImageContent {
  heading?: string;
  media: MediaRef;
  /** `contain` keeps charts and screenshots whole; `cover` fills the stage. */
  fit?: "cover" | "contain";
  caption?: string;
}

export interface VideoContent {
  heading?: string;
  url: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
}

export interface EmbedContent {
  heading?: string;
  url: string;
}

export interface CollectContent {
  heading?: string;
  prompt: string;
  placeholder?: string;
  /** Steer given to the model when grouping. */
  clustering_context?: string;
  audience_context?: string;
  /** How many groups go through to the vote. */
  finalistCount?: number;
  /**
   * Shown under the prompt on the phone as worked examples. Gives people who
   * arrived without a problem in mind something to react to.
   */
  examples?: string[];
  /** Let the audience upvote each other's problems. On by default. */
  allowUpvotes?: boolean;
  /**
   * Exactly what someone agrees to when they leave an address. Shown as the
   * label on the field and stored verbatim on the contact row, so you can
   * evidence the consent later. Keep it specific and honest.
   */
  notifyConsentText?: string;
  /**
   * How submissions get onto the wall.
   *
   * `ai` (the default) screens each one and holds anything it objects to.
   * `manual` holds everything for you to release by hand. `off` puts them
   * straight up — only for a trusted room, or when the network is down and an
   * empty wall is the worse outcome.
   */
  moderation?: "ai" | "manual" | "off";
}

export interface ClusterContent {
  heading?: string;
  /** The collect slide whose submissions this visualises. */
  sourceSlideId: string;
}

export interface VoteContent {
  heading?: string;
  question?: string;
  sourceSlideId: string;
  /** Countdown shown on stage once voting opens. Omit for no timer. */
  countdownSeconds?: number;
}

export interface ResultsContent {
  heading?: string;
  sourceSlideId: string;
  /** Vote slide, when the votes live on a different slide to the clusters. */
  voteSlideId?: string;
}

export type SlideContent =
  | TitleContent
  | TextContent
  | BulletsContent
  | QuoteContent
  | TableContent
  | ChartContent
  | ImageContent
  | VideoContent
  | EmbedContent
  | CollectContent
  | ClusterContent
  | VoteContent
  | ResultsContent
  | Record<string, unknown>;

export interface ThemeTokens {
  ink: string;
  canvas: string;
  surface: string;
  muted: string;
  line: string;
  brand: string;
  accent: string;
  positive: string;
  warning: string;
  fontDisplay: string;
  fontBody: string;
  radiusCard: string;
  logoUrl: string;
}
