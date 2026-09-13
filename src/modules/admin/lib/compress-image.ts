// Server-only: imports sharp (native Node module). Never import this file
// from a client component — use ./employee-documents for shared constants.
import sharp from "sharp";
import { ALLOWED_MIMES, ALLOWED_PDF_MIMES, MAX_SIZE_BYTES } from "./employee-documents";

export {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_MIMES,
  ALLOWED_PDF_MIMES,
  MAX_DOCS_PER_EMPLOYEE,
  MAX_SIZE_BYTES,
} from "./employee-documents";

export const MAX_DIMENSION = 1600;
export const WEBP_QUALITY = 78;

export interface CompressedFile {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
}

export function validateFile(file: File): { ok: boolean; error?: string } {
  if (!ALLOWED_MIMES.includes(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type}. Allowed: PDF, JPEG, PNG, WebP` };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max 8MB` };
  }
  return { ok: true };
}

export async function compressFile(file: File): Promise<CompressedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  if (ALLOWED_PDF_MIMES.includes(file.type)) {
    if (inputBuffer.length < 5 || !inputBuffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      throw new Error("Invalid PDF file");
    }
    return {
      buffer: inputBuffer,
      mimeType: file.type,
      sizeBytes: inputBuffer.length,
      originalName: file.name,
    };
  }

  const metadata = await sharp(inputBuffer).metadata();
  const needsResize = (metadata.width ?? 0) > MAX_DIMENSION || (metadata.height ?? 0) > MAX_DIMENSION;

  let outputBuffer: Buffer;
  if (needsResize) {
    outputBuffer = await sharp(inputBuffer)
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } else {
    outputBuffer = await sharp(inputBuffer).webp({ quality: WEBP_QUALITY }).toBuffer();
  }

  return {
    buffer: outputBuffer,
    mimeType: "image/webp",
    sizeBytes: outputBuffer.length,
    originalName: file.name.replace(/\.(jpe?g|png|webp)$/i, ".webp"),
  };
}

export function generateStoragePath(organizationId: string, employeeId: string, fileName: string): string {
  const uuid = crypto.randomUUID();
  const rawExt = fileName.split(".").pop() ?? "webp";
  // Sanitize: keep only alphanumerics, default to webp. Path is relative to the
  // bucket (supabase.storage.from("employee-docs").upload(path)) so it must NOT
  // include the bucket name prefix.
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "webp";
  return `${organizationId}/${employeeId}/${uuid}.${ext}`;
}