import { canAccess } from "@/lib/access";
import { isAiEnabled, isAiTask, runAiTask } from "@/lib/ai";
import { getViewer, hashIp } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

/**
 * Editorial AI endpoint for the admin panel.
 *
 * Staff only, tenant-scoped and rate limited. It accepts published-facing
 * content (a headline, an article body) and returns suggested text; the caller
 * decides whether to keep it. Nothing is written to the database here, so a bad
 * suggestion costs an editor one click to discard.
 */
export async function POST(request: Request): Promise<Response> {
  const viewer = await getViewer();
  if (!canAccess(viewer, "staff")) {
    return Response.json({ error: "Tidak diizinkan." }, { status: 403 });
  }

  if (!isAiEnabled()) {
    return Response.json(
      { error: "Fitur AI belum diaktifkan pada deployment ini." },
      { status: 503 },
    );
  }

  const village = await requireVillage();

  // Per-user rather than per-IP: this is an authenticated surface, and a shared
  // office IP should not throttle the whole staff.
  const ipHash = await hashIp(request.headers.get("cf-connecting-ip"));
  const allowed = await checkRateLimit({
    key: `ai:${village.id}:${viewer.userId ?? ipHash ?? "anon"}`,
    limit: 30,
    windowSeconds: 600,
  });
  if (!allowed) {
    return Response.json(
      { error: "Terlalu banyak permintaan AI. Coba lagi beberapa menit lagi." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body bukan JSON yang sah." }, { status: 400 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const task = typeof payload.task === "string" ? payload.task : "";

  if (!isAiTask(task)) {
    return Response.json({ error: "Tugas AI tidak dikenal." }, { status: 400 });
  }

  const result = await runAiTask({
    task,
    title: typeof payload.title === "string" ? payload.title : undefined,
    body: typeof payload.body === "string" ? payload.body : undefined,
    villageLabel: `${village.entityLabel} ${village.name}`,
  });

  if (!result.ok) {
    // 503 for "the provider is unhappy", 422 for "the caller gave us nothing
    // to work with" - the panel shows both, but only one is worth retrying.
    const status = result.reason === "empty" ? 422 : 503;
    return Response.json({ error: result.message }, { status });
  }

  return Response.json({ text: result.text });
}
