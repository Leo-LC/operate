// Browser-only image compression (canvas). Replaces the old server-side sharp
// pipeline: files now go straight from the browser to Supabase Storage via a
// signed URL (Vercel functions cap request bodies at ~4.5MB, so large files
// can never transit through our API). Settings mirror the old pipeline:
// max 1600px, WebP output.
import { MAX_DIMENSION, WEBP_QUALITY } from "./employee-documents";

export interface CompressedImage {
  blob: Blob;
  fileName: string;
}

export async function compressImageClient(file: File): Promise<CompressedImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image file"));
      el.src = url;
    });

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    if (!blob) throw new Error("Image compression failed");

    return {
      blob,
      fileName: file.name.replace(/\.(jpe?g|png|webp)$/i, ".webp"),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
