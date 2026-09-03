import { useInteraction } from "@/hooks/useInteraction";
import { publicAppUrl } from "@/lib/supabase";
import {
  BulletsSlide,
  ChartSlide,
  EmbedSlide,
  ImageSlide,
  QuoteSlide,
  TableSlide,
  TextSlide,
  TitleSlide,
  VideoSlide,
} from "./StaticSlides";
import { CollectStage } from "./CollectStage";
import { ClusterStage } from "./ClusterStage";
import { VoteStage } from "./VoteStage";
import { ResultsStage } from "./ResultsStage";
import type {
  BulletsContent,
  ChartContent,
  ClusterContent,
  CollectContent,
  EmbedContent,
  EventRecord,
  ImageContent,
  QuoteContent,
  ResultsContent,
  Slide,
  TableContent,
  TextContent,
  TitleContent,
  VideoContent,
  VoteContent,
} from "@/lib/types";

interface SlideRendererProps {
  slide: Slide;
  event: EventRecord | null;
  /** False while the slide is pre-rendered off-screen (video, iframes). */
  active?: boolean;
  /** Bullet reveal position, driven by the presenter's arrow keys. */
  revealed?: number;
}

export function SlideRenderer({ slide, event, active = true, revealed }: SlideRendererProps) {
  switch (slide.type) {
    case "title":
      return <TitleSlide content={slide.content as TitleContent} />;
    case "text":
      return <TextSlide content={slide.content as TextContent} />;
    case "bullets":
      return <BulletsSlide content={slide.content as BulletsContent} revealed={revealed} />;
    case "quote":
      return <QuoteSlide content={slide.content as QuoteContent} />;
    case "table":
      return <TableSlide content={slide.content as TableContent} />;
    case "chart":
      return <ChartSlide content={slide.content as ChartContent} />;
    case "image":
      return <ImageSlide content={slide.content as ImageContent} />;
    case "video":
      return <VideoSlide content={slide.content as VideoContent} active={active} />;
    case "embed":
      return <EmbedSlide content={slide.content as EmbedContent} active={active} />;
    case "collect":
    case "cluster":
    case "vote":
    case "results":
      return <InteractiveSlide slide={slide} event={event} />;
    default:
      return (
        <div className="flex h-full items-center justify-center text-muted">
          Unknown slide type: {slide.type}
        </div>
      );
  }
}

/**
 * Interactive slides all read one interaction, keyed by the collect slide's id.
 * A collect slide is its own source; the rest name theirs in `sourceSlideId`.
 */
function InteractiveSlide({ slide, event }: { slide: Slide; event: EventRecord | null }) {
  const content = slide.content as Record<string, unknown>;
  const sourceSlideId =
    slide.type === "collect" ? slide.id : ((content.sourceSlideId as string) ?? slide.id);

  const { submissions, clusters, tally, totalVotes } = useInteraction(sourceSlideId);
  const joinUrl = event ? `${publicAppUrl()}/join/${event.join_code}` : publicAppUrl();
  const joinCode = event?.join_code ?? "------";

  switch (slide.type) {
    case "collect":
      return (
        <CollectStage
          content={slide.content as CollectContent}
          submissions={submissions}
          joinUrl={joinUrl}
          joinCode={joinCode}
        />
      );
    case "cluster":
      return (
        <ClusterStage
          heading={(slide.content as ClusterContent).heading}
          // A cluster slide sitting at `idle` has not been run yet; show the
          // thinking pool rather than an empty grid.
          phase={slide.phase === "idle" ? "clustering" : slide.phase}
          submissions={submissions}
          clusters={clusters}
        />
      );
    case "vote": {
      const voteContent = slide.content as VoteContent;
      return (
        <VoteStage
          heading={voteContent.heading}
          question={voteContent.question}
          clusters={clusters}
          tally={tally}
          totalVotes={totalVotes}
          joinUrl={joinUrl}
          joinCode={joinCode}
          blind={slide.phase !== "results"}
        />
      );
    }
    case "results":
      return (
        <ResultsStage
          heading={(slide.content as ResultsContent).heading}
          clusters={clusters}
          tally={tally}
          totalVotes={totalVotes}
        />
      );
    default:
      return null;
  }
}
