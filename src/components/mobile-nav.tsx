"use client";

import Link from "next/link";
import { useState } from "react";

import type { NavItem } from "@/lib/navigation";

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        className="grid h-9 w-9 place-items-center rounded-md hover:bg-[var(--surface-muted)]"
      >
        <span aria-hidden>{open ? "✕" : "☰"}</span>
      </button>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Navigasi seluler"
          className="absolute inset-x-0 top-full max-h-[70vh] overflow-y-auto border-b border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg"
        >
          {items.map((item) => (
            <div key={item.id} className="py-0.5">
              <Link
                href={item.url}
                target={item.target}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
              >
                {item.label}
              </Link>
              {item.children.length > 0 ? (
                <div className="ml-3 border-l border-[var(--border)] pl-2">
                  {item.children.map((child) => (
                    <Link
                      key={child.id}
                      href={child.url}
                      target={child.target}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-1.5 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
