"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { IconClose, IconSearch } from "@/components/icons";

/**
 * Search entry point in the header.
 *
 * A permanently expanded input crowds the bar on laptop widths, so this is an
 * icon that opens a centred overlay. It is a plain GET form to /cari, so it
 * works identically without JavaScript once the overlay is open, and the page
 * it submits to does the actual searching on the server.
 *
 * The overlay goes through a portal for the same reason the mobile nav does:
 * the header carries `backdrop-filter`, which makes it the containing block for
 * `position: fixed` children, so an in-place overlay would be clipped to the
 * header bar instead of covering the viewport.
 */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    // Focus after paint, otherwise the element is not yet in the document.
    const id = requestAnimationFrame(() => inputRef.current?.focus());

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    // The overlay is modal, so stop the page behind it from scrolling.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  // "/" focuses search, the convention on content sites. Ignored while the
  // visitor is already typing somewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      event.preventDefault();
      setOpen(true);
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const overlay = (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian"
        className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
      >
        <button
          type="button"
          aria-label="Tutup pencarian"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm"
        />

        <form
          action="/cari"
          role="search"
          className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)]"
        >
          <div className="flex items-center gap-3 px-4">
            <IconSearch className="h-5 w-5 shrink-0 text-[var(--text-subtle)]" />
            <label htmlFor="site-search" className="sr-only">
              Kata kunci
            </label>
            <input
              ref={inputRef}
              id="site-search"
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Cari berita, layanan, halaman…"
              className="w-full bg-transparent py-4 text-[0.9375rem] outline-none placeholder:text-[var(--text-subtle)]"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-2)]"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-xs text-[var(--text-muted)]">
            <span>Tekan Enter untuk mencari</span>
            <kbd className="rounded border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 py-0.5 font-sans text-[0.6875rem]">
              Esc
            </kbd>
          </div>
        </form>
      </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Cari"
        className="grid h-10 w-10 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
      >
        <IconSearch className="h-5 w-5" />
      </button>

      {open && mounted ? createPortal(overlay, document.body) : null}
    </>
  );
}
