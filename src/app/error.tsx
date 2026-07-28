"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only safe identifier to surface: the message itself may
    // contain internal details.
    console.error("render error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-6xl font-bold text-brand">500</p>
        <h1 className="mt-3 text-2xl font-bold">Terjadi kesalahan</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Sistem sedang mengalami gangguan. Silakan coba beberapa saat lagi.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Kode kesalahan: <code>{error.digest}</code>
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Muat Ulang
        </button>
      </div>
    </div>
  );
}
