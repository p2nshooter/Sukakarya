import type { ReactNode } from "react";

/**
 * A numbered walkthrough.
 *
 * Both places that needed one - how to register, and how to ask for a letter -
 * wanted the same thing: a short ordered list where each step arrives as the
 * reader scrolls to it. Written once here so the two cannot drift apart, and so
 * a third guide costs an array rather than a component.
 *
 * The motion is `animation-timeline: view()`, the same mechanism the gallery
 * uses. That keeps this a server component: no IntersectionObserver, no client
 * bundle, nothing to hydrate. Browsers without support show every step at once,
 * which is the correct fallback for a list of instructions.
 */

export interface Step {
  title: string;
  body: string;
  /** Shown in the tinted panel beside the words. Keep it short. */
  aside?: ReactNode;
}

export function Panduan({
  steps,
  className = "",
}: {
  steps: Step[];
  className?: string;
}) {
  return (
    <ol className={`panduan relative ${className}`}>
      {/* The rail runs behind the markers and stops at the last one rather than
          the bottom of the list, so it does not trail off under the final step. */}
      <span
        aria-hidden
        className="absolute bottom-10 left-[1.125rem] top-4 w-px bg-gradient-to-b from-brand/40 via-brand/20 to-transparent"
      />

      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-5 pb-8 last:pb-0">
          <span
            aria-hidden
            className="panduan-dot relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brand/30 bg-[var(--surface)] font-display text-sm font-bold text-brand shadow-[var(--shadow-sm)]"
          >
            {index + 1}
          </span>

          <div className="panduan-body min-w-0 flex-1 pt-1">
            <h3 className="font-display text-base font-bold leading-tight">
              {step.title}
            </h3>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">
              {step.body}
            </p>
            {step.aside ? (
              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
                {step.aside}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
