// server/db.ts
// ------------------------------------------------------------
// 1️⃣ Imports – mindegyik relatív útvonal .js‑kiterjesztéssel
// ------------------------------------------------------------
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import Database from "better-sqlite3";
import ws from "ws";

import * as schema from "../shared/schema.js";

import path from "node:path";
import fs from "node:fs";

// ------------------------------------------------------------
// 2️⃣ DB típusdefiníciók
// ------------------------------------------------------------
type DbType = ReturnType<typeof drizzleSqlite> | ReturnType<typeof drizzleNeon>;

let db: DbType;
// a helyi változó más néven, hogy ne ütközzön az exporttal
let testConnectionFn: () => Promise<boolean>;

// ------------------------------------------------------------
// 3️⃣ Production – Neon PostgreSQL (Render / Vercel / Railway)
// ------------------------------------------------------------
if (process.env.NODE_ENV === "production") {
  console.log("🔧 Initializing Neon (PostgreSQL) connection – production mode");

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL environment variable is required in production."
    );
  }

  // Neon‑driver WebSocket‑megoldás (Supabase‑barát)
  neonConfig.webSocketConstructor = ws;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Drizzle‑Postgres‑adapter
  db = drizzleNeon(pool, { schema }) as DbType;

  // egyszerű “SELECT 1” health‑check
  testConnectionFn = async () => {
    try {
      await pool.query("SELECT 1");
      console.log("✅ Neon connection OK");
      return true;
    } catch (err) {
      console.error("❌ Neon connection failed:", err);
      return false;
    }
  };
}

// ------------------------------------------------------------
// 4️⃣ Development – SQLite (local)
// ------------------------------------------------------------
else {
  console.log("🔧 Initializing SQLite – development mode");

  // adatbázis‑fájl helye: <projectRoot>/data/otis_aprod.db
  const dbPath = path.join(process.cwd(), "data", "otis_aprod.db");
  const dataDir = path.dirname(dbPath);

  // biztosítjuk, hogy a `data` mappa létezik
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  // write‑ahead‑logging – a SQLite‑t gyorsabbá és biztonságosabbá teszi
  sqlite.pragma("journal_mode = WAL");

  // Drizzle‑SQLite‑adapter
  db = drizzleSqlite(sqlite, { schema }) as DbType;

  // egyszerű “SELECT 1” health‑check
  testConnectionFn = async () => {
    try {
      sqlite.prepare("SELECT 1").get();
      console.log("✅ SQLite connection OK");
      return true;
    } catch (err) {
      console.error("❌ SQLite connection failed:", err);
      return false;
    }
  };
}

// ------------------------------------------------------------
// 5️⃣ Exportálás – a többi modul könnyen importálhatja
// ------------------------------------------------------------
export { db };
// a változó neve most már **testConnection**, a belső változó **testConnectionFn**
export const testConnection = testConnectionFn;