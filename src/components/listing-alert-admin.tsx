import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getListingAlertAdmin,
  sendListingAlertPreviewToMe,
  setListingAlertLiveDelivery,
  setListingIsTest,
} from "@/lib/listing-alerts.functions";

type Listing = {
  id: string;
  title: string;
  location: string | null;
  is_test: boolean;
  is_published: boolean;
  alerts_sent_at: string | null;
};

/** Admin controls for tenant alert emails: live switch, test flags and previews. */
export function ListingAlertAdmin() {
  const load = useServerFn(getListingAlertAdmin);
  const setLive = useServerFn(setListingAlertLiveDelivery);
  const setTest = useServerFn(setListingIsTest);
  const preview = useServerFn(sendListingAlertPreviewToMe);
  const [live, setLiveState] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () =>
    load().then((r) => {
      setLiveState(r.liveDelivery);
      setListings(r.listings as Listing[]);
    });

  useEffect(() => {
    void refresh().catch(() => toast.error("Couldn't load alert settings."));
  }, []);

  const toggle = async () => {
    const next = !live;
    if (next && !window.confirm("Switch live delivery on? New listings will email matching subscribers.")) return;
    setBusy("live");
    try {
      await setLive({ data: { live: next } });
      setLiveState(next);
      toast.success(next ? "Live delivery is on" : "Live delivery is off");
    } catch {
      toast.error("Couldn't change the setting.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-6 space-y-4 rounded-sm border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            Live subscriber delivery: {live ? "On" : "Off (safety mode)"}
          </p>
          <p className="text-xs text-muted-foreground">
            {live
              ? "New live listings email matching subscribers, at most once a day each."
              : "Nothing goes to subscribers. New listings send a preview to you only."}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy === "live"}
          className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-foreground)] disabled:opacity-60"
        >
          {live ? "Switch off" : "Switch on"}
        </button>
      </div>
      <ul className="space-y-2">
        {listings.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
            <span className="min-w-0 truncate text-sm">
              {l.title}
              <span className="ml-2 text-[11px] text-muted-foreground">
                {l.is_published ? "Live" : "Hidden"}
                {l.alerts_sent_at ? " · Alerted" : ""}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={l.is_test}
                  onChange={async (e) => {
                    const isTest = e.target.checked;
                    await setTest({ data: { listingId: l.id, isTest } });
                    setListings((ls) => ls.map((x) => (x.id === l.id ? { ...x, is_test: isTest } : x)));
                  }}
                />
                Test listing
              </label>
              <button
                type="button"
                disabled={busy === l.id}
                onClick={async () => {
                  setBusy(l.id);
                  try {
                    const r = await preview({ data: { listingId: l.id } });
                    toast.success(r.sent ? `Preview sent to ${r.to}` : "That address is suppressed.");
                  } catch {
                    toast.error("Couldn't send the preview.");
                  } finally {
                    setBusy(null);
                  }
                }}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold disabled:opacity-60"
              >
                Send me a preview
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
