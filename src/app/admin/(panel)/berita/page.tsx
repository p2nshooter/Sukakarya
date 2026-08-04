import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canAccess } from "@/lib/access";
import { isAiEnabled } from "@/lib/ai";
import { getViewer } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDb } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { newId, uniqueSlug } from "@/lib/id";
import { requireVillage } from "@/lib/village";

import { AiArticleFields } from "@/components/admin/ai-editor";

import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

interface PostRow {
  id: string;
  slug: string;
  type: string;
  title: string;
  status: string;
  published_at: string | null;
  updated_at: string;
  view_count: number;
}

async function createPost(formData: FormData) {
  "use server";

  const viewer = await getViewer();
  if (!canAccess(viewer, "staff")) redirect("/admin/login");

  const village = await requireVillage();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect("/admin/berita?error=judul");

  const type = String(formData.get("type") ?? "news");
  if (!["news", "article", "announcement"].includes(type)) return;

  const status = formData.get("publish") === "on" ? "published" : "draft";
  const now = new Date().toISOString();
  const id = newId("pst");

  await getDb()
    .prepare(
      `INSERT INTO posts (id, village_id, type, slug, title, excerpt, body,
                          author_id, author_name, status, published_at,
                          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      village.id,
      type,
      uniqueSlug(title, "berita"),
      title,
      String(formData.get("excerpt") ?? "").trim() || null,
      String(formData.get("body") ?? "").trim() || null,
      viewer.userId,
      String(formData.get("authorName") ?? "").trim() || null,
      status,
      status === "published" ? now : null,
      now,
      now,
    )
    .run();

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "create",
    resource: "posts",
    resourceId: id,
    summary: `${type}: ${title} (${status})`,
  });

  revalidatePath("/admin/berita");
  revalidatePath("/berita");
  revalidatePath("/");
  redirect("/admin/berita?ok=1");
}

async function togglePublish(formData: FormData) {
  "use server";

  const viewer = await getViewer();
  if (!canAccess(viewer, "staff")) redirect("/admin/login");

  const village = await requireVillage();
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "draft");
  if (!id || !["draft", "published", "archived"].includes(next)) return;

  const now = new Date().toISOString();
  await getDb()
    .prepare(
      `UPDATE posts
       SET status = ?,
           published_at = CASE
             WHEN ? = 'published' AND published_at IS NULL THEN ?
             ELSE published_at END,
           updated_at = ?
       WHERE id = ? AND village_id = ?`,
    )
    .bind(next, next, now, now, id, village.id)
    .run();

  await logAudit({
    villageId: village.id,
    actorId: viewer.userId,
    action: "update",
    resource: "posts",
    resourceId: id,
    summary: `status → ${next}`,
  });

  revalidatePath("/admin/berita");
  revalidatePath("/berita");
  revalidatePath("/");
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const village = await requireVillage();
  const aiEnabled = isAiEnabled();

  const { results } = await getDb()
    .prepare(
      `SELECT id, slug, type, title, status, published_at, updated_at, view_count
       FROM posts
       WHERE village_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC
       LIMIT 50`,
    )
    .bind(village.id)
    .all<PostRow>();

  const locale = `${village.locale}-ID`;

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Berita &amp; Artikel</h1>

      {params.ok ? (
        <p role="status" className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Konten tersimpan.
        </p>
      ) : null}
      {params.error === "judul" ? (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Judul wajib diisi.
        </p>
      ) : null}

      <details className="mt-6 rounded-xl border border-[var(--border)] p-5">
        <summary className="cursor-pointer font-semibold">Tulis konten baru</summary>

        <form action={createPost} className="mt-5 grid gap-4">
          <div>
            <label htmlFor="type" className="mb-1.5 block text-sm font-medium">
              Jenis
            </label>
            <select
              id="type"
              name="type"
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
            >
              <option value="news">Berita</option>
              <option value="article">Artikel</option>
              <option value="announcement">Pengumuman</option>
            </select>
          </div>

          <AiArticleFields enabled={aiEnabled} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="authorName" className="block text-sm font-medium">
                Nama penulis
              </label>
              <input
                id="authorName"
                name="authorName"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-end gap-2 text-sm">
              <input type="checkbox" name="publish" className="mb-2.5" />
              <span className="mb-2">Publikasikan sekarang</span>
            </label>
          </div>

          <div>
            <button
              type="submit"
              className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Simpan
            </button>
          </div>
        </form>
      </details>

      <h2 className="mt-10 text-lg font-semibold">Daftar Konten</h2>

      {results.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Belum ada konten." />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-3 py-2 font-semibold">Judul</th>
                <th className="px-3 py-2 font-semibold">Jenis</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Diperbarui</th>
                <th className="px-3 py-2 font-semibold">Dibaca</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {results.map((post) => (
                <tr key={post.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2">
                    <Link href={`/berita/${post.slug}`} className="font-medium hover:text-brand">
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{post.type}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        post.status === "published"
                          ? "text-green-600"
                          : "text-[var(--text-muted)]"
                      }
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {formatDateTime(post.updated_at, locale, village.timezone)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{post.view_count}</td>
                  <td className="px-3 py-2">
                    <form action={togglePublish} className="flex gap-2">
                      <input type="hidden" name="id" value={post.id} />
                      <input
                        type="hidden"
                        name="next"
                        value={post.status === "published" ? "draft" : "published"}
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium hover:border-brand hover:text-brand"
                      >
                        {post.status === "published" ? "Jadikan draft" : "Publikasikan"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
