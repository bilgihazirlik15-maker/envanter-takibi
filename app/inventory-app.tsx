"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Item = { barcode: string; type: string; name: string; status: "IN" | "OUT"; holder: string; updatedAt: string };
type Movement = { id: number; time: string; barcode: string; itemName: string; action: string; person: string; note: string };
type Data = { items: Item[]; movements: Movement[]; nextNumbers: Record<string, number> };

const TYPES = [
  { label: "Flash Disk", prefix: "FD" },
  { label: "Ses Kayıt Cihazı", prefix: "SR" },
  { label: "Kamera", prefix: "KM" },
];

const emptyData: Data = { items: [], movements: [], nextNumbers: { FD: 1, SR: 1, KM: 1 } };

export default function InventoryApp() {
  const [view, setView] = useState("inventory");
  const [data, setData] = useState<Data>(emptyData);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/inventory", { cache: "no-store" });
    if (!response.ok) throw new Error("Envanter yüklenemedi.");
    setData(await response.json());
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [refresh]);

  async function act(payload: Record<string, unknown>) {
    setMessage(""); setError("");
    const response = await fetch("/api/inventory", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "İşlem yapılamadı."); return false; }
    setData(result.data); setMessage(result.message); return true;
  }

  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase("tr");
    return data.items.filter((i) => [i.barcode, i.type, i.name, i.holder].join(" ").toLocaleLowerCase("tr").includes(q));
  }, [data.items, query]);

  const counts = {
    flash: data.items.filter((i) => i.type === "Flash Disk").length,
    recorder: data.items.filter((i) => i.type === "Ses Kayıt Cihazı").length,
    camera: data.items.filter((i) => i.type === "Kamera").length,
    out: data.items.filter((i) => i.status === "OUT").length,
  };

  if (loading) return <div className="loading">Ortak envanter yükleniyor…</div>;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">B</div><div><h1>Envanter Takibi</h1><p>Hazırlık Programı</p></div></div>
        <nav className="nav" aria-label="Bölümler">
          {[
            ["inventory", "Envanter"], ["scan", "Giriş / Çıkış"], ["manage", "Ürün Yönetimi"], ["movements", "Hareketler"],
          ].map(([id, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setMessage(""); setError(""); }}>{label}</button>)}
        </nav>
      </aside>
      <main className="main">
        <header className="page-head"><div><div className="eyebrow">İstanbul Bilgi Üniversitesi</div><h2>Ortak Envanter</h2></div><div className="sync">● Tüm tarayıcılarla eşitleniyor</div></header>
        <section className="metrics">
          <Metric label="Flash Disk" value={counts.flash} />
          <Metric label="Ses Kayıt Cihazı" value={counts.recorder} />
          <Metric label="Kamera" value={counts.camera} />
          <Metric label="Dışarıda" value={counts.out} />
        </section>

        <section className={`panel ${view === "inventory" ? "active" : ""}`}>
          <div className="card"><h3>Envanter</h3><p>Merkezi veritabanındaki tüm aktif ürünler.</p>
            <div className="toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Barkod, tür, ürün veya kişi ara" /></div>
            <div className="table-wrap"><table><thead><tr><th>Barkod</th><th>Tür</th><th>Ürün</th><th>Durum</th><th>Kimde</th><th>Son işlem</th></tr></thead>
              <tbody>{filtered.map((i) => <tr key={i.barcode}><td><strong>{i.barcode}</strong></td><td>{i.type}</td><td>{i.name}</td><td><span className={`badge ${i.status === "IN" ? "in" : "out"}`}>{i.status === "IN" ? "Stokta" : "Dışarıda"}</span></td><td>{i.holder || "Hazır"}</td><td>{formatDate(i.updatedAt)}</td></tr>)}
              {!filtered.length && <tr><td colSpan={6}>Kayıt bulunamadı.</td></tr>}</tbody></table></div>
          </div>
        </section>

        <section className={`panel ${view === "scan" ? "active" : ""}`}>
          <ScanForm act={act} />
        </section>

        <section className={`panel ${view === "manage" ? "active" : ""}`}>
          <div className="split"><AddForm nextNumbers={data.nextNumbers} act={act} /><RemoveForm items={data.items} act={act} /></div>
        </section>

        <section className={`panel ${view === "movements" ? "active" : ""}`}>
          <div className="card"><h3>Hareket Geçmişi</h3><p>En son 200 envanter işlemi.</p>
            <div className="table-wrap"><table><thead><tr><th>Tarih</th><th>Barkod</th><th>Ürün</th><th>İşlem</th><th>Kişi</th><th>Not</th></tr></thead>
              <tbody>{data.movements.map((m) => <tr key={m.id}><td>{formatDate(m.time)}</td><td><strong>{m.barcode}</strong></td><td>{m.itemName}</td><td>{actionLabel(m.action)}</td><td>{m.person}</td><td>{m.note || "—"}</td></tr>)}
              {!data.movements.length && <tr><td colSpan={6}>Henüz hareket yok.</td></tr>}</tbody></table></div>
          </div>
        </section>
        {(message || error) && <div className={`message ${error ? "error" : ""}`} role="status">{error || message}</div>}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <article className="metric"><span>{label}</span><strong>{value}</strong></article>; }

function ScanForm({ act }: { act: (p: Record<string, unknown>) => Promise<boolean> }) {
  const [barcode, setBarcode] = useState(""); const [person, setPerson] = useState(""); const [note, setNote] = useState("");
  async function submit(e: FormEvent) { e.preventDefault(); if (await act({ action: "scan", barcode, person, note })) { setBarcode(""); setNote(""); } }
  return <form className="card" onSubmit={submit}><h3>Barkod ile giriş / çıkış</h3><p>Stoktaki ürünü çıkarırken teslim alan zorunludur. Dışarıdaki ürün okutulunca iade alınır.</p>
    <div className="form-grid"><div className="field"><label>Barkod</label><input required autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value.toUpperCase())} placeholder="SR001" /></div><div className="field"><label>Teslim alan / iade eden</label><input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Ad soyad" /></div><div className="field"><label>Not</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="İsteğe bağlı" /></div></div><div style={{marginTop:14}}><button className="primary">Kaydet</button></div>
  </form>;
}

function AddForm({ nextNumbers, act }: { nextNumbers: Record<string, number>; act: (p: Record<string, unknown>) => Promise<boolean> }) {
  const [type, setType] = useState(TYPES[0].label); const [name, setName] = useState("");
  const prefix = TYPES.find((t) => t.label === type)!.prefix; const barcode = prefix + String(nextNumbers[prefix] || 1).padStart(3, "0");
  async function submit(e: FormEvent) { e.preventDefault(); if (await act({ action: "add", type, name })) setName(""); }
  return <form className="card" onSubmit={submit}><h3>Envantere ekle</h3><p>Yeni ürün ortak envantere anında eklenir.</p><div className="field"><label>Tür</label><select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t.prefix}>{t.label}</option>)}</select></div><div className="field" style={{marginTop:12}}><label>Sıradaki barkod</label><input readOnly value={barcode} /></div><div className="field" style={{marginTop:12}}><label>Ürün adı</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${type} ${nextNumbers[prefix] || 1}`} /></div><button className="primary" style={{marginTop:14}}>Ürünü ekle</button></form>;
}

function RemoveForm({ items, act }: { items: Item[]; act: (p: Record<string, unknown>) => Promise<boolean> }) {
  const [barcode, setBarcode] = useState(""); const [reason, setReason] = useState("");
  useEffect(() => { if (!barcode && items[0]) setBarcode(items[0].barcode); }, [items, barcode]);
  async function submit(e: FormEvent) { e.preventDefault(); if (await act({ action: "remove", barcode, reason })) setReason(""); }
  return <form className="card" onSubmit={submit}><h3>Envanterden çıkar</h3><p>Kayıt silinmez; gerekçesiyle hareket geçmişine alınır.</p><div className="field"><label>Ürün</label><select required value={barcode} onChange={(e) => setBarcode(e.target.value)}>{items.map((i) => <option key={i.barcode} value={i.barcode}>{i.barcode} — {i.name}</option>)}</select></div><div className="field" style={{marginTop:12}}><label>Gerekçe</label><input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Arızalı, kayıp, kullanım dışı…" /></div><button className="danger" style={{marginTop:14}}>Envanterden çıkar</button></form>;
}

function formatDate(value: string) { return value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value)) : "—"; }
function actionLabel(value: string) { return ({ ADD: "Eklendi", OUT: "Çıkış", IN: "İade", REMOVE: "Çıkarıldı" } as Record<string, string>)[value] || value; }
