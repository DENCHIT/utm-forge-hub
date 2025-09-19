import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatEventTemplate } from "@/lib/utm-utils";
import { Calendar, MapPin, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (template: string) => void;
}

export function EventTemplateModal({ isOpen, onClose, onSubmit }: EventTemplateModalProps) {
  const [eventName, setEventName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<Date>();

  const previewTemplate = () => {
    if (!eventName || !location || !date) return "";
    return formatEventTemplate(eventName, location, date.toISOString());
  };

  const handleSubmit = () => {
    const template = previewTemplate();
    if (template) {
      onSubmit(template);
      // Reset form
      setEventName("");
      setLocation("");
      setDate(undefined);
    }
  };

  const handleClose = () => {
    setEventName("");
    setLocation("");
    setDate(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Campaign Name Helper
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-name" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Event Name
            </Label>
            <Input
              id="event-name"
              placeholder="e.g., Housing Fair"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </Label>
            <Input
              id="location"
              placeholder="e.g., London"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {previewTemplate() && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Label className="text-sm font-medium text-primary">Preview:</Label>
              <p className="font-mono text-sm mt-1">{previewTemplate()}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={!previewTemplate()}
              className="flex-1"
            >
              Use Template
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}