import type { Session } from "./auth";

/**
 * The interface, served as one self-contained document.
 *
 * No build step, no bundle, no external request: the CSP in index.ts allows
 * inline script and style and nothing else, so the page cannot reach any origin
 * but its own. That is a deliberate constraint for an application holding a
 * roster - there is no third party it could leak to even by accident.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STYLE = `
:root{
  --bg:#fefdfb; --panel:#ffffff; --muted:#f4f1eb; --line:#e6e0d4;
  --ink:#1a1815; --dim:#6b645b; --faint:#9c948a;
  --brand:#0d6b52; --brand-dark:#084a39; --gold:#b98a2e;
  --danger:#b42318; --ok:#0d7a4f;
  --radius:14px;
  --shadow:0 1px 2px rgb(60 48 30/.05),0 6px 16px -6px rgb(60 48 30/.10);
  color-scheme:light;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:15px/1.55 "Plus Jakarta Sans",Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  -webkit-font-smoothing:antialiased}
h1,h2,h3{margin:0;letter-spacing:-.02em;line-height:1.15}
a{color:var(--brand)}
button,input,select,textarea{font:inherit}

/* Header */
.top{position:sticky;top:0;z-index:20;background:var(--brand-dark);color:#fff}
.top .in{max-width:1240px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:16px}
.brand{display:flex;align-items:center;gap:11px;min-width:0}
.mark{width:38px;height:38px;border-radius:11px;background:var(--gold);color:#231a06;
  display:grid;place-items:center;font-weight:800;flex:0 0 auto}
.brand b{display:block;font-size:15px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.brand span{display:block;font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:.08em}
.who{margin-left:auto;display:flex;align-items:center;gap:12px;font-size:13px}
.who .role{background:rgba(255,255,255,.14);padding:3px 9px;border-radius:999px;
  font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:700}
.who a{color:#fff;opacity:.8;text-decoration:none}
.who a:hover{opacity:1;text-decoration:underline}

/* Tabs */
.tabs{background:var(--panel);border-bottom:1px solid var(--line);position:sticky;top:62px;z-index:19}
.tabs .in{max-width:1240px;margin:0 auto;padding:0 20px;display:flex;gap:2px;overflow-x:auto}
.tab{appearance:none;background:none;border:0;padding:13px 14px;cursor:pointer;
  font-weight:600;font-size:14px;color:var(--dim);white-space:nowrap;border-bottom:2px solid transparent}
.tab:hover{color:var(--ink)}
.tab[aria-selected="true"]{color:var(--brand);border-bottom-color:var(--brand)}

main{max-width:1240px;margin:0 auto;padding:24px 20px 64px}
.hide{display:none!important}

/* Cards */
.grid{display:grid;gap:14px}
.g5{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.g2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
  box-shadow:var(--shadow)}
.pad{padding:18px}
.stat .n{font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}
.stat .l{margin-top:6px;font-size:13px;color:var(--dim)}

/* Toolbar */
.bar{display:flex;flex-wrap:wrap;gap:9px;align-items:center;margin-bottom:14px}
.bar .grow{flex:1 1 220px}
input,select,textarea{width:100%;padding:9px 11px;border:1px solid var(--line);
  border-radius:10px;background:var(--panel);color:var(--ink);outline:none}
input:focus,select:focus,textarea:focus{border-color:var(--brand);
  box-shadow:0 0 0 3px rgb(13 107 82/.14)}
label{display:block;font-size:13px;font-weight:600;margin-bottom:5px}
.hint{font-size:12px;color:var(--dim);margin-top:5px}
.err{font-size:12px;color:var(--danger);margin-top:5px;font-weight:600}

.btn{appearance:none;border:1px solid transparent;border-radius:10px;padding:9px 15px;
  font-weight:700;font-size:14px;cursor:pointer;background:var(--brand);color:#fff;
  display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
.btn:hover{background:var(--brand-dark)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn.sec{background:var(--panel);color:var(--ink);border-color:var(--line)}
.btn.sec:hover{background:var(--muted)}
.btn.dgr{background:var(--danger)}
.btn.sm{padding:6px 11px;font-size:13px}

/* Table */
.wrap{overflow-x:auto;border-radius:var(--radius)}
table{width:100%;border-collapse:collapse;font-size:14px;min-width:820px;background:var(--panel)}
th,td{padding:11px 13px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
th{background:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.05em;
  color:var(--dim);font-weight:800;position:sticky;top:0}
tbody tr:hover{background:#faf8f4}
td.num{font-variant-numeric:tabular-nums}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px}

.pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;
  font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.pill.aktif{background:rgb(13 122 79/.12);color:var(--ok)}
.pill.nonaktif{background:rgb(107 100 91/.14);color:var(--dim)}
.pill.calon{background:rgb(185 138 46/.16);color:#8a6520}

.empty{padding:56px 20px;text-align:center;color:var(--dim);background:var(--panel);
  border:1px dashed var(--line);border-radius:var(--radius)}

/* Modal */
.veil{position:fixed;inset:0;background:rgb(26 24 21/.5);backdrop-filter:blur(3px);
  z-index:40;display:flex;align-items:flex-start;justify-content:center;padding:5vh 16px;overflow:auto}
.modal{background:var(--panel);border-radius:16px;width:100%;max-width:760px;
  box-shadow:0 24px 64px -16px rgb(26 24 21/.35);overflow:hidden}
.modal header{padding:16px 20px;border-bottom:1px solid var(--line);
  display:flex;align-items:center;justify-content:space-between}
.modal .body{padding:20px}
.modal footer{padding:14px 20px;border-top:1px solid var(--line);
  display:flex;gap:9px;justify-content:flex-end;background:var(--muted)}
.x{appearance:none;background:none;border:0;font-size:22px;line-height:1;cursor:pointer;color:var(--dim)}

.toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:60;
  background:var(--ink);color:#fff;padding:11px 18px;border-radius:10px;font-size:14px;
  box-shadow:0 12px 32px -8px rgb(0 0 0/.4)}
.toast.bad{background:var(--danger)}

.note{background:rgb(185 138 46/.10);border:1px solid rgb(185 138 46/.3);
  border-radius:12px;padding:13px 15px;font-size:13px;color:#7a5a1c}

@media(max-width:640px){
  .top .in{padding:10px 14px}
  main{padding:16px 14px 48px}
  .tabs{top:58px}
  .who .name{display:none}
}
`;

/* -------------------------------------------------------------------------- */
/* Notice                                                                      */
/* -------------------------------------------------------------------------- */

/** A plain error page, for the download route where JSON would be downloaded. */
export function renderNotice(message: string): string {
  return `<!doctype html><html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Tidak dapat diproses</title><style>${STYLE}</style></head><body>
<main style="max-width:520px;margin-top:12vh">
  <div class="card pad">
    <h3 style="font-size:17px;margin-bottom:8px">Laporan tidak dapat dibuat</h3>
    <p style="margin:0 0 16px;color:var(--dim)">${escapeHtml(message)}</p>
    <a class="btn" href="/">Kembali ke aplikasi</a>
  </div>
</main></body></html>`;
}

/* -------------------------------------------------------------------------- */
/* Login                                                                       */
/* -------------------------------------------------------------------------- */

const LOGIN_ERRORS: Record<string, string> = {
  salah: "Email atau kata sandi salah.",
  kosong: "Email dan kata sandi wajib diisi.",
  throttle: "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
};

export function renderLogin(error: string | null): string {
  const message = error ? LOGIN_ERRORS[error] : null;

  return `<!doctype html><html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Masuk</title><style>${STYLE}
.auth{min-height:100vh;display:grid;place-items:center;padding:24px;
  background:radial-gradient(ellipse 70% 55% at 15% 0%,rgb(13 107 82/.10),transparent 60%),
             radial-gradient(ellipse 60% 60% at 92% 10%,rgb(185 138 46/.12),transparent 58%),var(--bg)}
.auth .card{width:100%;max-width:400px}
</style></head><body>
<div class="auth"><div class="card pad">
  <div style="display:flex;align-items:center;gap:11px;margin-bottom:22px">
    <span class="mark">T</span>
    <div><b style="font-size:16px">Database Anggota</b>
    <div style="font-size:12px;color:var(--dim)">Akses terbatas petugas</div></div>
  </div>
  ${message ? `<div class="err" role="alert" style="margin-bottom:14px">${escapeHtml(message)}</div>` : ""}
  <form method="post" action="/masuk">
    <div style="margin-bottom:13px">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required autocomplete="username" autofocus>
    </div>
    <div style="margin-bottom:18px">
      <label for="password">Kata Sandi</label>
      <input id="password" name="password" type="password" required autocomplete="current-password">
    </div>
    <button class="btn" style="width:100%;justify-content:center" type="submit">Masuk</button>
  </form>
  <p class="hint" style="margin-top:16px">
    Setiap masuk dan setiap perubahan data tercatat pada log audit.
  </p>
</div></div></body></html>`;
}

/* -------------------------------------------------------------------------- */
/* Application                                                                 */
/* -------------------------------------------------------------------------- */

export function renderApp(
  session: Session,
  orgName: string,
  region: string | null,
): string {
  const isAdmin = session.role === "admin";
  const canWrite = isAdmin || session.role === "petugas";

  return `<!doctype html><html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(orgName)}</title><style>${STYLE}</style></head><body>

<header class="top"><div class="in">
  <div class="brand">
    <span class="mark">${escapeHtml(orgName.charAt(0).toUpperCase())}</span>
    <div><b>${escapeHtml(orgName)}</b>
    <span>${escapeHtml(region ?? "Database Anggota")}</span></div>
  </div>
  <div class="who">
    <span class="name">${escapeHtml(session.fullName)}</span>
    <span class="role">${escapeHtml(session.role)}</span>
    <a href="/keluar">Keluar</a>
  </div>
</div></header>

<nav class="tabs"><div class="in" role="tablist">
  <button class="tab" role="tab" data-v="dasbor" aria-selected="true">Dasbor</button>
  <button class="tab" role="tab" data-v="data" aria-selected="false">Data Anggota</button>
  <button class="tab" role="tab" data-v="rekap" aria-selected="false">Rekap</button>
  <button class="tab" role="tab" data-v="laporan" aria-selected="false">Laporan &amp; Cetak</button>
  <button class="tab" role="tab" data-v="arsip" aria-selected="false">Arsip &amp; Ekspor</button>
  ${isAdmin ? '<button class="tab" role="tab" data-v="pengaturan" aria-selected="false">Pengaturan</button>' : ""}
  ${isAdmin ? '<button class="tab" role="tab" data-v="audit" aria-selected="false">Log Audit</button>' : ""}
</div></nav>

<main>
  <section id="v-dasbor">
    <div class="grid g5" id="stats"></div>
    <div class="grid g2" style="margin-top:18px">
      <div class="card pad"><h3 style="font-size:15px;margin-bottom:12px">Kualitas Data</h3>
        <div id="integrity"></div></div>
      <div class="card pad"><h3 style="font-size:15px;margin-bottom:12px">Sebaran per Dusun</h3>
        <div id="byArea"></div></div>
    </div>
  </section>

  <section id="v-data" class="hide">
    <div class="bar">
      <div class="grow"><input id="q" placeholder="Cari nama, dusun, jabatan…"></div>
      <select id="f-status" style="width:auto"><option value="">Semua status</option>
        <option value="aktif">Aktif</option><option value="calon">Calon</option>
        <option value="nonaktif">Nonaktif</option></select>
      <input id="f-kadus" placeholder="Dusun" style="width:130px">
      <input id="f-rt" placeholder="RT" style="width:80px">
      <input id="f-tps" placeholder="TPS" style="width:80px">
      ${canWrite ? '<button class="btn" id="add">Tambah Anggota</button>' : ""}
    </div>
    <div id="list"></div>
    <div class="bar" style="margin-top:14px;justify-content:space-between">
      <span class="hint" id="count"></span>
      <span><button class="btn sec sm" id="prev">Sebelumnya</button>
      <button class="btn sec sm" id="next">Berikutnya</button></span>
    </div>
  </section>

  <section id="v-rekap" class="hide">
    <div class="grid g2"><div class="card pad">
      <h3 style="font-size:15px;margin-bottom:12px">Sebaran per TPS</h3><div id="byTps"></div>
    </div></div>
  </section>

  <section id="v-laporan" class="hide">
    <div class="card pad" style="margin-bottom:16px">
      <h3 style="font-size:15px;margin-bottom:4px">1. Pilih jenis laporan</h3>
      <p class="hint" style="margin:0 0 14px">
        Setiap laporan memakai kop surat dari tab Pengaturan.
      </p>
      <div class="grid g2" id="jenis"></div>
    </div>

    <div class="card pad" style="margin-bottom:16px">
      <h3 style="font-size:15px;margin-bottom:14px">2. Saring kelompok</h3>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
        <div><label for="l-kadus">Dusun</label>
          <select id="l-kadus"><option value="">Semua dusun</option></select></div>
        <div><label for="l-rt">RT</label>
          <select id="l-rt"><option value="">Semua RT</option></select></div>
        <div><label for="l-tps">TPS</label>
          <select id="l-tps"><option value="">Semua TPS</option></select></div>
        <div><label for="l-jabatan">Jabatan</label>
          <select id="l-jabatan"><option value="">Semua jabatan</option></select></div>
        <div><label for="l-status">Status</label>
          <select id="l-status"><option value="">Semua status</option>
            <option value="aktif">Aktif</option><option value="calon">Calon</option>
            <option value="nonaktif">Nonaktif</option></select></div>
      </div>
      <p class="hint" style="margin-top:10px">
        Kosongkan semua saringan untuk mencetak seluruh anggota.
      </p>
    </div>

    <div class="card pad hide" id="kegiatanBox" style="margin-bottom:16px">
      <h3 style="font-size:15px;margin-bottom:14px">3. Keterangan kegiatan</h3>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
        <div><label for="l-kegiatan">Nama kegiatan</label>
          <input id="l-kegiatan" placeholder="Rapat konsolidasi"></div>
        <div><label for="l-tanggal">Hari / tanggal</label>
          <input id="l-tanggal" placeholder="Sabtu, 14 Maret 2026"></div>
        <div><label for="l-tempat">Tempat</label>
          <input id="l-tempat" placeholder="Balai Desa"></div>
      </div>
    </div>

    <div class="card pad">
      <h3 style="font-size:15px;margin-bottom:6px">Unduh</h3>
      <p class="hint" id="lapRingkas" style="margin:0 0 14px"></p>
      ${
        isAdmin
          ? `<label style="display:flex;align-items:center;gap:9px;font-weight:600;margin-bottom:14px">
        <input type="checkbox" id="l-nik" style="width:auto;margin:0">
        Sertakan NIK lengkap <span class="hint" style="margin:0;font-weight:400">— tindakan ini dicatat di log audit</span>
      </label>`
          : `<p class="note" style="margin-bottom:14px">NIK ditampilkan tersamar
        (empat digit terakhir). Hanya admin yang dapat mencetak NIK lengkap.</p>`
      }
      <label style="display:flex;align-items:center;gap:9px;font-weight:600;margin-bottom:14px">
        <input type="checkbox" id="l-simpan" style="width:auto;margin:0">
        Simpan salinan ke Arsip
        <span class="hint" style="margin:0;font-weight:400">— berkas yang sama ikut tersimpan di R2</span>
      </label>
      <div class="bar" style="margin:0">
        <a class="btn" id="dl-pdf">Unduh PDF</a>
        <a class="btn sec" id="dl-docx">Unduh Word</a>
        <a class="btn sec" id="dl-xlsx">Unduh Excel</a>
        <a class="btn sec" id="dl-csv">Unduh CSV</a>
        <a class="btn sec" id="dl-html" target="_blank" rel="noopener">Pratinjau &amp; Cetak</a>
      </div>
      <p class="hint" style="margin-top:12px">
        Word dan Excel dapat diedit sebelum ditandatangani. PDF dibuat di server,
        jadi hasilnya sama di HP maupun komputer.
      </p>
    </div>
  </section>

  ${
    isAdmin
      ? `<section id="v-pengaturan" class="hide">
    <div class="card pad" style="max-width:760px">
      <h3 style="font-size:15px;margin-bottom:4px">Identitas kop surat</h3>
      <p class="hint" style="margin:0 0 18px">
        Dipakai pada semua laporan yang dicetak dan diunduh.
      </p>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))" id="idForm"></div>
      <div class="bar" style="margin:18px 0 0">
        <button class="btn" id="saveId">Simpan Identitas</button>
      </div>
    </div>
  </section>`
      : ""
  }

  <section id="v-arsip" class="hide">
    <div class="note" style="margin-bottom:16px">
      Baris anggota disimpan di database D1 agar bisa dicari dan difilter.
      Cadangan dan ekspor disimpan di R2 — di situlah berkas besar menumpuk,
      bukan di database. Cadangan otomatis berjalan tiap malam.
    </div>
    <div class="bar">
      ${isAdmin ? '<button class="btn" id="snap">Cadangkan Sekarang</button>' : ""}
      <button class="btn sec" id="exp">Ekspor CSV</button>
      ${isAdmin ? '<button class="btn sec" id="expNik">Ekspor CSV + NIK</button>' : ""}
    </div>
    <div id="arsip"></div>
  </section>

  ${isAdmin ? '<section id="v-audit" class="hide"><div id="auditList"></div></section>' : ""}
</main>

<script>
"use strict";
const IS_ADMIN=${isAdmin}, CAN_WRITE=${canWrite};
const $=(s)=>document.querySelector(s);
const esc=(v)=>String(v==null?"":v).replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=(n)=>Number(n||0).toLocaleString("id-ID");

let page=1, perPage=25, total=0;

function toast(msg,bad){
  const el=document.createElement("div");
  el.className="toast"+(bad?" bad":""); el.textContent=msg;
  document.body.appendChild(el); setTimeout(()=>el.remove(),3200);
}

async function api(path,opts){
  const r=await fetch(path,Object.assign({headers:{"content-type":"application/json"}},opts||{}));
  if(r.status===401){location.href="/masuk";return null;}
  const d=await r.json().catch(()=>({}));
  if(!r.ok){throw new Error(d.error||(d.issues&&d.issues[0]&&d.issues[0].message)||"Permintaan gagal");}
  return d;
}

/* tabs */
document.querySelectorAll(".tab").forEach((t)=>{
  t.onclick=()=>{
    document.querySelectorAll(".tab").forEach((o)=>o.setAttribute("aria-selected",String(o===t)));
    document.querySelectorAll("main > section").forEach((s)=>s.classList.add("hide"));
    $("#v-"+t.dataset.v).classList.remove("hide");
    if(t.dataset.v==="arsip")loadArsip();
    if(t.dataset.v==="audit")loadAudit();
    if(t.dataset.v==="laporan"||t.dataset.v==="pengaturan")loadLaporan();
  };
});

/* dashboard */
async function loadDash(){
  const d=await api("/api/ringkasan"); if(!d)return;
  const s=d.summary.totals||{};
  $("#stats").innerHTML=[
    ["Total Anggota",s.total],["Aktif",s.aktif],["Calon",s.calon],
    ["Laki-laki",s.laki],["Perempuan",s.perempuan]
  ].map(([l,v])=>'<div class="card pad stat"><div class="n">'+num(v)+'</div><div class="l">'+l+"</div></div>").join("");

  const i=d.integrity;
  const rows=[["Tanpa nama",i.tanpaNama],["NIK tidak valid",i.nikTidakValid],
    ["Belum ada NIK",i.tanpaNik],["Belum ada TPS",i.tanpaTps]];
  $("#integrity").innerHTML=rows.map(([l,v])=>
    '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line)">'+
    '<span>'+l+'</span><b class="'+(v>0?"":"")+'" style="color:'+(v>0?"var(--danger)":"var(--ok)")+'">'+num(v)+"</b></div>").join("");

  const bar=(items,key)=>{
    if(!items.length)return '<p class="hint">Belum ada data.</p>';
    const max=Math.max.apply(null,items.map((x)=>x.n));
    return items.map((x)=>'<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">'+
      '<span>'+esc(x[key])+'</span><b>'+num(x.n)+'</b></div>'+
      '<div style="height:6px;background:var(--muted);border-radius:99px;overflow:hidden">'+
      '<div style="height:100%;width:'+((x.n/max)*100)+'%;background:var(--brand)"></div></div></div>').join("");
  };
  $("#byArea").innerHTML=bar(d.summary.byArea,"kadus");
  $("#byTps").innerHTML=bar(d.summary.byTps,"tps");
}

/* members */
function query(){
  const p=new URLSearchParams({page:page,perPage:perPage});
  const map={q:"#q",status:"#f-status",kadus:"#f-kadus",rt:"#f-rt",tps:"#f-tps"};
  for(const k in map){const v=($(map[k])||{}).value;if(v)p.set(k,v);}
  return p.toString();
}

async function loadList(){
  const d=await api("/api/anggota?"+query()); if(!d)return;
  total=d.total;
  $("#count").textContent=total?("Menampilkan "+((d.page-1)*d.perPage+1)+"–"+
    Math.min(d.page*d.perPage,total)+" dari "+num(total)):"Tidak ada data";
  $("#prev").disabled=d.page<=1; $("#next").disabled=d.page*d.perPage>=total;

  if(!d.rows.length){$("#list").innerHTML='<div class="empty">Belum ada anggota yang cocok.</div>';return;}

  $("#list").innerHTML='<div class="wrap"><table><thead><tr>'+
    "<th>Nama</th><th>NIK</th><th>Dusun / RT</th><th>TPS</th><th>Jabatan</th><th>Kontak</th><th>Status</th><th></th>"+
    "</tr></thead><tbody>"+d.rows.map((m)=>
      "<tr><td><b>"+esc(m.nama)+"</b>"+(m.jk?' <span class="hint">'+esc(m.jk)+"</span>":"")+"</td>"+
      '<td class="mono">'+(m.nik_last4?'••••••••••••'+esc(m.nik_last4)+
        (IS_ADMIN?' <button class="btn sec sm reveal" data-id="'+esc(m.id)+'">Lihat</button>':""):'<span class="hint">—</span>')+"</td>"+
      "<td>"+esc(m.kadus||"—")+(m.rt?" / RT "+esc(m.rt):"")+"</td>"+
      '<td class="num">'+esc(m.tps||"—")+"</td>"+
      "<td>"+esc(m.jabatan||"—")+"</td>"+
      '<td class="mono">'+esc(m.hp||"—")+"</td>"+
      '<td><span class="pill '+esc(m.status)+'">'+esc(m.status)+"</span></td>"+
      '<td style="text-align:right;white-space:nowrap">'+
        (CAN_WRITE?'<button class="btn sec sm edit" data-id="'+esc(m.id)+'">Ubah</button> ':"")+
        (IS_ADMIN?'<button class="btn sec sm del" data-id="'+esc(m.id)+'">Hapus</button>':"")+
      "</td></tr>").join("")+"</tbody></table></div>";

  document.querySelectorAll(".reveal").forEach((b)=>b.onclick=async()=>{
    try{const d=await api("/api/anggota/"+b.dataset.id+"/nik",{method:"POST"});
      b.parentNode.textContent=d.nik||"—"; toast("Pembukaan NIK dicatat di log audit.");
    }catch(e){toast(e.message,true);}
  });
  document.querySelectorAll(".edit").forEach((b)=>b.onclick=()=>openForm(
    d.rows.find((r)=>r.id===b.dataset.id)));
  document.querySelectorAll(".del").forEach((b)=>b.onclick=async()=>{
    if(!confirm("Hapus anggota ini? Data masih tersimpan di arsip."))return;
    try{await api("/api/anggota/"+b.dataset.id,{method:"DELETE"});toast("Dihapus.");loadList();loadDash();}
    catch(e){toast(e.message,true);}
  });
}

const FIELDS=[["nama","Nama Lengkap","text",1],["nik","NIK","text",0],
  ["jk","Jenis Kelamin","select",0],["tgl_lahir","Tanggal Lahir","date",0],
  ["kadus","Dusun","text",0],["rt","RT","text",0],["tps","TPS","text",0],
  ["jabatan","Jabatan","text",0],["hp","No. HP","text",0],
  ["status","Status","select2",0],["tgl_gabung","Tanggal Bergabung","date",0],
  ["perekrut","Perekrut","text",0],["alamat","Alamat","text",0],["catatan","Catatan","area",0]];

function openForm(row){
  const editing=!!row;
  const f=(k)=>esc(row&&row[k]!=null?row[k]:"");
  const ctl=(k,label,type,req)=>{
    let input;
    if(type==="select")input='<select name="jk"><option value="">—</option>'+
      ["L","P"].map((o)=>'<option value="'+o+'"'+(row&&row.jk===o?" selected":"")+">"+o+"</option>").join("")+"</select>";
    else if(type==="select2")input='<select name="status">'+
      ["aktif","calon","nonaktif"].map((o)=>'<option value="'+o+'"'+(row&&row.status===o?" selected":"")+">"+o+"</option>").join("")+"</select>";
    else if(type==="area")input='<textarea name="'+k+'" rows="2">'+f(k)+"</textarea>";
    else input='<input name="'+k+'" type="'+(type==="date"?"date":"text")+'" value="'+f(k)+'"'+(req?" required":"")+">";
    return '<div><label>'+label+(req?' <span style="color:var(--danger)">*</span>':"")+"</label>"+input+"</div>";
  };

  const veil=document.createElement("div"); veil.className="veil";
  veil.innerHTML='<div class="modal"><header><h3 style="font-size:16px">'+
    (editing?"Ubah Anggota":"Tambah Anggota")+'</h3><button class="x">&times;</button></header>'+
    '<div class="body"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">'+
    FIELDS.map((a)=>ctl(a[0],a[1],a[2],a[3])).join("")+"</div>"+
    (editing?'<p class="hint" style="margin-top:12px">NIK dikosongkan berarti tidak diubah bila sebelumnya terisi dan Anda bukan admin.</p>':"")+
    '<div class="err hide" id="formErr"></div></div>'+
    '<footer><button class="btn sec" id="cancel">Batal</button>'+
    '<button class="btn" id="save">Simpan</button></footer></div>';
  document.body.appendChild(veil);

  const close=()=>veil.remove();
  veil.querySelector(".x").onclick=close;
  veil.querySelector("#cancel").onclick=close;
  veil.onclick=(e)=>{if(e.target===veil)close();};

  veil.querySelector("#save").onclick=async()=>{
    const body={};
    veil.querySelectorAll("[name]").forEach((el)=>{body[el.name]=el.value;});
    try{
      if(editing)await api("/api/anggota/"+row.id,{method:"PUT",body:JSON.stringify(body)});
      else await api("/api/anggota",{method:"POST",body:JSON.stringify(body)});
      close(); toast("Tersimpan."); loadList(); loadDash();
    }catch(e){
      const box=veil.querySelector("#formErr");
      box.textContent=e.message; box.classList.remove("hide");
    }
  };
}

if(CAN_WRITE&&$("#add"))$("#add").onclick=()=>openForm(null);
$("#prev").onclick=()=>{if(page>1){page--;loadList();}};
$("#next").onclick=()=>{if(page*perPage<total){page++;loadList();}};
["#q","#f-kadus","#f-rt","#f-tps"].forEach((s)=>{
  let t; $(s).oninput=()=>{clearTimeout(t);t=setTimeout(()=>{page=1;loadList();},280);};
});
$("#f-status").onchange=()=>{page=1;loadList();};

/* archive */
// Rows are built from single-quoted fragments only, so the double quotes that
// belong to the HTML never have to be escaped. The previous version mixed both
// and closed a single-quoted string with a double quote, which took the whole
// inline script out with a syntax error.
async function loadArsip(){
  const d=await api('/api/arsip'); if(!d)return;
  if(!d.items.length){
    $('#arsip').innerHTML='<div class="empty">Belum ada cadangan atau ekspor.</div>';
    return;
  }
  const rows=d.items.map(function(o){
    const name=esc(o.key.split('/').pop());
    const href='/api/arsip/unduh?key='+encodeURIComponent(o.key);
    return '<tr>'
      +'<td class="mono">'+name+'</td>'
      +'<td>'+esc(o.kind)+'</td>'
      +'<td class="num">'+esc(o.rows)+'</td>'
      +'<td class="num">'+num(Math.round(o.size/1024))+' KB</td>'
      +'<td>'+new Date(o.uploaded).toLocaleString('id-ID')+'</td>'
      +'<td style="text-align:right"><a class="btn sec sm" href="'+href+'">Unduh</a></td>'
      +'</tr>';
  }).join('');
  $('#arsip').innerHTML='<div class="wrap"><table><thead><tr>'
    +'<th>Berkas</th><th>Jenis</th><th>Baris</th><th>Ukuran</th><th>Dibuat</th><th></th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}
if($('#snap'))$('#snap').onclick=async function(){
  try{const r=await api('/api/arsip/cadangkan',{method:'POST'});
    toast('Cadangan dibuat: '+r.rows+' baris.');loadArsip();}catch(e){toast(e.message,true);}
};
const doExport=async function(withNik){
  try{const r=await api('/api/arsip/ekspor',{method:'POST',body:JSON.stringify({includeNik:withNik})});
    toast('Ekspor siap: '+r.rows+' baris.');loadArsip();
    location.href='/api/arsip/unduh?key='+encodeURIComponent(r.key);
  }catch(e){toast(e.message,true);}
};
if($('#exp'))$('#exp').onclick=function(){doExport(false);};
if($('#expNik'))$('#expNik').onclick=function(){
  if(confirm('Ekspor ini memuat NIK lengkap dan tindakan ini dicatat. Lanjutkan?'))doExport(true);
};

/* reports */
// Single-quoted fragments throughout, so the double quotes that belong to the
// HTML never need escaping inside this inline script.
var LAP={jenis:'daftar',kinds:[],options:{},identity:{},loaded:false};

var ID_LABEL=[
  ['team','Nama tim'],['calon','Nama calon'],['periode','Periode'],
  ['desa','Desa'],['kecamatan','Kecamatan'],['kabupaten','Kabupaten'],
  ['motto','Motto / semboyan'],['ketua','Nama penandatangan'],
  ['jabatan_ttd','Jabatan penandatangan']
];

async function loadLaporan(){
  if(LAP.loaded){paintLaporan();return;}
  const d=await api('/api/laporan'); if(!d)return;
  LAP.kinds=d.kinds; LAP.options=d.options; LAP.identity=d.identity; LAP.loaded=true;

  const fill=function(sel,values,label){
    const el=$(sel); if(!el)return;
    el.innerHTML='<option value="">'+label+'</option>'+
      values.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join('');
  };
  fill('#l-kadus',LAP.options.kadus||[],'Semua dusun');
  fill('#l-rt',LAP.options.rt||[],'Semua RT');
  fill('#l-tps',LAP.options.tps||[],'Semua TPS');
  fill('#l-jabatan',LAP.options.jabatan||[],'Semua jabatan');

  if($('#idForm')){
    $('#idForm').innerHTML=ID_LABEL.map(function(p){
      return '<div><label for="id-'+p[0]+'">'+p[1]+'</label>'+
        '<input id="id-'+p[0]+'" data-k="'+p[0]+'" value="'+esc(LAP.identity[p[0]]||'')+'"></div>';
    }).join('');
  }

  paintLaporan();
}

function paintLaporan(){
  $('#jenis').innerHTML=LAP.kinds.map(function(k){
    const on=LAP.jenis===k.key;
    return '<button class="card pad" data-k="'+esc(k.key)+'" style="text-align:left;cursor:pointer;'+
      'border-color:'+(on?'var(--brand)':'var(--line)')+';'+
      'box-shadow:'+(on?'0 0 0 3px rgb(13 107 82/.16)':'var(--shadow)')+'">'+
      '<b style="display:block;font-size:14px;margin-bottom:4px">'+esc(k.title)+'</b>'+
      '<span class="hint" style="margin:0">'+esc(k.description)+'</span></button>';
  }).join('');

  document.querySelectorAll('#jenis [data-k]').forEach(function(b){
    b.onclick=function(){LAP.jenis=b.dataset.k;paintLaporan();};
  });

  $('#kegiatanBox').classList.toggle('hide',LAP.jenis!=='hadir');
  refreshLinks();
}

function lapQuery(format){
  const p=new URLSearchParams({jenis:LAP.jenis,format:format});
  [['kadus','#l-kadus'],['rt','#l-rt'],['tps','#l-tps'],
   ['jabatan','#l-jabatan'],['status','#l-status']].forEach(function(pair){
    const el=$(pair[1]); if(el&&el.value)p.set(pair[0],el.value);
  });
  if(LAP.jenis==='hadir'){
    [['kegiatan','#l-kegiatan'],['tanggal','#l-tanggal'],['tempat','#l-tempat']]
      .forEach(function(pair){
        const el=$(pair[1]); if(el&&el.value)p.set(pair[0],el.value);
      });
  }
  if($('#l-nik')&&$('#l-nik').checked)p.set('nik','1');
  if($('#l-simpan')&&$('#l-simpan').checked)p.set('simpan','1');
  if(format==='html')p.set('inline','1');
  return '/laporan/unduh?'+p.toString();
}

function refreshLinks(){
  ['pdf','docx','xlsx','csv','html'].forEach(function(f){
    const el=$('#dl-'+f); if(el)el.href=lapQuery(f);
  });
  const kind=LAP.kinds.filter(function(k){return k.key===LAP.jenis;})[0];
  const bits=[];
  [['Dusun','#l-kadus'],['RT','#l-rt'],['TPS','#l-tps'],
   ['Jabatan','#l-jabatan'],['Status','#l-status']].forEach(function(pair){
    const el=$(pair[1]); if(el&&el.value)bits.push(pair[0]+' '+el.value);
  });
  $('#lapRingkas').textContent=(kind?kind.title:'')+' — '+
    (bits.length?bits.join(', '):'seluruh anggota')+
    (($('#l-nik')&&$('#l-nik').checked)?' — memuat NIK lengkap':' — NIK disamarkan');
}

['#l-kadus','#l-rt','#l-tps','#l-jabatan','#l-status','#l-nik','#l-simpan',
 '#l-kegiatan','#l-tanggal','#l-tempat'].forEach(function(s){
  const el=$(s); if(!el)return;
  el.onchange=refreshLinks; el.oninput=refreshLinks;
});

if($('#saveId'))$('#saveId').onclick=async function(){
  const body={};
  document.querySelectorAll('#idForm [data-k]').forEach(function(el){
    body[el.dataset.k]=el.value;
  });
  try{
    const r=await api('/api/pengaturan',{method:'POST',body:JSON.stringify(body)});
    LAP.identity=r.identity; toast('Identitas tersimpan.');
  }catch(e){toast(e.message,true);}
};

/* audit */
async function loadAudit(){
  const d=await api('/api/audit'); if(!d)return;
  if(!d.items.length){
    $('#auditList').innerHTML='<div class="empty">Belum ada aktivitas.</div>';
    return;
  }
  const rows=d.items.map(function(a){
    return '<tr>'
      +'<td>'+new Date(a.created_at.replace(' ','T')+'Z').toLocaleString('id-ID')+'</td>'
      +'<td>'+esc(a.actor_email||'—')+'</td>'
      +'<td class="mono">'+esc(a.action)+'</td>'
      +'<td>'+esc(a.summary||'')+'</td>'
      +'</tr>';
  }).join('');
  $('#auditList').innerHTML='<div class="wrap"><table><thead><tr>'
    +'<th>Waktu</th><th>Pelaku</th><th>Aksi</th><th>Keterangan</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

loadDash(); loadList();
</script>
</body></html>`;
}
