import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Access to the Worker bindings.
 *
 * Every call site goes through here so that a missing binding fails with a
 * message that names the binding, instead of a `undefined is not an object`
 * further down the stack.
 */
export function getEnv(): CloudflareEnv {
  const { env } = getCloudflareContext();
  return env as CloudflareEnv;
}

export function getDb(): D1Database {
  const db = getEnv().DB;
  if (!db) {
    throw new Error(
      "D1 binding `DB` is not available. Check `d1_databases` in wrangler.jsonc.",
    );
  }
  return db;
}

export function getKv(): KVNamespace {
  const kv = getEnv().KV;
  if (!kv) {
    throw new Error(
      "KV binding `KV` is not available. Check `kv_namespaces` in wrangler.jsonc.",
    );
  }
  return kv;
}

export function getMediaBucket(): R2Bucket {
  const bucket = getEnv().MEDIA;
  if (!bucket) {
    throw new Error(
      "R2 binding `MEDIA` is not available. Check `r2_buckets` in wrangler.jsonc.",
    );
  }
  return bucket;
}

/**
 * Slug of the village to serve when the request hostname is not registered.
 * Never hardcoded to a particular village - it comes from the deployment vars.
 */
export function getDefaultVillageSlug(): string {
  return getEnv().DEFAULT_VILLAGE_SLUG || "demo";
}
