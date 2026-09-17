import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Loader2, Mail, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "../store/auth";

type Mode = "signin" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, sendReset, continueLocally, status } = useAuth();

  const [mode, setMode] = React.useState<Mode>("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === "signed_in") navigate("/gym", { replace: true });
  }, [status, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast.success("Welcome back");
        navigate("/gym", { replace: true });
      } else {
        const { needsConfirmation } = await signUp(email, password, displayName);
        if (needsConfirmation) {
          setSentTo(email.trim());
        } else {
          toast.success("Account created");
          navigate("/gym/profile", { replace: true });
        }
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="space-y-3 p-6 text-center">
            <Mail className="mx-auto h-8 w-8 text-primary" aria-hidden />
            <h1 className="text-xl font-bold">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to {sentTo}. Open it, then come back and sign in.
            </p>
            <Button variant="outline" className="h-11 w-full" onClick={() => { setSentTo(null); setMode("signin"); }}>
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero shadow-glow">
            <Dumbbell className="h-7 w-7 text-white" aria-hidden />
          </span>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">Your</span> <span className="text-accent">gym</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in and your programme, sessions and numbers follow you to any device.
          </p>
        </div>

        <Card>
          <CardContent className="p-4">
            <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <form onSubmit={submit} className="mt-4 space-y-3">
                <TabsContent value="signup" className="m-0 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="First name"
                      autoComplete="given-name"
                      className="h-12"
                    />
                  </div>
                </TabsContent>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    className="h-12"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === "signup" ? "At least six characters" : "Your password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="h-12"
                  />
                </div>

                <Button type="submit" className="h-12 w-full gap-2 text-base" disabled={busy}>
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              {mode === "signin" ? (
                <Button
                  variant="link"
                  className="mt-1 h-8 w-full text-xs text-muted-foreground"
                  onClick={async () => {
                    if (!email.trim()) {
                      toast("Type your email address first");
                      return;
                    }
                    try {
                      await sendReset(email);
                      toast.success("Password reset sent", { description: `Check ${email.trim()}.` });
                    } catch (error) {
                      toast.error((error as Error).message);
                    }
                  }}
                >
                  Forgotten your password?
                </Button>
              ) : null}
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-2 text-center">
          <Button
            variant="outline"
            className="h-11 w-full gap-2"
            onClick={() => {
              continueLocally();
              navigate("/gym", { replace: true });
            }}
          >
            <MonitorSmartphone className="h-4 w-4" aria-hidden />
            Use it on this device only
          </Button>
          <p className="text-xs text-muted-foreground">
            No account means no backup. Clear your browser data and the training goes with it. You can sign up later and
            everything on this device moves across.
          </p>
        </div>
      </div>
    </div>
  );
}
