import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { TrainingWebinar, WebinarSignup, WebinarWithSignupCount } from "@/types/webinar";
import {
  errorMessage,
  formatDuration,
  formatWebinarWhen,
  fromDateTimeLocalValue,
  isGoogleMeetLink,
  isUpcoming,
  isValidMeetLink,
  toDateTimeLocalValue,
} from "@/lib/webinar-utils";
import { AddToCalendarMenu } from "./AddToCalendarMenu";
import { Copy, Download, Edit, ExternalLink, GraduationCap, Plus, Trash2, Users, Video } from "lucide-react";

const webinarSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Keep the title under 120 characters"),
  description: z.string().trim().max(2000, "Keep the description under 2000 characters"),
  meet_link: z
    .string()
    .trim()
    .refine(isValidMeetLink, "Enter the full https:// link, for example https://meet.google.com/abc-defg-hij"),
  starts_at_local: z.string().min(1, "Date and time are required"),
  duration_minutes: z.coerce
    .number({ invalid_type_error: "Duration must be a number" })
    .int("Duration must be whole minutes")
    .min(5, "Duration must be at least 5 minutes")
    .max(600, "Duration must be 10 hours or less"),
  active: z.boolean(),
});

type WebinarFormValues = z.infer<typeof webinarSchema>;

const emptyValues: WebinarFormValues = {
  title: "",
  description: "",
  meet_link: "",
  starts_at_local: "",
  duration_minutes: 60,
  active: true,
};

function toFormValues(webinar: TrainingWebinar): WebinarFormValues {
  return {
    title: webinar.title,
    description: webinar.description ?? "",
    meet_link: webinar.meet_link,
    starts_at_local: toDateTimeLocalValue(webinar.starts_at),
    duration_minutes: webinar.duration_minutes,
    active: webinar.active,
  };
}

function statusFor(webinar: TrainingWebinar): { label: string; variant: "default" | "secondary" | "outline" } {
  if (!webinar.active) return { label: "Hidden", variant: "outline" };
  if (!isUpcoming(webinar)) return { label: "Finished", variant: "secondary" };
  return { label: "Advertised", variant: "default" };
}

export function WebinarAdmin() {
  const { toast } = useToast();
  const [webinars, setWebinars] = useState<WebinarWithSignupCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WebinarWithSignupCount | null>(null);
  const [deleting, setDeleting] = useState<WebinarWithSignupCount | null>(null);
  const [signupsFor, setSignupsFor] = useState<WebinarWithSignupCount | null>(null);
  const [signups, setSignups] = useState<WebinarSignup[]>([]);
  const [signupsLoading, setSignupsLoading] = useState(false);

  const form = useForm<WebinarFormValues>({
    resolver: zodResolver(webinarSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    loadWebinars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWebinars = async () => {
    try {
      setWebinars(await apiClient.getWebinars());
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.reset(emptyValues);
    setFormOpen(true);
  };

  const openEdit = (webinar: WebinarWithSignupCount) => {
    setEditing(webinar);
    form.reset(toFormValues(webinar));
    setFormOpen(true);
  };

  const onSubmit = async (values: WebinarFormValues) => {
    setSaving(true);
    const payload = {
      title: values.title,
      description: values.description,
      meet_link: values.meet_link,
      starts_at: fromDateTimeLocalValue(values.starts_at_local),
      duration_minutes: values.duration_minutes,
      active: values.active,
    };
    try {
      if (editing) {
        await apiClient.updateWebinar(editing.id, payload);
        toast({ title: "Webinar updated", description: `"${values.title}" has been saved.` });
      } else {
        await apiClient.addWebinar(payload);
        toast({
          title: "Webinar added",
          description: values.active
            ? "It is now advertised to users as a banner and pop-up."
            : "It is saved but hidden. Switch it on to advertise it.",
        });
      }
      setFormOpen(false);
      setEditing(null);
      await loadWebinars();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (webinar: WebinarWithSignupCount, active: boolean) => {
    try {
      await apiClient.updateWebinar(webinar.id, { active });
      setWebinars((items) => items.map((w) => (w.id === webinar.id ? { ...w, active } : w)));
      toast({
        title: active ? "Webinar advertised" : "Webinar hidden",
        description: active
          ? "Users will now see the banner and pop-up."
          : "Users will no longer see this webinar.",
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: errorMessage(error) });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await apiClient.deleteWebinar(deleting.id);
      setWebinars((items) => items.filter((w) => w.id !== deleting.id));
      toast({ title: "Webinar deleted", description: `"${deleting.title}" and its sign-ups were removed.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: errorMessage(error) });
    } finally {
      setDeleting(null);
    }
  };

  const openSignups = async (webinar: WebinarWithSignupCount) => {
    setSignupsFor(webinar);
    setSignups([]);
    setSignupsLoading(true);
    try {
      setSignups(await apiClient.getWebinarSignups(webinar.id));
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: errorMessage(error) });
    } finally {
      setSignupsLoading(false);
    }
  };

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText(signups.map((s) => s.email).join(", "));
      toast({ title: "Copied", description: `${signups.length} email address${signups.length === 1 ? "" : "es"} copied.` });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not copy to the clipboard." });
    }
  };

  const downloadSignupsCsv = () => {
    if (!signupsFor) return;
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ["Name", "Email", "Signed up"],
      ...signups.map((s) => [s.name, s.email, new Date(s.created_at).toLocaleString("en-GB")]),
    ];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${signupsFor.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-signups.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const meetLinkValue = form.watch("meet_link");
  const showMeetHint = meetLinkValue && isValidMeetLink(meetLinkValue) && !isGoogleMeetLink(meetLinkValue);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Training Webinars</h2>
          <p className="text-muted-foreground">
            Add a Google Meet session and it is advertised to every user as a banner across the top of the app
            and a sign-up pop-up. Users can add it straight to their calendar.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Add Webinar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse">Loading webinars...</div>
        </div>
      ) : webinars.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No webinars yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first training session to start advertising it to users.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>WEBINAR</TableHead>
              <TableHead>WHEN</TableHead>
              <TableHead>DURATION</TableHead>
              <TableHead>SIGN-UPS</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>ADVERTISE</TableHead>
              <TableHead className="text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webinars.map((webinar) => {
              const status = statusFor(webinar);
              return (
                <TableRow key={webinar.id}>
                  <TableCell>
                    <div className="font-medium">{webinar.title}</div>
                    <a
                      href={webinar.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary font-mono"
                    >
                      <Video className="w-3 h-3" />
                      {webinar.meet_link.replace(/^https?:\/\//, "")}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatWebinarWhen(webinar)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDuration(webinar.duration_minutes)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openSignups(webinar)}>
                      <Users className="w-4 h-4 mr-1" />
                      {webinar.signup_count}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={webinar.active}
                      onCheckedChange={(checked) => toggleActive(webinar, checked)}
                      aria-label={`Advertise ${webinar.title}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(webinar)} className="w-8 h-8 p-0" aria-label="Edit">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleting(webinar)}
                        className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Create / edit dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setFormOpen(open);
            if (!open) setEditing(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit webinar" : "Add training webinar"}</DialogTitle>
            <DialogDescription>
              Paste the Google Meet link and set when it starts. Times are entered in your local timezone and
              shown to each user in theirs.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Getting started with UTM links" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="What will be covered and who it is for" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meet_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Meet link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://meet.google.com/abc-defg-hij" className="font-mono text-sm" {...field} />
                    </FormControl>
                    {showMeetHint && (
                      <FormDescription>
                        This is not a meet.google.com link. It will still be used as the join link.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="starts_at_local"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starts</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min={5} max={600} step={5} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 space-y-0 rounded-lg border p-4">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm font-medium">Advertise to users</FormLabel>
                      <FormDescription>Show the banner and pop-up as soon as it is saved.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editing ? "Save changes" : "Add webinar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Sign-ups dialog */}
      <Dialog open={signupsFor !== null} onOpenChange={(open) => !open && setSignupsFor(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Sign-ups</DialogTitle>
            <DialogDescription>
              {signupsFor ? `${signupsFor.title} · ${formatWebinarWhen(signupsFor)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {signupsLoading ? (
            <div className="py-6 text-center animate-pulse">Loading sign-ups...</div>
          ) : signups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nobody has signed up yet.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NAME</TableHead>
                    <TableHead>EMAIL</TableHead>
                    <TableHead>SIGNED UP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signups.map((signup) => (
                    <TableRow key={signup.id}>
                      <TableCell className="font-medium">{signup.name}</TableCell>
                      <TableCell className="font-mono text-sm">{signup.email}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(signup.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2 sm:justify-between">
            {signupsFor && <AddToCalendarMenu webinar={signupsFor} variant="ghost" size="sm" />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyEmails} disabled={signups.length === 0}>
                <Copy className="w-4 h-4 mr-2" />
                Copy emails
              </Button>
              <Button variant="outline" size="sm" onClick={downloadSignupsCsv} disabled={signups.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this webinar?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `"${deleting.title}" will be removed along with ${deleting.signup_count} sign-up${
                    deleting.signup_count === 1 ? "" : "s"
                  }. Users will no longer see it. This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
