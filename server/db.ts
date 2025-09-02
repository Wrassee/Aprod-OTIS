// server/db.ts
// ------------------------------------------------------------
// 1️⃣ Imports
// ------------------------------------------------------------
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import Database from "better-sqlite3";
import ws from "ws";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

import * as schema from "../shared/schema.js";

import path from "node:path";
import fs from "node:fs";

// ------------------------------------------------------------
// 2️⃣ Re-export schema tables and types
// ------------------------------------------------------------

// Táblák exportálása
export const { protocols, templates, questionConfigs } = schema;

// Típusok exportálása - ezeket hiányolta a storage.ts
export type Protocol = InferSelectModel<typeof protocols>;
export type InsertProtocol = InferInsertModel<typeof protocols>;
export type Template = InferSelectModel<typeof templates>;
export type InsertTemplate = InferInsertModel<typeof templates>;
export type QuestionConfig = InferSelectModel<typeof questionConfigs>;
export type InsertQuestionConfig = InferInsertModel<typeof questionConfigs>;

// ------------------------------------------------------------
// 3️⃣ DB típusdefiníciók és inicializálás
// ------------------------------------------------------------

type SqliteDb = ReturnType<typeof drizzleSqlite>;
type NeonDb = ReturnType<typeof drizzleNeon>;
type DbType = SqliteDb | NeonDb;

let db: DbType;
let testConnectionFn: () => Promise<boolean>;

// ------------------------------------------------------------
// 4️⃣ Production – Neon PostgreSQL (Render / Vercel / Railway)
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
  db = drizzleNeon(pool, { schema });

  // egyszerű "SELECT 1" health‑check
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
// 5️⃣ Development – SQLite (local)
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
  db = drizzleSqlite(sqlite, { schema });

  // egyszerű "SELECT 1" health‑check
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
// 6️⃣ Database utilities
// ------------------------------------------------------------

/**
 * Type guard to check if db is PostgreSQL
 */
export function isPostgresDb(database: DbType): database is NeonDb {
  return process.env.NODE_ENV === "production";
}

/**
 * Type guard to check if db is SQLite
 */
export function isSqliteDb(database: DbType): database is SqliteDb {
  return process.env.NODE_ENV !== "production";
}

// ------------------------------------------------------------
// 7️⃣ Exportálás
// ------------------------------------------------------------
export { db };
export const testConnection = testConnectionFn;