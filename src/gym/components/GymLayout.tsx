import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, CalendarDays, Dumbbell, MessageSquare, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/gym", label: "Today", icon: Dumbbell, end: true },
  { to: "/gym/plan", label: "Plan", icon: CalendarDays, end: false },
  { to: "/gym/coach", label: "Coach", icon: MessageSquare, end: false },
  { to: "/gym/history", label: "Progress", icon: BarChart3, end: false },
  { to: "/gym/settings", label: "Settings", icon: SettingsIcon, end: false },
];

export function BottomNav() {
  const location = useLocation();
  // The workout player owns the whole screen.
  if (location.pathname.startsWith("/gym/workout/")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} aria-hidden />
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

interface LayoutProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Remove the bottom padding reserved for the tab bar. */
  bare?: boolean;
}

export function GymLayout({ title, subtitle, action, children, bare }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
            {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      </header>
      <main className={cn("mx-auto max-w-lg px-4 pt-4", bare ? "pb-4" : "pb-28")}>{children}</main>
      {bare ? null : <BottomNav />}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
