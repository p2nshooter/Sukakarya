"use client";

import { useEffect, useState } from "react";

import { IconClose, IconImage, IconSearch } from "@/components/icons";

interface MediaItem {
  id: string;
  filename: string;
  contentType: string;
  alt: string | null;
}

/**
 * Picks an existing media record for a resource field.
 *
 * Stores the media id in a hidden input, so the enclosing server action reads
 * it as ordinary form data and the generic writer needs no special case. The
 * library is fetched lazily the first time the picker is opened rather than on
 * every page load, since most edits never touch the image field.
 */
export function MediaPicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || items !== null) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/media", { method: "GET" });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { items?: MediaItem[] };
        if (!cancelled) setItems(data.items ?? []);
      } catch {
        if (!cancelled) setError("Gagal memuat pustaka media.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, items]);

  const visible = (items ?? []).filter((item) =>
    query
      ? `${item.filename} ${item.alt ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      : true,
  );

  return (
    <div>
      <input type="hidden" name={name} value={value} />

      <div className="flex items-center gap-3">
        {value ? (
          <img
            src={`/media/${value}`}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg border border-[var(--border)] object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-dashed border-[var(--border-strong)] text-[var(--text-subtle)]"
          >
            <IconImage className="h-5 w-5" />
          </span>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand hover:text-brand"
          >
            {value ? "Ganti" : "Pilih dari media"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => setValue("")}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-red-600"
            >
              Kosongkan
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[8vh]">
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm"
          />
          <div className="relative flex max-h-[75vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)]">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
              <IconSearch className="h-4 w-4 shrink-0 text-[var(--text-subtle)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari berkas…"
                className="w-full bg-transparent py-1 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-[var(--surface-2)]"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {error ? (
                <p className="py-8 text-center text-sm text-red-600">{error}</p>
              ) : items === null ? (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Memuat…
                </p>
              ) : visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Tidak ada berkas. Unggah dulu lewat menu Media.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {visible.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setValue(item.id);
                        setOpen(false);
                      }}
                      className={`overflow-hidden rounded-lg border text-left transition-colors ${
                        value === item.id
                          ? "border-brand ring-2 ring-brand/30"
                          : "border-[var(--border)] hover:border-brand"
                      }`}
                    >
                      {item.contentType.startsWith("image/") ? (
                        <img
                          src={`/media/${item.id}`}
                          alt=""
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <span className="grid aspect-square w-full place-items-center bg-[var(--surface-2)] text-[var(--text-subtle)]">
                          <IconImage className="h-6 w-6" />
                        </span>
                      )}
                      <span className="block truncate px-2 py-1.5 text-[0.6875rem] text-[var(--text-muted)]">
                        {item.filename}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
