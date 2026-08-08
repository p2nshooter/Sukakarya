import styles from "./page.module.css";

function EnvStatus() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const connected = hasUrl && hasAnonKey;

  return (
    <div className={styles.ctas}>
      <p>
        Supabase env vars:{" "}
        <strong>{connected ? "configured" : "missing"}</strong>
        {!connected && (
          <>
            {" "}
            — set <code className={styles.code}>NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and{" "}
            <code className={styles.code}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            (see <code className={styles.code}>.env.example</code>).
          </>
        )}
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>Sukakarya</h1>
          <p>Next.js + Supabase, deployed on Vercel.</p>
        </div>
        <EnvStatus />
      </main>
    </div>
  );
}
