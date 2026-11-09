import { useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  COOKIE_COPY,
  OPEN_SETTINGS_EVENT,
  analyticsAllowed,
  hasGpc,
  needsAnalyticsAnswer,
  onConsentChange,
  openCookieSettings,
  saveAnalyticsChoice,
} from "@/lib/analytics-consent";

/** Non-modal banner + Cookie settings panel. Mounted once, client-only. */
export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const gpc = hasGpc();

  useEffect(() => {
    const refresh = () => {
      setShowBanner(needsAnalyticsAnswer());
      setAnalyticsOn(analyticsAllowed());
    };
    refresh();
    const open = () => {
      setAnalyticsOn(analyticsAllowed());
      setShowSettings(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    const off = onConsentChange(refresh);
    return () => {
      window.removeEventListener(OPEN_SETTINGS_EVENT, open);
      off();
    };
  }, []);

  useEffect(() => {
    if (showBanner || showSettings) panelRef.current?.focus();
  }, [showBanner, showSettings]);

  const decide = (choice: "granted" | "denied") => {
    saveAnalyticsChoice(choice);
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!showBanner && !showSettings) return null;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label={COOKIE_COPY.settings}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl border-2 border-foreground bg-background p-4 text-sm text-foreground shadow-lg outline-none sm:inset-x-6"
    >
      {showSettings ? (
        <div className="space-y-4">
          <p className="font-semibold">{COOKIE_COPY.settings}</p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">{COOKIE_COPY.necessaryTitle}</p>
              <p className="text-muted-foreground">{COOKIE_COPY.necessaryText}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="consent-analytics" className="font-medium">
              {COOKIE_COPY.analyticsTitle}
            </label>
            <Switch
              id="consent-analytics"
              checked={!gpc && analyticsOn}
              disabled={gpc}
              onCheckedChange={setAnalyticsOn}
            />
          </div>
          {gpc && <p className="text-muted-foreground">{COOKIE_COPY.gpcNote}</p>}
          <div className="flex justify-end">
            <Button onClick={() => decide(!gpc && analyticsOn ? "granted" : "denied")}>
              {COOKIE_COPY.save}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p>{COOKIE_COPY.banner}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => decide("granted")}>{COOKIE_COPY.acceptAll}</Button>
            <Button onClick={() => decide("denied")}>{COOKIE_COPY.rejectAll}</Button>
          </div>
          <button
            type="button"
            onClick={() => openCookieSettings()}
            className="text-sm underline underline-offset-4 hover:text-muted-foreground"
          >
            {COOKIE_COPY.settings}
          </button>
        </div>
      )}
    </div>
  );
}

/** Footer link that reopens the Cookie settings panel. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => openCookieSettings()} className={className}>
      {COOKIE_COPY.settings}
    </button>
  );
}
