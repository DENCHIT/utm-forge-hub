import { Button } from "@/components/ui/button";
import { TrainingWebinar } from "@/types/webinar";
import { formatWebinarWhen, isJoinable } from "@/lib/webinar-utils";
import { AddToCalendarMenu } from "./AddToCalendarMenu";
import { CheckCircle2, GraduationCap, Video, X } from "lucide-react";

interface WebinarBannerProps {
  webinar: TrainingWebinar;
  signedUp: boolean;
  onSignUp: () => void;
  onDismiss: () => void;
}

export function WebinarBanner({ webinar, signedUp, onSignUp, onDismiss }: WebinarBannerProps) {
  const joinable = isJoinable(webinar);

  return (
    <div className="w-full bg-primary text-primary-foreground" role="region" aria-label="Training webinar announcement">
      <div className="container mx-auto px-6 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <GraduationCap className="w-5 h-5 flex-shrink-0" />
          <div className="min-w-0 text-sm leading-tight">
            <span className="font-semibold">
              {joinable ? "Live now: " : "Training webinar: "}
              {webinar.title}
            </span>
            <span className="opacity-90"> &middot; {formatWebinarWhen(webinar)}</span>
            {signedUp && (
              <span className="inline-flex items-center gap-1 ml-2 text-xs opacity-90">
                <CheckCircle2 className="w-3.5 h-3.5" />
                You're signed up
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {signedUp ? (
            <>
              <AddToCalendarMenu
                webinar={webinar}
                variant="secondary"
                size="sm"
                className="h-8"
              />
              <Button asChild size="sm" variant="secondary" className="h-8">
                <a href={webinar.meet_link} target="_blank" rel="noopener noreferrer">
                  <Video className="w-4 h-4 mr-2" />
                  {joinable ? "Join now" : "Meet link"}
                </a>
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" className="h-8" onClick={onSignUp}>
              Sign up
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={onDismiss}
            aria-label="Hide announcement"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
