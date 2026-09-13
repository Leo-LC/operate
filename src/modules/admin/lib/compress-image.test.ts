import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  compressFile,
  generateStoragePath,
  validateFile,
  MAX_DIMENSION,
} from "./compress-image";

function makeFile(name: string, type: string, bytes: Uint8Array): File {
  return new File([bytes as unknown as BlobPart], name, { type });
}

describe("validateFile", () => {
  it("accepts pdf and images", () => {
    for (const type of ["application/pdf", "image/jpeg", "image/png", "image/webp"]) {
      expect(validateFile(makeFile("a", type, new Uint8Array(10))).ok).toBe(true);
    }
  });

  it("rejects unsupported types and oversized files", () => {
    expect(validateFile(makeFile("a.tiff", "image/tiff", new Uint8Array(10))).ok).toBe(false);
    expect(validateFile(makeFile("a.pdf", "application/pdf", new Uint8Array(9 * 1024 * 1024))).ok).toBe(false);
  });
});

describe("generateStoragePath", () => {
  it("is relative to the bucket (no bucket prefix) and unique", () => {
    const a = generateStoragePath("org", "emp", "id-front.jpg");
    const b = generateStoragePath("org", "emp", "id-front.jpg");
    expect(a.startsWith("employee-docs/")).toBe(false);
    expect(a.startsWith("org/emp/")).toBe(true);
    expect(a).not.toBe(b);
  });

  it("sanitizes extensions", () => {
    expect(generateStoragePath("o", "e", "evil.PDF ")).toMatch(/\.pdf$/);
    expect(generateStoragePath("o", "e", "noext")).toMatch(/\.[a-z0-9]+$/);
  });
});

describe("compressFile", () => {
  it("passes PDFs through with magic-byte check", async () => {
    const pdf = new Uint8Array(Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(100)]));
    const out = await compressFile(makeFile("scan.pdf", "application/pdf", pdf));
    expect(out.mimeType).toBe("application/pdf");
    expect(out.sizeBytes).toBe(pdf.length);
  });

  it("rejects fake PDFs", async () => {
    await expect(compressFile(makeFile("evil.pdf", "application/pdf", new Uint8Array(100)))).rejects.toThrow(
      "Invalid PDF",
    );
  });

  it("converts images to webp and caps dimensions", async () => {
    const big = await sharp({
      create: { width: MAX_DIMENSION * 2, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();
    const out = await compressFile(makeFile("photo.jpg", "image/jpeg", new Uint8Array(big)));
    expect(out.mimeType).toBe("image/webp");
    expect(out.originalName).toBe("photo.webp");
    const meta = await sharp(out.buffer).metadata();
    expect(meta.width ?? 0).toBeLessThanOrEqual(MAX_DIMENSION);
    expect(out.sizeBytes).toBeLessThan(big.length);
  }, 20000);
});
