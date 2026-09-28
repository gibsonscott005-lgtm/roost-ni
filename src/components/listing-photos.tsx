import { useEffect, useRef, useState } from "react";
import { ImageIcon, ChevronLeft, ChevronRight, Maximize2, Star, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readSafeImage } from "@/lib/safe-image";
import { getListingPhotoUrls } from "@/lib/listing-photos.functions";

export const LISTING_PHOTOS_BUCKET = "listing-photos";

/** Upload picked files to the landlord's folder; returns storage paths. */
export async function uploadListingPhotos(landlordId: string, files: File[]) {
  const paths: string[] = [];
  for (const file of files) {
    const image = await readSafeImage(file);
    const path = `${landlordId}/${crypto.randomUUID()}.${image.extension}`;
    const { error } = await supabase.storage
      .from(LISTING_PHOTOS_BUCKET)
      .upload(path, image.bytes, { contentType: image.contentType, upsert: false });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

/**
 * Turn stored storage paths into temporary viewable URLs.
 *
 * Public listing pages resolve URLs on the server and pass them in as
 * `presetUrls`, so this hook does nothing at all there. Otherwise: landlords
 * sign their own photos directly (storage RLS covers their folder); everyone
 * else — including anonymous visitors — goes through the server function,
 * which only signs photos that belong to an advertised listing. Anonymous
 * visitors skip the direct storage call entirely because strict in-app
 * browsers (e.g. Facebook's) can drop those requests wholesale (status 0,
 * promise never settles), which left galleries stuck on the placeholder.
 */
export function useSignedPhotoUrls(
  paths: string[] | null | undefined,
  presetUrls?: string[],
) {
  const key = (paths ?? []).join("|");
  const presetKey = (presetUrls ?? []).join("|");
  const [urls, setUrls] = useState<string[]>(presetUrls ?? []);

  useEffect(() => {
    if (presetUrls && presetUrls.length > 0) {
      setUrls(presetUrls);
      return;
    }
    let cancelled = false;
    const list = key ? key.split("|").filter(Boolean) : [];
    if (list.length === 0) {
      setUrls([]);
      return;
    }

    const load = async () => {
      let signedIn = false;
      try {
        signedIn = !!(await supabase.auth.getSession()).data.session;
      } catch {
        signedIn = false;
      }

      let own: string[] = [];
      if (signedIn) {
        own = await supabase.storage
          .from(LISTING_PHOTOS_BUCKET)
          .createSignedUrls(list, 60 * 60)
          .then(({ data }) =>
            (data ?? [])
              .map((d) => d.signedUrl)
              .filter((u): u is string => typeof u === "string" && u.length > 0),
          )
          .catch(() => [] as string[]);

        if (own.length === list.length) {
          if (!cancelled) setUrls(own);
          return;
        }
      }

      const publicUrls = await getListingPhotoUrls({ data: { paths: list } }).catch(
        () => [] as string[],
      );
      if (!cancelled) setUrls(publicUrls.length ? publicUrls : own);
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, presetKey]);

  return urls;
}

export function PhotoPlaceholder({
  className,
  message = "No photos yet",
}: {
  className?: string;
  message?: string;
}) {
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
          {message}
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
  showCount = true,
  coverUrl,
}: {
  paths: string[] | null | undefined;
  alt: string;
  className?: string;
  showCount?: boolean;
  coverUrl?: string;
}) {
  const urls = useSignedPhotoUrls(paths, coverUrl ? [coverUrl] : undefined);
  const src = coverUrl ?? urls[0];
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const box = className ?? "aspect-[16/10]";
  const photoCount = paths?.length ?? urls.length;
  if (!src) return <PhotoPlaceholder className={box} />;
  if (broken)
    return <PhotoPlaceholder className={box} message="Photo couldn't load" />;
  return (
    <div className={`relative w-full overflow-hidden bg-surface-muted ${box}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        onError={() => setBroken(true)}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      {showCount && photoCount > 1 ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-foreground/70 px-2 py-0.5 text-[10px] font-semibold text-background backdrop-blur">
          {photoCount} photos
        </span>
      ) : null}
    </div>
  );
}

/** Move an item within an array, returning a new array. */
function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/**
 * Small overlay of ordering controls shown on each thumbnail: nudge left or
 * right, or promote straight to cover. Buttons rather than drag-and-drop so it
 * works the same on a phone as on a desktop.
 */
function OrderControls({
  index,
  count,
  isCover,
  onMove,
  onMakeCover,
  onRemove,
}: {
  index: number;
  count: number;
  isCover: boolean;
  onMove: (to: number) => void;
  onMakeCover: () => void;
  onRemove?: () => void;
}) {
  return (
    <>
      {isCover ? (
        <span className="absolute left-1 top-1 rounded-full bg-verified px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-background">
          Cover
        </span>
      ) : (
        <button
          type="button"
          aria-label="Use as cover photo"
          title="Use as cover photo"
          onClick={onMakeCover}
          className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-foreground/75 text-background transition hover:bg-foreground"
        >
          <Star className="h-3 w-3" />
        </button>
      )}
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove photo"
          onClick={onRemove}
          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-foreground/75 text-background"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
      <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
        <button
          type="button"
          aria-label="Move photo earlier"
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
          className="grid h-6 w-6 place-items-center rounded-full bg-foreground/75 text-background transition disabled:opacity-0"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-label="Move photo later"
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
          className="grid h-6 w-6 place-items-center rounded-full bg-foreground/75 text-background transition disabled:opacity-0"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </>
  );
}

/** Grid of photos with add, remove and ordering controls. */
export function PhotoPicker({
  files,
  onChange,
  existing,
  onRemoveExisting,
  onReorderExisting,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  existing?: string[];
  onRemoveExisting?: (path: string) => void;
  onReorderExisting?: (paths: string[]) => void;
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  const existingUrls = useSignedPhotoUrls(existing);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/"));
    onChange([...files, ...picked].slice(0, 10));
  };

  const existingList = existing ?? [];
  // The cover is simply the first photo overall — an existing one when there
  // are any, otherwise the first newly picked file.
  const coverIsExisting = existingList.length > 0;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {existingList.map((path, i) => (
          <div
            key={path}
            className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-muted"
          >
            {existingUrls[i] ? (
              <img src={existingUrls[i]} alt="" className="h-full w-full object-cover" />
            ) : null}
            {onReorderExisting ? (
              <OrderControls
                index={i}
                count={existingList.length}
                isCover={coverIsExisting && i === 0}
                onMove={(to) => onReorderExisting(move(existingList, i, to))}
                onMakeCover={() => onReorderExisting(move(existingList, i, 0))}
                {...(onRemoveExisting ? { onRemove: () => onRemoveExisting(path) } : {})}
              />
            ) : onRemoveExisting ? (
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => onRemoveExisting(path)}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-foreground/75 text-background"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ))}
        {previews.map((src, i) => (
          <div
            key={src}
            className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-muted"
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
            <OrderControls
              index={i}
              count={previews.length}
              isCover={!coverIsExisting && i === 0}
              onMove={(to) => onChange(move(files, i, to))}
              onMakeCover={() => onChange(move(files, i, 0))}
              onRemove={() => onChange(files.filter((_, idx) => idx !== i))}
            />
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface-muted text-muted-foreground transition hover:bg-secondary">
          <Upload className="h-4 w-4" />
          <span className="text-[10px] font-medium uppercase tracking-[0.14em]">Add</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="mt-2.5 text-xs text-muted-foreground">
        Up to 10 photos. Use the arrows to reorder, or the star to make a photo the cover shown
        on search results.
      </p>
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
  const [fullscreen, setFullscreen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setIndex(0);
  }, [urls.length]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  if (urls.length === 0) return <PhotoPlaceholder className="aspect-[16/9]" />;

  const go = (delta: number) =>
    setIndex((i) => (i + delta + urls.length) % urls.length);

  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const start = touchStart.current;
      const t = e.changedTouches[0];
      touchStart.current = null;
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && urls.length > 1) {
        go(dx < 0 ? 1 : -1);
      }
    },
  };

  return (
    <div className="w-full">
      <div
        className="relative aspect-[16/9] w-full select-none overflow-hidden bg-surface-muted"
        {...swipeHandlers}
      >
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          aria-label="Enlarge photo"
          className="block h-full w-full cursor-zoom-in"
        >
          <img src={urls[index]} alt={alt} className="h-full w-full object-cover" />
        </button>
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
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-foreground/70 px-2.5 py-1 text-[11px] font-semibold text-background backdrop-blur">
              {index + 1} / {urls.length}
            </span>
          </>
        ) : null}
        <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-foreground/70 px-2.5 py-1 text-[11px] font-semibold text-background backdrop-blur">
          <Maximize2 className="h-3 w-3" />
          Tap to enlarge
        </span>
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

      {fullscreen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          {...swipeHandlers}
        >
          <button
            type="button"
            aria-label="Close photo viewer"
            onClick={() => setFullscreen(false)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-surface/90 text-foreground shadow"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={urls[index]}
            alt={alt}
            className="max-h-full max-w-full object-contain"
          />
          {urls.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => go(-1)}
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-foreground shadow"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => go(1)}
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-foreground shadow"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-foreground">
                {index + 1} / {urls.length}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}