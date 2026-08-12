import { sql } from './index';

export async function initDbTables() {
  if (!process.env.DATABASE_URL) {
    console.warn("No DATABASE_URL set, skipping DB table initialization.");
    return;
  }
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        company TEXT,
        password_hash TEXT,
        job_title TEXT,
        department TEXT,
        selected_plan TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        budget INTEGER DEFAULT 0,
        status TEXT DEFAULT 'New',
        score INTEGER DEFAULT 50,
        urgency BOOLEAN DEFAULT false,
        engagement INTEGER DEFAULT 1,
        reply_count INTEGER DEFAULT 0,
        notes TEXT,
        industry TEXT,
        tags TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Migration queries for existing tables missing new columns
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_plan TEXT;`;

    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id TEXT;`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget INTEGER DEFAULT 0;`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'New';`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 50;`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS urgency BOOLEAN DEFAULT false;`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS engagement INTEGER DEFAULT 1;`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry TEXT;`;
    await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT;`;

    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS user_id TEXT;`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS lead_id TEXT;`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS lead_name TEXT;`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS lead_email TEXT;`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Scheduled';`;
    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS teams_join_url TEXT;`;

    await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_id TEXT;`;
    await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS lead_id TEXT;`;
    await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS lead_name TEXT;`;

    await sql`
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        lead_id TEXT,
        title TEXT NOT NULL,
        lead_name TEXT,
        lead_email TEXT,
        date TEXT,
        time TEXT,
        duration INTEGER DEFAULT 30,
        status TEXT DEFAULT 'Scheduled',
        notes TEXT,
        teams_join_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        lead_id TEXT,
        lead_name TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `;

    console.log("Neon Postgres tables initialized and ready.");
  } catch (err) {
    console.warn("DB table initialization warning:", err);
  }
}
