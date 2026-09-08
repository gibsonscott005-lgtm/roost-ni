/**
 * Verify an uploaded file really is a raster image by inspecting its magic
 * bytes, rather than trusting the browser-reported MIME type. SVG (and any
 * other markup-based format) is rejected outright because it can carry script
 * that would run in the storage origin if the file is opened directly.
 */
export type SafeImage = {
  bytes: ArrayBuffer;
  contentType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  extension: "jpg" | "png" | "webp" | "gif";
};

export async function readSafeImage(file: File): Promise<SafeImage> {
  const bytes = await file.arrayBuffer();
  const head = new Uint8Array(bytes.slice(0, 16));
  const is = (offset: number, sig: number[]) =>
    sig.every((b, i) => head[offset + i] === b);

  if (is(0, [0xff, 0xd8, 0xff]))
    return { bytes, contentType: "image/jpeg", extension: "jpg" };
  if (is(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { bytes, contentType: "image/png", extension: "png" };
  if (is(0, [0x47, 0x49, 0x46, 0x38]))
    return { bytes, contentType: "image/gif", extension: "gif" };
  if (is(0, [0x52, 0x49, 0x46, 0x46]) && is(8, [0x57, 0x45, 0x42, 0x50]))
    return { bytes, contentType: "image/webp", extension: "webp" };

  throw new Error("That file is not a JPEG, PNG, WEBP or GIF photo.");
}
