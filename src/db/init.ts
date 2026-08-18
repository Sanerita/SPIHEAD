// src/db/init.ts
import { sql, isDatabaseConnected, getDbStatus, testConnection } from './index.js';

// ============================================
// TABLE DEFINITIONS
// ============================================

const TABLES = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'User',
      auth_role TEXT DEFAULT 'User',
      company TEXT,
      password_hash TEXT,
      job_title TEXT,
      department TEXT,
      selected_plan TEXT DEFAULT 'free',
      company_size TEXT,
      ip_address TEXT,
      mfa_enabled BOOLEAN DEFAULT false,
      pin_code TEXT,
      last_login_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP,
      last_password_change TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `,

  leads: `
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
      tags JSONB,
      m365_synced BOOLEAN DEFAULT false,
      last_contacted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `,

  oauth_tokens: `
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      provider TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMP NOT NULL,
      scope TEXT,
      token_type TEXT DEFAULT 'Bearer',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `,

  meetings: `
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
      meeting_link TEXT,
      calendar_event_id TEXT,
      reminder_sent BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `,

  activities: `
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      lead_id TEXT,
      lead_name TEXT,
      metadata JSONB,
      timestamp TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,

  sessions: `
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TIMESTAMP NOT NULL,
      is_valid BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `,

  email_logs: `
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      lead_id TEXT,
      to TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT,
      status TEXT DEFAULT 'sent',
      sent_at TIMESTAMP DEFAULT NOW(),
      opened_at TIMESTAMP,
      clicked_at TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,

  api_keys: `
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      last_used_at TIMESTAMP,
      expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      permissions JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `,

  audit_logs: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      resource_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      details JSONB,
      severity TEXT DEFAULT 'info',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,

  subscriptions: `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      plan TEXT DEFAULT 'free',
      status TEXT DEFAULT 'active',
      seats INTEGER DEFAULT 1,
      ai_credits INTEGER DEFAULT 150,
      ai_credits_used INTEGER DEFAULT 0,
      billing_interval TEXT DEFAULT 'monthly',
      trial_ends_at TIMESTAMP,
      next_billing_at TIMESTAMP,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `,

  invoices: `
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subscription_id TEXT,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'pending',
      stripe_invoice_id TEXT,
      stripe_payment_intent_id TEXT,
      paid_at TIMESTAMP,
      due_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `,
};

// ============================================
// INDEX DEFINITIONS
// ============================================

const INDEXES = [
  // Users indexes
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`,
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);`,
  `CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);`,

  // Leads indexes
  `CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);`,
  `CREATE INDEX IF NOT EXISTS idx_leads_company ON leads (company);`,
  `CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);`,

  // OAuth Tokens indexes
  `CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_provider ON oauth_tokens (user_email, provider);`,
  `CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens (expires_at);`,

  // Meetings indexes
  `CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_meetings_lead_id ON meetings (lead_id);`,
  `CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings (date);`,

  // Activities indexes
  `CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities (lead_id);`,
  `CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities (timestamp);`,

  // Sessions indexes
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);`,

  // Email Logs indexes
  `CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_email_logs_lead_id ON email_logs (lead_id);`,

  // API Keys indexes
  `CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys (key);`,

  // Audit Logs indexes
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);`,

  // Subscriptions indexes
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);`,

  // Invoices indexes
  `CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);`,
];

// ============================================
// MAIN INITIALIZATION FUNCTION
// ============================================

export async function initDbTables(): Promise<boolean> {
  console.log('📦 [DB] Starting database initialization...');

  // 1. Check if database is available
  if (!isDatabaseConnected) {
    const status = getDbStatus();
    console.warn('⚠️ [DB] Skipping table initialization: Database not connected');
    console.warn(`   Status: ${JSON.stringify(status, null, 2)}`);
    return false;
  }

  // 2. Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ [DB] No DATABASE_URL set, skipping table initialization.');
    return false;
  }

  // 3. Test connection
  console.log('🔍 [DB] Testing database connection...');
  const connected = await testConnection();
  if (!connected) {
    console.warn('⚠️ [DB] Connection test failed, skipping initialization.');
    return false;
  }

  console.log('✅ [DB] Connection verified, creating tables...');

  try {
    // 4. Create all tables
    console.log('📦 [DB] Creating tables...');
    let createdCount = 0;
    
    for (const [tableName, createSQL] of Object.entries(TABLES)) {
      try {
        // ✅ FIX: Use template literal with sql
        await sql`${createSQL}`;
        console.log(`   ✅ Table "${tableName}" created/verified`);
        createdCount++;
      } catch (error) {
        console.warn(`   ⚠️ Error creating table "${tableName}":`, error);
      }
    }
    console.log(`📦 [DB] ${createdCount}/${Object.keys(TABLES).length} tables processed`);

    // 5. Create indexes
    console.log('📦 [DB] Creating indexes...');
    let indexCount = 0;
    
    for (const indexSQL of INDEXES) {
      try {
        // ✅ FIX: Use template literal with sql
        await sql`${indexSQL}`;
        indexCount++;
      } catch (error) {
        console.warn(`   ⚠️ Error creating index:`, error);
      }
    }
    console.log(`📦 [DB] ${indexCount}/${INDEXES.length} indexes processed`);

    console.log('✅ [DB] Database initialization complete!');
    return true;
  } catch (err) {
    console.error('❌ [DB] Table initialization error:', err);
    return false;
  }
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkDbHealth(): Promise<{
  connected: boolean;
  tables: Record<string, boolean>;
  timestamp: string;
}> {
  const result = {
    connected: false,
    tables: {} as Record<string, boolean>,
    timestamp: new Date().toISOString(),
  };

  if (!isDatabaseConnected || !sql) {
    return result;
  }

  result.connected = true;

  // Check each table
  for (const tableName of Object.keys(TABLES)) {
    try {
      const query = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${tableName}
        )
      `;
      result.tables[tableName] = query[0]?.exists || false;
    } catch (error) {
      result.tables[tableName] = false;
    }
  }

  return result;
}

// ============================================
// EXPORTS
// ============================================

export default {
  initDbTables,
  checkDbHealth,
  TABLES,
  INDEXES,
};
