import type { SlideContent, SlideType } from "./types";

/**
 * What a freshly added slide starts as. These double as the worked example of
 * each content shape, so keep them filled in rather than blank.
 */
export const SLIDE_TEMPLATES: Record<SlideType, SlideContent> = {
  title: {
    eyebrow: "ZOBY",
    heading: "Your headline goes here",
    subheading: "A line of context underneath",
  },
  text: {
    heading: "A point worth a whole slide",
    body: "Say the thing.\n\nA blank line starts a new paragraph.",
  },
  bullets: {
    heading: "Three things",
    items: ["The first thing", "The second thing", "The third thing"],
    reveal: true,
  },
  quote: {
    quote: "Something someone said that lands harder than a bullet point.",
    attribution: "Who said it",
  },
  table: {
    heading: "What the study found",
    columns: ["Segment", "Before", "After", "Change"],
    rows: [
      ["Segment A", 42, 61, "+19pts"],
      ["Segment B", 30, 52, "+22pts"],
    ],
    highlightColumn: 3,
  },
  chart: {
    heading: "The result",
    variant: "bar",
    categoryKey: "label",
    series: [{ name: "Before" }, { name: "After" }],
    rows: [
      { label: "Segment A", Before: 42, After: 61 },
      { label: "Segment B", Before: 30, After: 52 },
    ],
    valueSuffix: "%",
    caption: "n = 500, fielded 2026.",
  },
  image: {
    heading: "",
    media: { url: "https://placehold.co/1600x900/png", alt: "Describe the image" },
    fit: "contain",
  },
  video: {
    url: "https://example.com/clip.mp4",
    autoplay: true,
    muted: false,
  },
  embed: {
    url: "https://example.com",
  },
  collect: {
    heading: "What is getting in your way?",
    prompt: "Tell us the single biggest problem you are facing right now.",
    placeholder: "Type your problem…",
    // Steers the AI grouping. Be specific about what you want surfaced.
    clustering_context:
      "We want operational problems the audience faces in their day-to-day work, " +
      "not industry-level commentary.",
    audience_context: "Marketing and growth leaders at mid-size B2B companies.",
    finalistCount: 3,
  },
  cluster: {
    heading: "Here is what you all said",
    // Set this to the id of the collect slide these submissions came from.
    sourceSlideId: "",
  },
  vote: {
    heading: "Which one do we solve?",
    question: "One vote each. You can change it until we close.",
    sourceSlideId: "",
  },
  results: {
    heading: "The room has decided",
    sourceSlideId: "",
  },
};
