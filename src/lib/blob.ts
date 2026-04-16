// File uploads.
//
// In production we use Vercel Blob (requires BLOB_READ_WRITE_TOKEN). In local
// dev without a token, we fall back to writing to public/uploads/ and serving
// via /uploads/*. The API is the same either way.
//
// On Vercel, the function filesystem (/var/task/...) is READ-ONLY except /tmp,
// so we deliberately refuse to use the local fallback in production — that
// used to silently fail and/or produce URLs that 404 on next load.

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

export class UploadError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

function isLambda(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NODE_ENV === "production",
  );
}

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

  if (isLambda()) {
    throw new UploadError(
      "File uploads require a Vercel Blob store. In your Vercel project, Storage → Create → Blob, then redeploy. The BLOB_READ_WRITE_TOKEN env var attaches automatically.",
      "BLOB_NOT_CONFIGURED",
    );
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
