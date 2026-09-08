import { useEffect, useState } from "react";
import { ImageIcon, ChevronLeft, ChevronRight, Star, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readSafeImage } from "@/lib/safe-image";

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
  showCount = true,
}: {
  paths: string[] | null | undefined;
  alt: string;
  className?: string;
  showCount?: boolean;
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
      {showCount && urls.length > 1 ? (
        <span className="absolute bottom-2 right-2 rounded-full bg-foreground/70 px-2 py-0.5 text-[10px] font-semibold text-background backdrop-blur">
          {urls.length} photos
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