"use client";

import { useState } from "react";

import { IconSparkle } from "@/components/icons";

/**
 * Article fields with AI assistance attached.
 *
 * The fields are ordinary uncontrolled-looking inputs backed by local state, so
 * the enclosing server action still receives them as plain form data. The AI
 * buttons only ever *fill* a field - nothing auto-saves, and every suggestion
 * is discardable by typing over it.
 *
 * The whole assist strip is hidden when the deployment has no AI key, so an
 * unconfigured install shows a clean editor rather than buttons that fail.
 */
export function AiArticleFields({
  enabled,
  titleName = "title",
  excerptName = "excerpt",
  bodyName = "body",
}: {
  enabled: boolean;
  titleName?: string;
  excerptName?: string;
  bodyName?: string;
}) {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(task: "draft" | "improve" | "summarize" | "seo") {
    setBusy(task);
    setError(null);

    try {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task, title, body }),
      });

      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !data.text) {
        setError(data.error ?? "Permintaan AI gagal.");
        return;
      }

      if (task === "draft" || task === "improve") {
        setBody(data.text);
      } else {
        setExcerpt(data.text);
      }
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setBusy(null);
    }
  }

  const field =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none transition-shadow placeholder:text-[var(--text-subtle)] focus:border-brand focus:ring-4 focus:ring-brand/15";

  return (
    <>
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
          Judul
        </label>
        <input
          id="title"
          name={titleName}
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={field}
        />
      </div>

      {enabled ? (
        <div className="rounded-[var(--radius-lg)] border border-brand/25 bg-brand/5 p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
            <IconSparkle className="h-4 w-4" />
            Bantuan AI
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AiButton
              label="Buatkan draf"
              task="draft"
              busy={busy}
              disabled={!title.trim()}
              onRun={run}
            />
            <AiButton
              label="Rapikan tulisan"
              task="improve"
              busy={busy}
              disabled={!body.trim()}
              onRun={run}
            />
            <AiButton
              label="Buat ringkasan"
              task="summarize"
              busy={busy}
              disabled={!body.trim()}
              onRun={run}
            />
            <AiButton
              label="Meta description"
              task="seo"
              busy={busy}
              disabled={!title.trim() && !body.trim()}
              onRun={run}
            />
          </div>
          <p className="mt-2.5 text-xs text-[var(--text-muted)]">
            Hasil AI adalah draf. Periksa fakta, angka, dan nama sebelum
            dipublikasikan.
          </p>
          {error ? (
            <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <div>
        <label htmlFor="excerpt" className="mb-1.5 block text-sm font-medium">
          Ringkasan
        </label>
        <textarea
          id="excerpt"
          name={excerptName}
          rows={2}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="body" className="mb-1.5 block text-sm font-medium">
          Isi
        </label>
        <textarea
          id="body"
          name={bodyName}
          rows={12}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className={`${field} font-mono text-[0.8125rem] leading-relaxed`}
        />
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          HTML sederhana diperbolehkan. Tag berbahaya dibuang otomatis saat
          disimpan.
        </p>
      </div>
    </>
  );
}

function AiButton({
  label,
  task,
  busy,
  disabled,
  onRun,
}: {
  label: string;
  task: "draft" | "improve" | "summarize" | "seo";
  busy: string | null;
  disabled: boolean;
  onRun: (task: "draft" | "improve" | "summarize" | "seo") => void;
}) {
  const running = busy === task;

  return (
    <button
      type="button"
      onClick={() => onRun(task)}
      disabled={disabled || busy !== null}
      className="inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {running ? (
        <span
          aria-hidden
          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {running ? "Memproses…" : label}
    </button>
  );
}
