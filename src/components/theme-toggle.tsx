"use client";

import { useEffect, useState } from "react";

import { IconMoon, IconSun } from "@/components/icons";

type Theme = "light" | "dark";

const STORAGE_KEY = "desa-theme";

/**
 * Light/dark switch.
 *
 * Defaults to light and deliberately ignores prefers-color-scheme. Most phones
 * ship with dark mode on, so seeding from the OS meant the light design was
 * never what a visitor actually saw. Dark is now something a person chooses,
 * and the choice persists in localStorage.
 *
 * Renders a stable placeholder on the server and only reads storage after
 * mount, so there is no hydration mismatch.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme = stored === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      className="grid h-10 w-10 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
    >
      {theme === "dark" ? (
        <IconSun className="h-5 w-5" />
      ) : (
        <IconMoon className="h-5 w-5" />
      )}
    </button>
  );
}
