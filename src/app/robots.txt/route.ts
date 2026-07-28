import { getCurrentVillage } from "@/lib/village";

export const dynamic = "force-dynamic";

/**
 * Robots policy.
 *
 * Admin, API and media routes are disallowed outright. A village in
 * `maintenance` status is fully disallowed so a half-configured site never
 * enters the index.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const village = await getCurrentVillage().catch(() => null);

  if (!village || village.status !== "active") {
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    "Disallow: /media/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
