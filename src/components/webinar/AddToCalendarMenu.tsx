import { Button, ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrainingWebinar } from "@/types/webinar";
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl, downloadIcs } from "@/lib/webinar-utils";
import { CalendarPlus, ChevronDown } from "lucide-react";

interface AddToCalendarMenuProps extends Pick<ButtonProps, "variant" | "size" | "className"> {
  webinar: TrainingWebinar;
}

export function AddToCalendarMenu({ webinar, variant = "outline", size = "sm", className }: AddToCalendarMenuProps) {
  const openInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <CalendarPlus className="w-4 h-4 mr-2" />
          Add to calendar
          <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openInNewTab(buildGoogleCalendarUrl(webinar))}>
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openInNewTab(buildOutlookCalendarUrl(webinar))}>
          Outlook.com
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadIcs(webinar)}>
          Apple, Outlook desktop or other (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
