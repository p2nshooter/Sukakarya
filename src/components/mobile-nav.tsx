"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { NavItem } from "@/lib/navigation";
import type { Village } from "@/lib/village";

import {
  IconChevronDown,
  IconClose,
  IconMail,
  IconMenu,
  IconPhone,
} from "@/components/icons";

/**
 * Slide-in navigation for phones and tablets.
 *
 * The panel is rendered through a portal to <body>. The header bar carries
 * `backdrop-filter` for its frosted effect, and per spec an element with
 * backdrop-filter becomes the containing block for any `position: fixed`
 * descendant. Rendered in place, this overlay resolved `inset: 0` against the
 * header bar rather than the viewport - it came out only as tall as the header,
 * with the page showing straight through it and the links unreachable.
 *
 * Parents with children are disclosure groups rather than links plus a nested
 * list: on a touch screen there is no hover, so a sub-menu needs an explicit
 * control to open it. The parent's own page stays reachable through a "Lihat
 * semua" entry inside the group.
 */
export function MobileNav({
  items,
  village,
  isCitizen = false,
}: {
  items: NavItem[];
  village: Village;
  /** Resolved by the server component; this one cannot read the session. */
  isCitizen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // A portal needs a DOM target, which does not exist during the server render.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const close = () => setOpen(false);

  const overlay = (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button
        type="button"
        aria-label="Tutup menu"
        onClick={close}
        className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm"
      />

      <nav
        id="mobile-nav"
        aria-label="Navigasi seluler"
        className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <span className="min-w-0 truncate font-display font-bold">
            {village.entityLabel} {village.name}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Tutup menu"
            className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {items.map((item) => {
            const hasChildren = item.children.length > 0;
            const isOpen = expanded === item.id;

            if (!hasChildren) {
              return (
                <Link
                  key={item.id}
                  href={item.url}
                  target={item.target}
                  onClick={close}
                  className="block rounded-lg px-3 py-3 font-medium transition-colors hover:bg-[var(--surface-2)]"
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left font-medium transition-colors hover:bg-[var(--surface-2)]"
                >
                  {item.label}
                  <IconChevronDown
                    className={`h-4 w-4 opacity-60 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen ? (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-[var(--border)] pl-3">
                    <Link
                      href={item.url}
                      target={item.target}
                      onClick={close}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-[var(--surface-2)]"
                    >
                      Lihat semua
                    </Link>
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.url}
                        target={child.target}
                        onClick={close}
                        className="block rounded-lg px-3 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* The resident's own door, mirroring the header link that only appears
            from xl upwards. Without this the account would be unreachable on
            every phone and most laptops. */}
        <div className="border-t border-[var(--border)] px-5 py-4">
          <Link
            href={isCitizen ? "/akun" : "/masuk"}
            className="flex items-center justify-center rounded-lg border border-[var(--border-strong)] px-4 py-2.5 text-sm font-semibold"
          >
            {isCitizen ? "Akun Saya" : "Masuk Akun Warga"}
          </Link>
        </div>

        {village.phone || village.email ? (
          <div className="space-y-1 border-t border-[var(--border)] px-5 py-4 text-sm">
            {village.phone ? (
              <a
                href={`tel:${village.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2.5 py-1 text-[var(--text-muted)]"
              >
                <IconPhone className="h-4 w-4 shrink-0 text-brand" />
                {village.phone}
              </a>
            ) : null}
            {village.email ? (
              <a
                href={`mailto:${village.email}`}
                className="flex items-center gap-2.5 py-1 text-[var(--text-muted)]"
              >
                <IconMail className="h-4 w-4 shrink-0 text-brand" />
                <span className="truncate">{village.email}</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </nav>
    </div>
  );

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label="Buka menu"
        className="grid h-11 w-11 place-items-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
      >
        <IconMenu className="h-6 w-6" />
      </button>

      {open && mounted ? createPortal(overlay, document.body) : null}
    </div>
  );
}
