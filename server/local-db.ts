import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import path from 'path';
import fs from 'fs';

// Create data directory if it doesn't exist
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database in the data directory
const dbPath = path.join(dataDir, 'otis-aprod.db');

// Initialize SQLite database
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent access
sqlite.pragma('journal_mode = WAL');

// Create database instance with schema
export const db = drizzle(sqlite, { schema });

// Test database connection
export async function testConnection() {
  try {
    // Simple query to test connection
    const result = sqlite.prepare('SELECT 1 as test').get();
    console.log('Local SQLite database connection successful');
    return true;
  } catch (err) {
    console.error('Local database connection failed:', err);
    return false;
  }
}

// Initialize database tables
export function initializeTables() {
  try {
    // Create templates table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        language TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create protocols table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS protocols (
        id TEXT PRIMARY KEY,
        answers TEXT,
        errors TEXT,
        signature_data TEXT,
        signature_name TEXT,
        reception_date TEXT,
        language TEXT DEFAULT 'hu',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create question_configs table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS question_configs (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        cell_reference TEXT,
        language TEXT DEFAULT 'hu',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Local database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
}

// Export sqlite instance for direct queries if needed
export { sqlite };