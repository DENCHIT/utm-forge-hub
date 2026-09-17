import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Loader2, RotateCcw, Send, Sparkles, User, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GymLayout } from "../components/GymLayout";
import { PRESETS } from "../data/equipment";
import { buildSpecFromDraft, coachRespond, OPENING_MESSAGE, OPENING_SUGGESTIONS } from "../coach/localCoach";
import { askCoach, CoachError, hasApiKey } from "../coach/llmCoach";
import { chooseSplit, generateProgram, GOAL_LABEL, SPLIT_LABEL } from "../engine/programGenerator";
import { useGym } from "../store/gymStore";
import type { ChatMessage, ProgramSpec } from "../types";

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {message.content}
      </div>
      {isUser ? (
        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

export default function Coach() {
  const navigate = useNavigate();
  const gym = useGym();
  const { state, addChatMessage, setCoachDraft, clearChat, installProgram, setAvailableEquipment } = gym;

  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [proposal, setProposal] = React.useState<ProgramSpec | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const usingClaude = hasApiKey(state.settings.anthropicApiKey);

  const messages = state.chat;

  React.useEffect(() => {
    if (!messages.length) {
      addChatMessage({ role: "assistant", content: OPENING_MESSAGE, suggestions: OPENING_SUGGESTIONS });
    }
    // Only ever seeds the very first message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy, proposal]);

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setProposal(null);
    const userMessage = addChatMessage({ role: "user", content: trimmed });
    setBusy(true);

    const history = [...messages, userMessage];

    try {
      if (usingClaude) {
        const result = await askCoach({
          apiKey: state.settings.anthropicApiKey,
          history,
          available: state.settings.availableEquipment,
          program: state.program,
          draft: state.coachDraft,
        });
        setCoachDraft(result.draft);
        if (result.equipmentPreset) {
          const preset = PRESETS.find((entry) => entry.id === result.equipmentPreset);
          if (preset) setAvailableEquipment(preset.equipment);
        }
        addChatMessage({ role: "assistant", content: result.reply, suggestions: result.suggestions });
        if (result.readyToBuild) setProposal(buildSpecFromDraft({ ...state.coachDraft, ...result.draft }));
      } else {
        const result = coachRespond(trimmed, state.coachDraft);
        setCoachDraft(result.draft);
        if (result.equipment) setAvailableEquipment(result.equipment);
        addChatMessage({ role: "assistant", content: result.reply, suggestions: result.suggestions });
        if (result.readyToBuild) setProposal(buildSpecFromDraft(result.draft));
      }
    } catch (error) {
      const message = error instanceof CoachError ? error.message : "Something went wrong talking to the coach.";
      toast.error(message);
      // Fall back to the offline coach so the conversation never dead ends.
      const result = coachRespond(trimmed, state.coachDraft);
      setCoachDraft(result.draft);
      addChatMessage({ role: "assistant", content: result.reply, suggestions: result.suggestions });
      if (result.readyToBuild) setProposal(buildSpecFromDraft(result.draft));
    } finally {
      setBusy(false);
    }
  };

  const build = () => {
    if (!proposal) return;
    const program = generateProgram(proposal, {
      available: state.settings.availableEquipment,
      excludedExerciseIds: state.settings.excludedExerciseIds,
      seed: Math.floor(Math.random() * 1e9),
    });
    installProgram(program);
    addChatMessage({
      role: "assistant",
      content: `Done. ${program.summary} Have a look at the plan, and if anything does not suit, tell me and I will change it.`,
      programId: program.id,
    });
    setProposal(null);
    toast.success("Programme ready");
    navigate("/gym/plan");
  };

  const preview = proposal ? chooseSplit(proposal.daysPerWeek, proposal.goal) : null;

  return (
    <GymLayout
      title="Coach"
      subtitle={usingClaude ? "Powered by Claude" : "Built-in coach"}
      action={
        messages.length > 1 ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label="Start over"
            onClick={() => {
              clearChat();
              setProposal(null);
            }}
          >
            <RotateCcw className="h-5 w-5" aria-hidden />
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3 pb-44">
        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}

        {busy ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Thinking it through
          </div>
        ) : null}

        {proposal ? (
          <Card className="border-primary/50">
            <CardContent className="space-y-3 p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                Your programme
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{GOAL_LABEL[proposal.goal]}</Badge>
                <Badge variant="secondary">{proposal.daysPerWeek} days a week</Badge>
                <Badge variant="secondary">{proposal.sessionMinutes} min sessions</Badge>
                <Badge variant="secondary">{proposal.weeks} weeks</Badge>
                {preview ? <Badge variant="secondary">{SPLIT_LABEL[preview.split]}</Badge> : null}
                {proposal.avoidJoints.map((joint) => (
                  <Badge key={joint} variant="outline">
                    working around {joint.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
              <Button className="h-12 w-full gap-2 text-base" onClick={build}>
                <Wand2 className="h-5 w-5" aria-hidden />
                {state.program ? "Rebuild my programme" : "Build my programme"}
              </Button>
              {state.program ? (
                <p className="text-xs text-muted-foreground">
                  Your completed sessions stay in your history. Only the upcoming ones get replaced.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="fixed inset-x-0 bottom-[56px] z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-lg px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {lastAssistant?.suggestions?.length && !busy ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {lastAssistant.suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  onClick={() => void send(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Tell the coach what you need"
              rows={1}
              className="max-h-28 min-h-[44px] resize-none py-3"
            />
            <Button
              size="icon"
              className="h-11 w-11 shrink-0"
              disabled={busy || !input.trim()}
              onClick={() => void send(input)}
              aria-label="Send"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
            </Button>
          </div>
        </div>
      </div>
    </GymLayout>
  );
}
