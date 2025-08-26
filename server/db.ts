import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "../shared/schema.js";
import path from 'path';

// Create SQLite database file
const dbPath = path.join(process.cwd(), 'data', 'otis_aprod.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

console.log('Database: SQLite initialized at', dbPath);

// Test database connection and create tables
export async function testConnection() {
  try {
    // Create tables if they don't exist
    console.log('Creating database tables if they do not exist...');
    
    // Create protocols table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS protocols (
        id TEXT PRIMARY KEY,
        reception_date TEXT NOT NULL,
        language TEXT NOT NULL,
        answers TEXT NOT NULL DEFAULT '{}',
        errors TEXT NOT NULL DEFAULT '[]',
        signature TEXT,
        signature_name TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    
    // Create templates table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'multilingual',
        uploaded_at INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0
      )
    `);
    
    // Create question_configs table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS question_configs (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES templates(id),
        question_id TEXT NOT NULL,
        title TEXT NOT NULL,
        title_hu TEXT,
        title_de TEXT,
        type TEXT NOT NULL,
        required INTEGER NOT NULL DEFAULT 1,
        placeholder TEXT,
        cell_reference TEXT,
        sheet_name TEXT DEFAULT 'Sheet1',
        multi_cell INTEGER NOT NULL DEFAULT 0,
        group_name TEXT,
        group_name_de TEXT,
        group_order INTEGER DEFAULT 0,
        unit TEXT,
        min_value INTEGER,
        max_value INTEGER,
        calculation_formula TEXT,
        calculation_inputs TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    
    console.log('Database tables created successfully');
    console.log('Database connection successful');
    return true;
  } catch (err) {
    console.error('Database initialization failed:', err);
    return false;
  }
}