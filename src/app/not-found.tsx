import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-6xl font-bold text-brand">404</p>
        <h1 className="mt-3 text-2xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Halaman yang Anda cari sudah dipindahkan, dihapus, atau belum
          diaktifkan oleh pengelola.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
