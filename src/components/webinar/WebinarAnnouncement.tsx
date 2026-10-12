import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { TrainingWebinar } from "@/types/webinar";
import { hasSignedUp, isUpcoming, markPopupDismissed, wasPopupDismissed } from "@/lib/webinar-utils";
import { WebinarBanner } from "./WebinarBanner";
import { WebinarPopup } from "./WebinarPopup";

const BANNER_HIDDEN_KEY = (id: string) => `webinar-banner-hidden-${id}`;

function isBannerHidden(id: string): boolean {
  try {
    return sessionStorage.getItem(BANNER_HIDDEN_KEY(id)) === "true";
  } catch {
    return false;
  }
}

function hideBanner(id: string): void {
  try {
    sessionStorage.setItem(BANNER_HIDDEN_KEY(id), "true");
  } catch {
    // Storage unavailable. The banner will simply reappear on the next load.
  }
}

/**
 * Shows the next upcoming training webinar as a banner across the top of the
 * app and, the first time a browser sees it, as a sign-up pop-up.
 */
export function WebinarAnnouncement() {
  const [webinar, setWebinar] = useState<TrainingWebinar | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getUpcomingWebinars()
      .then((webinars) => {
        if (cancelled) return;
        const next = webinars[0] ?? null;
        setWebinar(next);
        if (next) {
          const alreadySignedUp = hasSignedUp(next.id);
          setSignedUp(alreadySignedUp);
          setBannerHidden(isBannerHidden(next.id));
          setPopupOpen(!alreadySignedUp && !wasPopupDismissed(next.id));
        }
      })
      .catch((error) => {
        // A missing table or network issue must never block the main app.
        console.error("Error loading training webinars:", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-render once a minute so "Join now" appears and finished sessions drop off.
  useEffect(() => {
    const interval = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const handlePopupOpenChange = useCallback(
    (open: boolean) => {
      setPopupOpen(open);
      if (!open && webinar) markPopupDismissed(webinar.id);
    },
    [webinar]
  );

  if (!webinar || !isUpcoming(webinar)) return null;

  return (
    <>
      {!bannerHidden && (
        <WebinarBanner
          webinar={webinar}
          signedUp={signedUp}
          onSignUp={() => setPopupOpen(true)}
          onDismiss={() => {
            hideBanner(webinar.id);
            setBannerHidden(true);
          }}
        />
      )}
      <WebinarPopup
        webinar={webinar}
        open={popupOpen}
        signedUp={signedUp}
        onOpenChange={handlePopupOpenChange}
        onSignedUp={() => setSignedUp(true)}
      />
    </>
  );
}
