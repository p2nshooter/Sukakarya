import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Page gutter. Every full-width band uses this for its inner content so all
 * sections line up on a single measure, including ones whose background bleeds
 * to the viewport edge.
 */
export function Container({
  children,
  className = "",
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: "default" | "wide" | "narrow" | "prose";
}) {
  const max = {
    narrow: "max-w-3xl",
    prose: "max-w-[68ch]",
    default: "max-w-7xl",
    wide: "max-w-[88rem]",
  }[width];

  return (
    <div className={`mx-auto w-full ${max} px-5 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

/**
 * A titled band of content.
 *
 * `tone` controls the background so consecutive sections can alternate without
 * each renderer inventing its own colour. `eyebrow` is the small caps label
 * above the heading - it gives a section a hierarchy beyond just "bigger text".
 */
export function Section({
  title,
  subtitle,
  eyebrow,
  action,
  children,
  className = "",
  tone = "default",
  id,
}: {
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "default" | "muted" | "contrast";
  id?: string;
}) {
  const toneClass = {
    default: "",
    muted: "bg-[var(--surface-1)]",
    contrast: "bg-[var(--surface-2)]",
  }[tone];

  return (
    <section
      id={id}
      className={`py-14 sm:py-18 lg:py-22 ${toneClass} ${className}`}
    >
      <Container>
        {title || eyebrow ? (
          <div className="mb-9 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="max-w-2xl">
              {eyebrow ? (
                <p className="mb-2.5 flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-brand">
                  <span
                    aria-hidden
                    className="inline-block h-px w-7 bg-brand/50"
                  />
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h2 className="text-[length:var(--text-h2)] font-bold leading-[1.15]">
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        ) : null}
        {children}
      </Container>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className = "",
  interactive = false,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  /** Adds the lift-on-hover treatment. Use for cards that are themselves links. */
  interactive?: boolean;
  tone?: "default" | "raised" | "outline";
}) {
  const toneClass = {
    default: "bg-[var(--surface)] shadow-[var(--shadow-sm)]",
    raised: "bg-[var(--surface)] shadow-[var(--shadow-md)]",
    outline: "bg-transparent",
  }[tone];

  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] ${toneClass} ${
        interactive ? "hover-lift zoom-parent" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)]/60 px-6 py-16 text-center">
      <div
        aria-hidden
        className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--text-subtle)]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.69c.6 0 1.17.24 1.59.66l1.31 1.31c.42.42.99.66 1.59.66H18A2.25 2.25 0 0 1 20.25 8.6v9.15A2.25 2.25 0 0 1 18 20H6a2.25 2.25 0 0 1-2.25-2.25V6Z"
          />
        </svg>
      </div>
      <p className="font-semibold">{title}</p>
      {hint ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                    */
/* -------------------------------------------------------------------------- */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";

const BUTTON_VARIANTS = {
  primary:
    "bg-brand text-[var(--text-on-brand)] shadow-[var(--shadow-brand)] hover:bg-brand-600 active:translate-y-px",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-1)] active:translate-y-px",
  ghost: "text-[var(--text)] hover:bg-[var(--surface-2)]",
  subtle: "bg-brand/10 text-brand hover:bg-brand/15",
  danger: "bg-red-600 text-white hover:bg-red-700 active:translate-y-px",
  onDark:
    "bg-white text-[#14171a] shadow-[var(--shadow-lg)] hover:bg-white/90 active:translate-y-px",
} as const;

const BUTTON_SIZES = {
  sm: "px-3 py-1.5 text-[0.8125rem]",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-[0.9375rem]",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

function buttonClass(
  variant: ButtonVariant = "primary",
  size: keyof typeof BUTTON_SIZES = "md",
  className = "",
) {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: keyof typeof BUTTON_SIZES;
}) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: keyof typeof BUTTON_SIZES;
}) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function MoreLink({
  href,
  label = "Lihat semua",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
    >
      <span className="link-underline">{label}</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />
      </svg>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Indicators                                                                  */
/* -------------------------------------------------------------------------- */

const BADGE_TONES = {
  brand: "bg-brand/10 text-brand ring-brand/20",
  neutral:
    "bg-[var(--surface-2)] text-[var(--text-muted)] ring-[var(--border-strong)]",
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-400",
  info: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-400",
  onDark: "bg-white/15 text-white ring-white/25 backdrop-blur-sm",
} as const;

export function Badge({
  children,
  tone = "brand",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ring-1 ring-inset ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Number + label tile, used for statistics and dashboard summaries. */
export function StatTile({
  value,
  label,
  hint,
  icon,
}: {
  value: ReactNode;
  label: string;
  hint?: string | null;
  icon?: ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--border-strong)]">
      <div
        aria-hidden
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand/5 transition-transform duration-500 group-hover:scale-150"
      />
      <div className="relative">
        {icon ? <div className="mb-3 text-brand">{icon}</div> : null}
        <p className="text-3xl font-bold leading-none tracking-tight tabular-nums">
          {value}
        </p>
        <p className="mt-2 text-sm font-medium text-[var(--text)]">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Horizontal proportion bar. Used for APBDes realisation and demographics. */
export function Meter({
  value,
  max,
  label,
  caption,
  tone = "brand",
}: {
  value: number;
  max: number;
  label: string;
  caption?: string;
  tone?: "brand" | "accent";
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        {caption ? (
          <span className="tabular-nums text-[var(--text-muted)]">{caption}</span>
        ) : null}
      </div>
      <div
        role="meter"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"
      >
        <div
          className={`h-full rounded-full ${
            tone === "brand" ? "bg-brand" : "bg-brand-accent"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Media thumbnail with a deterministic aspect box, so a grid never reflows as
 * images arrive. `src` is null when the record has no cover; that renders a
 * tinted placeholder rather than a broken image or a grey void.
 */
export function Thumb({
  src,
  alt,
  ratio = "16/9",
  className = "",
  zoom = false,
  priority = false,
}: {
  src: string | null;
  alt: string;
  ratio?: string;
  className?: string;
  /** Pair with `interactive` on the enclosing Card for a hover zoom. */
  zoom?: boolean;
  /** Set on above-the-fold images so they are not lazy-loaded. */
  priority?: boolean;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-[var(--surface-2)] ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className={`h-full w-full object-cover ${zoom ? "zoom-target" : ""}`}
        />
      ) : (
        <div aria-hidden className="media-placeholder h-full w-full" />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page chrome                                                                 */
/* -------------------------------------------------------------------------- */

export function Breadcrumb({
  items,
}: {
  items: { label: string; href: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
        {items.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 ? (
              <span aria-hidden className="opacity-50">
                /
              </span>
            ) : null}
            {i === items.length - 1 ? (
              <span aria-current="page" className="font-medium text-[var(--text)]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="link-underline hover:text-[var(--text)]"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Title band at the top of an interior page.
 *
 * `tone="brand"` puts it on the tenant's colour wash, which is what the landing
 * pages for major sections use; the default keeps it quiet for article and
 * detail pages where the content should lead. Both are light, so the heading
 * stays near-black and contrast never depends on which colour a village picked.
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  eyebrow,
  action,
  tone = "default",
}: {
  title: string;
  description?: string | null;
  breadcrumb?: { label: string; href: string }[];
  eyebrow?: string | null;
  action?: ReactNode;
  tone?: "default" | "brand";
}) {
  return (
    <div
      className={
        tone === "brand"
          ? "brand-mesh grain relative overflow-hidden border-b border-[var(--border)]"
          : "border-b border-[var(--border)] bg-[var(--surface-1)]"
      }
    >
      <Container className="relative py-12 sm:py-16">
        {breadcrumb && breadcrumb.length > 0 ? (
          <div className="mb-4">
            <Breadcrumb items={breadcrumb} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="mb-2.5 flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-brand">
                <span aria-hidden className="inline-block h-px w-7 bg-brand/50" />
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-[length:var(--text-h1)] font-bold leading-[1.1]">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </Container>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Forms                                                                       */
/* -------------------------------------------------------------------------- */

export const FIELD_CLASS =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-shadow placeholder:text-[var(--text-subtle)] focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-[var(--text)]"
      >
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-red-500">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

/** Result banner for form submissions. */
export function Notice({
  tone,
  title,
  children,
}: {
  tone: "success" | "error" | "info" | "warning";
  title: string;
  children?: ReactNode;
}) {
  const tones = {
    success:
      "border-emerald-500/30 bg-emerald-500/8 text-emerald-900 dark:text-emerald-200",
    error: "border-red-500/30 bg-red-500/8 text-red-900 dark:text-red-200",
    info: "border-sky-500/30 bg-sky-500/8 text-sky-900 dark:text-sky-200",
    warning: "border-amber-500/30 bg-amber-500/8 text-amber-900 dark:text-amber-200",
  }[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-[var(--radius-lg)] border px-4 py-3.5 ${tones}`}
    >
      <p className="text-sm font-semibold">{title}</p>
      {children ? <div className="mt-1 text-sm opacity-90">{children}</div> : null}
    </div>
  );
}
