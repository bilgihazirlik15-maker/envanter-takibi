import { env } from "cloudflare:workers";

type Payload = { action?: string; barcode?: string; type?: string; name?: string; person?: string; note?: string; reason?: string };

const typePrefixes: Record<string, string> = { "Flash Disk": "FD", "Ses Kayıt Cihazı": "SR", "Kamera": "KM" };

async function ensureSchema() {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS items (
      barcode TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN', holder TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, removed INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, time TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      barcode TEXT NOT NULL, item_name TEXT NOT NULL, action TEXT NOT NULL,
      person TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT ''
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS items_type_idx ON items(type, removed)"),
    db.prepare("CREATE INDEX IF NOT EXISTS movements_time_idx ON movements(time DESC)"),
  ]);
}

async function readData() {
  const [itemResult, movementResult] = await env.DB.batch([
    env.DB.prepare(`SELECT barcode, type, name, status, holder, updated_at AS updatedAt
      FROM items WHERE removed = 0 ORDER BY type, barcode`),
    env.DB.prepare(`SELECT id, time, barcode, item_name AS itemName, action, person, note
      FROM movements ORDER BY id DESC LIMIT 200`),
  ]);
  const items = itemResult.results;
  const nextNumbers: Record<string, number> = { FD: 1, SR: 1, KM: 1 };
  for (const item of items) {
    const barcode = String(item.barcode);
    const prefix = barcode.slice(0, 2);
    const number = Number(barcode.slice(2));
    if (prefix in nextNumbers && number >= nextNumbers[prefix]) nextNumbers[prefix] = number + 1;
  }
  return { items, movements: movementResult.results, nextNumbers };
}

export async function GET() {
  try { await ensureSchema(); return Response.json(await readData()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Veritabanı hatası" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = await request.json() as Payload;
    const now = new Date().toISOString();
    if (payload.action === "add") {
      const type = payload.type?.trim() || "";
      const prefix = typePrefixes[type];
      if (!prefix) return bad("Geçerli bir ürün türü seçin.");
      const row = await env.DB.prepare("SELECT barcode FROM items WHERE barcode LIKE ? ORDER BY CAST(SUBSTR(barcode, 3) AS INTEGER) DESC LIMIT 1").bind(`${prefix}%`).first<{ barcode: string }>();
      const number = row ? Number(row.barcode.slice(2)) + 1 : 1;
      const barcode = prefix + String(number).padStart(3, "0");
      const name = payload.name?.trim() || `${type} ${number}`;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO items (barcode,type,name,status,holder,updated_at,removed) VALUES (?,?,?,'IN','',?,0)").bind(barcode, type, name, now),
        env.DB.prepare("INSERT INTO movements (time,barcode,item_name,action,person,note) VALUES (?,?,?,'ADD','Hazırlık Programı','Envantere eklendi')").bind(now, barcode, name),
      ]);
      return ok(`${barcode} ortak envantere eklendi.`);
    }
    if (payload.action === "scan") {
      const barcode = payload.barcode?.trim().toUpperCase() || "";
      const item = await env.DB.prepare("SELECT barcode,name,status FROM items WHERE barcode = ? AND removed = 0").bind(barcode).first<{ barcode: string; name: string; status: string }>();
      if (!item) return bad("Barkod ortak envanterde bulunamadı.");
      const nextStatus = item.status === "IN" ? "OUT" : "IN";
      const person = payload.person?.trim() || "";
      if (nextStatus === "OUT" && !person) return bad("Çıkış için teslim alanı girin.");
      const holder = nextStatus === "OUT" ? person : "";
      await env.DB.batch([
        env.DB.prepare("UPDATE items SET status=?, holder=?, updated_at=? WHERE barcode=?").bind(nextStatus, holder, now, barcode),
        env.DB.prepare("INSERT INTO movements (time,barcode,item_name,action,person,note) VALUES (?,?,?,?,?,?)").bind(now, barcode, item.name, nextStatus, person || "Hazırlık Programı", payload.note?.trim() || ""),
      ]);
      return ok(nextStatus === "OUT" ? `${barcode} teslim edildi.` : `${barcode} iade alındı.`);
    }
    if (payload.action === "remove") {
      const barcode = payload.barcode?.trim().toUpperCase() || "";
      const reason = payload.reason?.trim() || "";
      if (!reason) return bad("Envanterden çıkarma gerekçesi girin.");
      const item = await env.DB.prepare("SELECT name FROM items WHERE barcode=? AND removed=0").bind(barcode).first<{ name: string }>();
      if (!item) return bad("Ürün bulunamadı.");
      await env.DB.batch([
        env.DB.prepare("UPDATE items SET removed=1, updated_at=? WHERE barcode=?").bind(now, barcode),
        env.DB.prepare("INSERT INTO movements (time,barcode,item_name,action,person,note) VALUES (?,?,?,'REMOVE','Hazırlık Programı',?)").bind(now, barcode, item.name, reason),
      ]);
      return ok(`${barcode} envanterden çıkarıldı.`);
    }
    return bad("Geçersiz işlem.");
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Veritabanı hatası" }, { status: 500 });
  }
}

function bad(error: string) { return Response.json({ error }, { status: 400 }); }
async function ok(message: string) { return Response.json({ message, data: await readData() }); }
