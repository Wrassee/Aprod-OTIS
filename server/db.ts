import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import Database from 'better-sqlite3';
import ws from "ws";
import * as schema from "../shared/schema.js";
import path from 'path';
import fs from 'fs';

// Típus definíciók
type DbType = ReturnType<typeof drizzleSqlite> | ReturnType<typeof drizzleNeon>;

let db: DbType;
let connectionTest: () => Promise<boolean>;

// Production környezet (Render/Vercel)
if (process.env.NODE_ENV === 'production') {
  console.log('Database: Initializing Neon (PostgreSQL) connection for production...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set for production.");
  }

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon(pool, { schema }) as DbType;

  connectionTest = async () => {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection successful (Neon)');
      return true;
    } catch (err) {
      console.error('Database connection failed (Neon):', err);
      return false;
    }
  };
} else {
  // Development környezet (Localhost)
  console.log('Database: Initializing SQLite for local development...');
  
  const dbPath = path.join(process.cwd(), 'data', 'otis_aprod.db');
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  db = drizzleSqlite(sqlite, { schema }) as DbType;

  connectionTest = async () => {
    try {
      sqlite.prepare('SELECT 1').get();
      console.log('Database connection successful (SQLite)');
      return true;
    } catch (err) {
      console.error('Database connection failed (SQLite):', err);
      return false;
    }
  };
}

export { db };
export const testConnection = connectionTest;