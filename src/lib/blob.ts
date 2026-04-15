// File uploads.
//
// In production we use Vercel Blob (set BLOB_READ_WRITE_TOKEN). In local dev
// without a token, we fall back to writing to public/uploads/ and serving
// via a /uploads/* URL. The API is the same either way — callers don't care.

import { put } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type UploadResult = {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
};

/** Server-side upload from a File/Blob/Buffer. */
export async function uploadFile(
  file: File,
  opts: { prefix?: string; access?: "public" } = {},
): Promise<UploadResult> {
  const prefix = (opts.prefix ?? "u").replace(/^\/+|\/+$/g, "");
  const rand = randomBytes(8).toString("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const pathname = `${prefix}/${Date.now()}-${rand}-${safeName}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    };
  }

  // Local dev fallback — persist to public/uploads, served statically by Next.
  const buf = Buffer.from(await file.arrayBuffer());
  const baseDir = join(process.cwd(), "public", "uploads");
  const fullPath = join(baseDir, pathname);
  await mkdir(join(baseDir, prefix), { recursive: true });
  await writeFile(fullPath, buf);
  return {
    url: `/uploads/${pathname}`,
    pathname,
    contentType: file.type || "application/octet-stream",
    size: buf.length,
  };
}
