import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { TrainingWebinar } from "@/types/webinar";
import {
  errorMessage,
  formatDuration,
  formatWebinarDate,
  formatWebinarTime,
  getStoredAttendee,
  isJoinable,
  markSignedUp,
} from "@/lib/webinar-utils";
import { AddToCalendarMenu } from "./AddToCalendarMenu";
import { CalendarDays, CheckCircle2, Clock, GraduationCap, Video } from "lucide-react";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name"),
  email: z.string().trim().email("Please enter a valid email address"),
});

type SignupValues = z.infer<typeof signupSchema>;

interface WebinarPopupProps {
  webinar: TrainingWebinar;
  open: boolean;
  signedUp: boolean;
  onOpenChange: (open: boolean) => void;
  onSignedUp: () => void;
}

export function WebinarPopup({ webinar, open, signedUp, onOpenChange, onSignedUp }: WebinarPopupProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const stored = getStoredAttendee();

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: stored?.name ?? "", email: stored?.email ?? "" },
  });

  useEffect(() => {
    if (open) {
      const attendee = getStoredAttendee();
      form.reset({ name: attendee?.name ?? "", email: attendee?.email ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, webinar.id]);

  const onSubmit = async (values: SignupValues) => {
    setSubmitting(true);
    try {
      await apiClient.signUpForWebinar(webinar.id, values.name, values.email);
      markSignedUp(webinar.id, { name: values.name.trim(), email: values.email.trim().toLowerCase() });
      onSignedUp();
      toast({
        title: "You're signed up!",
        description: "Add the session to your calendar so you don't miss it.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign-up failed",
        description: errorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const joinable = isJoinable(webinar);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">{webinar.title}</DialogTitle>
          <DialogDescription>Free training session on Google Meet</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 text-sm rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span>{formatWebinarDate(webinar.starts_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>
                {formatWebinarTime(webinar.starts_at)} &middot; {formatDuration(webinar.duration_minutes)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              <span>Google Meet (link shared once you sign up)</span>
            </div>
          </div>

          {webinar.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{webinar.description}</p>
          )}

          {signedUp ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">You're signed up for this session.</p>
                  <p className="text-muted-foreground mt-1">
                    Add it to your calendar below. The Google Meet link is included in the invite.
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <AddToCalendarMenu webinar={webinar} variant="outline" size="default" />
                <Button asChild>
                  <a href={webinar.meet_link} target="_blank" rel="noopener noreferrer">
                    <Video className="w-4 h-4 mr-2" />
                    {joinable ? "Join now" : "Open Meet link"}
                  </a>
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Smith" autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="jane@example.com" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                    Maybe later
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Signing up..." : "Sign me up"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
