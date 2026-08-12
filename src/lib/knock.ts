import { cookies } from "next/headers";

import { getVillageSettings } from "@/lib/village";

/**
 * A knock code in front of the admin login.
 *
 * `/admin/login` is the most predictable URL on any village site, and it is
 * found by scanners within hours of a domain going live. The knock does not
 * replace the password - it removes the door from view, so the password is
 * never the only thing standing between a bot and the panel.
 *
 * Deliberately optional. A village that has not set a code sees exactly the
 * behaviour it had before, because a security feature that locks the operator
 * out of their own site on the day it ships is worse than no feature.
 */

export const KNOCK_COOKIE = "desa_knock";
export const KNOCK_SETTING = "site.admin_knock";

/** The code for this village, or null when the door is simply open. */
export async function getKnockCode(villageId: string): Promise<string | null> {
  const settings = await getVillageSettings(villageId, "site.");
  const code = settings[KNOCK_SETTING]?.trim();
  return code ? code : null;
}

/**
 * Has this visitor knocked?
 *
 * True when no code is configured, so every call site can ask the same question
 * without first checking whether the feature is on.
 */
export async function hasKnocked(villageId: string): Promise<boolean> {
  const code = await getKnockCode(villageId);
  if (!code) return true;

  const store = await cookies();
  return store.get(KNOCK_COOKIE)?.value === code;
}

/**
 * Short-lived on purpose. Long enough to sign in, not long enough that a shared
 * or borrowed phone keeps the door open for the next person to use it.
 */
export function knockCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 15 * 60,
  };
}
