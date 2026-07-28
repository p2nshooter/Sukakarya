"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface UploadedMedia {
  id: string;
  fileName: string;
  url: string;
  sizeBytes: number;
}

/**
 * Uploads straight to `/api/admin/media`, which writes the object to R2 and
 * records it in D1. On success the library below is refreshed via
 * `router.refresh()` so the new file is visible without a full reload.
 */
export function MediaUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedMedia[]>([]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setBusy(true);
    setError(null);
    const done: UploadedMedia[] = [];

    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);

      try {
        const response = await fetch("/api/admin/media", {
          method: "POST",
          body,
        });
        const payload = (await response.json()) as
          | { media: UploadedMedia }
          | { error: string };

        if (!response.ok || !("media" in payload)) {
          setError(
            "error" in payload
              ? `${file.name}: ${payload.error}`
              : `${file.name}: gagal diunggah.`,
          );
          continue;
        }
        done.push(payload.media);
      } catch {
        setError(`${file.name}: koneksi terputus saat mengunggah.`);
      }
    }

    setUploaded((prev) => [...done, ...prev]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (done.length > 0) router.refresh();
  }

  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] p-6">
      <label htmlFor="media-file" className="block text-sm font-medium">
        Unggah berkas
      </label>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Gambar, video, audio, PDF dan dokumen Office. Maksimal 64 MB per berkas.
      </p>

      <input
        ref={inputRef}
        id="media-file"
        type="file"
        multiple
        disabled={busy}
        onChange={(event) => upload(event.target.files)}
        className="mt-4 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-dark"
      />

      {busy ? (
        <p className="mt-3 text-sm text-[var(--text-muted)]" role="status">
          Mengunggah…
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {uploaded.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm">
          {uploaded.map((media) => (
            <li key={media.id}>
              <a
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                {media.fileName}
              </a>{" "}
              <span className="text-[var(--text-muted)]">
                ({Math.max(1, Math.round(media.sizeBytes / 1024))} KB) tersimpan
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
