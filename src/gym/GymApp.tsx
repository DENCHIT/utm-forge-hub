import * as React from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { GymProvider, useGym } from "./store/gymStore";
import { AuthProvider, useAuth } from "./store/auth";
import { SyncConflictDialog } from "./components/SyncConflictDialog";
import Today from "./pages/Today";
import Workout from "./pages/Workout";
import Auth from "./pages/Auth";

// Split the screens you do not open mid-set out of the first load.
const Coach = React.lazy(() => import("./pages/Coach"));
const Plan = React.lazy(() => import("./pages/Plan"));
const History = React.lazy(() => import("./pages/History"));
const GymSettings = React.lazy(() => import("./pages/GymSettings"));
const Exercises = React.lazy(() => import("./pages/Exercises"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));

const PageFallback = () => (
  <div className="flex min-h-[60dvh] items-center justify-center text-sm text-muted-foreground">Loading...</div>
);

/**
 * Sends people to the sign-in screen unless they have an account or have
 * explicitly chosen to keep everything on this device.
 */
function RequireAccess() {
  const { status, configured, localOnly } = useAuth();

  if (configured && status === "loading") {
    return <div className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground">One moment...</div>;
  }
  if (configured && status === "signed_out" && !localOnly) {
    return <Navigate to="/gym/auth" replace />;
  }
  return <Outlet />;
}

/**
 * Makes the gym installable to the home screen without turning the rest of the
 * site into a PWA: the tags only exist while these routes are mounted.
 */
function InstallMeta() {
  React.useEffect(() => {
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "/gym.webmanifest";

    const theme = document.createElement("meta");
    theme.name = "theme-color";
    theme.content = "#0a0d16";

    const capable = document.createElement("meta");
    capable.name = "apple-mobile-web-app-capable";
    capable.content = "yes";

    const statusBar = document.createElement("meta");
    statusBar.name = "apple-mobile-web-app-status-bar-style";
    statusBar.content = "default";

    const title = document.title;
    document.title = "Gym";
    const nodes = [manifest, theme, capable, statusBar];
    nodes.forEach((node) => document.head.appendChild(node));

    return () => {
      nodes.forEach((node) => node.remove());
      document.title = title;
    };
  }, []);

  return null;
}

/** Every screen change starts at the top, the way a native app behaves. */
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

/** Applies the theme preference while the gym is on screen. */
function ThemeSync() {
  const { state } = useGym();
  const theme = state.settings.theme;

  React.useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      // Dark is the default here; "system" only goes light if the device asks.
      const light = theme === "light" || (theme === "system" && media.matches);
      root.classList.add("gym-neon");
      root.classList.toggle("gym-light", light);
      root.classList.toggle("dark", !light);
    };
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      root.classList.remove("gym-neon", "gym-light", "dark");
    };
  }, [theme]);

  return null;
}

export default function GymApp() {
  return (
    <AuthProvider>
      <GymProvider>
        <ThemeSync />
        <ScrollToTop />
        <InstallMeta />
        <SyncConflictDialog />
        <React.Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="auth" element={<Auth />} />
            <Route element={<RequireAccess />}>
              <Route index element={<Today />} />
              <Route path="coach" element={<Coach />} />
              <Route path="plan" element={<Plan />} />
              <Route path="history" element={<History />} />
              <Route path="settings" element={<GymSettings />} />
              <Route path="exercises" element={<Exercises />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="workout/:sessionId" element={<Workout />} />
              <Route path="*" element={<Navigate to="/gym" replace />} />
            </Route>
          </Routes>
        </React.Suspense>
      </GymProvider>
    </AuthProvider>
  );
}
