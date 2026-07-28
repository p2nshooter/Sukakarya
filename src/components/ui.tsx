import Link from "next/link";
import type { ReactNode } from "react";

export function Section({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string | null;
  subtitle?: string | null;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-7xl px-4 py-10 ${className}`}>
      {title ? (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint ? (
        <p className="mt-1 text-sm text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function MoreLink({ href, label = "Lihat semua" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-brand hover:underline"
    >
      {label} →
    </Link>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
      {children}
    </span>
  );
}

/**
 * Media thumbnail with a deterministic aspect box.
 * `src` is null when the record has no cover; we render a neutral placeholder
 * rather than a broken image.
 */
export function Thumb({
  src,
  alt,
  ratio = "16/9",
  className = "",
}: {
  src: string | null;
  alt: string;
  ratio?: string;
  className?: string;
}) {
  return (
    <div
      className={`w-full overflow-hidden bg-[var(--surface-muted)] ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="grid h-full w-full place-items-center text-2xl text-[var(--text-muted)]"
        >
          ▤
        </div>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumb,
}: {
  title: string;
  description?: string | null;
  breadcrumb?: { label: string; href: string }[];
}) {
  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-[var(--text-muted)]">
              {breadcrumb.map((crumb, i) => (
                <li key={crumb.href} className="flex items-center gap-1">
                  {i > 0 ? <span aria-hidden>/</span> : null}
                  <Link href={crumb.href} className="hover:text-[var(--text)]">
                    {crumb.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
