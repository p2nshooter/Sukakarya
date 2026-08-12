import { cookies } from "next/headers";

import { getKnockCode, KNOCK_COOKIE, knockCookieOptions } from "@/lib/knock";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

/**
 * The knock. `/k/<code>` opens the admin login for a quarter of an hour.
 *
 * A wrong code answers 404, not 401 or "wrong code": the page must not confirm
 * that a knock route exists at all, because a guessable "try again" is an
 * invitation to keep guessing. To someone without the code this URL is
 * indistinguishable from any other address that was never a page.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const village = await requireVillage();

  // Guessing is the only attack this route has, so it is rate limited per
  // village before the comparison rather than after it.
  const allowed = await checkRateLimit({
    key: `knock:${village.id}`,
    limit: 10,
    windowSeconds: 600,
  });
  if (!allowed) return new Response("Not found", { status: 404 });

  const expected = await getKnockCode(village.id);
  if (!expected || code !== expected) {
    return new Response("Not found", { status: 404 });
  }

  const store = await cookies();
  store.set(KNOCK_COOKIE, expected, knockCookieOptions());

  return new Response(null, {
    status: 303,
    headers: { location: "/admin/login", "cache-control": "no-store" },
  });
}
