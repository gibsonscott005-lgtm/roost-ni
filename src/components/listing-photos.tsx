import { useEffect, useState } from "react";
import { ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const LISTING_PHOTOS_BUCKET = "listing-photos";

/** Turn stored storage paths into temporary viewable URLs. */
export function useSignedPhotoUrls(paths: string[] | null | undefined) {
  const key = (paths ?? []).join("|");
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split("|").filter(Boolean) : [];
    if (list.length === 0) {
      setUrls([]);
      return;
    }
    void supabase.storage
      .from(LISTING_PHOTOS_BUCKET)
      .createSignedUrls(list, 60 * 60)
      .then(({ data }) => {
        if (cancelled) return;
        setUrls(
          (data ?? [])
            .map((d) => d.signedUrl)
            .filter((u): u is string => typeof u === "string" && u.length > 0),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return urls;
}

export function PhotoPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden bg-[linear-gradient(135deg,var(--color-surface-muted)_0%,var(--color-secondary)_100%)] ${className ?? "aspect-[16/10]"}`}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.08) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="relative flex flex-col items-center gap-1.5 text-muted-foreground">
        <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface/80 backdrop-blur">
          <ImageIcon className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em]">
          No photos yet
        </span>
      </div>
    </div>
  );
}

/** Single cover image for listing cards. */
export function ListingCover({
  paths,
  alt,
  className,
}: {
  paths: string[] | null | undefined;
  alt: string;
  className?: string;
}) {
  const urls = useSignedPhotoUrls(paths);
  const box = className ?? "aspect-[16/10]";
  if (urls.length === 0) return <PhotoPlaceholder className={box} />;
  return (
    <div className={`relative w-full overflow-hidden bg-surface-muted ${box}`}>
      <img
        src={urls[0]}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      {urls.length > 1 ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-foreground/70 px-2 py-0.5 text-[10px] font-semibold text-background backdrop-blur">
          {urls.length} photos
        </span>
      ) : null}
    </div>
  );
}

/** Swipeable gallery for the property detail page. */
export function ListingGallery({
  paths,
  alt,
}: {
  paths: string[] | null | undefined;
  alt: string;
}) {
  const urls = useSignedPhotoUrls(paths);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [urls.length]);

  if (urls.length === 0) return <PhotoPlaceholder className="aspect-[16/9]" />;

  const go = (delta: number) =>
    setIndex((i) => (i + delta + urls.length) % urls.length);

  return (
    <div className="w-full">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-muted">
        <img src={urls[index]} alt={alt} className="h-full w-full object-cover" />
        {urls.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-foreground shadow backdrop-blur transition hover:bg-surface"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-foreground shadow backdrop-blur transition hover:bg-surface"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-foreground/70 px-2.5 py-1 text-[11px] font-semibold text-background backdrop-blur">
              {index + 1} / {urls.length}
            </span>
          </>
        ) : null}
      </div>
      {urls.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {urls.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View photo ${i + 1}`}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === index ? "border-foreground" : "border-transparent opacity-70"
              }`}
            >
              <img src={u} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}