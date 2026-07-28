import { getDb } from "@/lib/env";
import { newId } from "@/lib/id";

export interface AuditEntry {
  villageId: string | null;
  actorId: string | null;
  actorLabel?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  summary?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
}

/**
 * Appends to the audit trail.
 *
 * Never throws: an unavailable audit table must not turn a successful write
 * into a user-visible error. Failures are logged for the operator instead.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await getDb()
      .prepare(
        `INSERT INTO audit_logs (id, village_id, actor_id, actor_label, action,
                                 resource, resource_id, summary, ip_hash, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId("aud"),
        entry.villageId,
        entry.actorId,
        entry.actorLabel ?? null,
        entry.action,
        entry.resource,
        entry.resourceId ?? null,
        entry.summary ?? null,
        entry.ipHash ?? null,
        entry.userAgent ?? null,
      )
      .run();
  } catch (error) {
    console.error("audit log write failed", error);
  }
}

/** Increments today's view counter for a path. Advisory, never throws. */
export async function recordPageView(
  villageId: string,
  path: string,
): Promise<void> {
  try {
    const day = new Date().toISOString().slice(0, 10);
    await getDb()
      .prepare(
        `INSERT INTO analytics_daily (village_id, day, path, views)
         VALUES (?, ?, ?, 1)
         ON CONFLICT (village_id, day, path)
         DO UPDATE SET views = views + 1`,
      )
      .bind(villageId, day, path.slice(0, 300))
      .run();
  } catch {
    /* counters are advisory */
  }
}
