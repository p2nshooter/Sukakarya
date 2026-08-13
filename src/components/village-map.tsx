"use client";

import { useRef, useState } from "react";

/**
 * The map of the village office.
 *
 * The embed is an ordinary OpenStreetMap iframe, which means the visitor can
 * drag it anywhere in the world and there is no way back - on a village site
 * that is a small trap, because the one thing the map exists to show is where
 * the office is. Panning is worth keeping; losing the office is not.
 *
 * So the frame is remounted on demand. Changing the `key` throws the old iframe
 * away and builds a new one at the original bounding box, which returns the view
 * to the office without needing the map provider's JavaScript API, an API key,
 * or a third-party script on the page.
 *
 * The button only appears once the visitor has actually touched the map. Before
 * that there is nothing to return from, and a control that undoes nothing is
 * just another thing to read.
 */
export function VillageMap({
  latitude,
  longitude,
  label,
  zoom = 15,
}: {
  latitude: number;
  longitude: number;
  label: string;
  zoom?: number;
}) {
  const [generation, setGeneration] = useState(0);
  const [moved, setMoved] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  // Higher zoom means a tighter box. 15 puts the office and its immediate
  // surroundings in view; the span roughly halves for each step in.
  const span = 0.08 / Math.pow(2, zoom - 13);
  const src =
    `https://www.openstreetmap.org/export/embed.html?bbox=` +
    `${longitude - span}%2C${latitude - span}%2C` +
    `${longitude + span}%2C${latitude + span}` +
    `&layer=mapnik&marker=${latitude}%2C${longitude}`;

  function reset() {
    setGeneration((n) => n + 1);
    setMoved(false);
  }

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] shadow-[var(--shadow-md)]">
      <iframe
        key={generation}
        ref={frame}
        title={label}
        src={src}
        loading="lazy"
        className="aspect-[16/7] w-full border-0"
      />

      {/* A cross-origin iframe never reports its own panning, so the wrapper
          watches for the gesture instead: a press or a wheel over the map is
          taken as "the visitor has started moving it". It is deliberately a
          one-way latch - it turns the button on and never off - because the
          cost of showing the control unnecessarily is one button, and the cost
          of missing it is a visitor stranded somewhere else on the map. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ pointerEvents: moved ? "none" : "auto" }}
        onPointerDown={(event) => {
          setMoved(true);
          // Hand the very gesture that revealed the button through to the map,
          // so the first drag pans instead of being swallowed by this layer.
          event.currentTarget.style.pointerEvents = "none";
        }}
        onWheel={() => setMoved(true)}
      />

      {moved ? (
        <button
          type="button"
          onClick={reset}
          className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)]/95 px-3 py-2 text-xs font-semibold shadow-[var(--shadow-md)] backdrop-blur transition-colors hover:bg-[var(--surface-2)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          Kembali ke titik desa
        </button>
      ) : null}
    </div>
  );
}
