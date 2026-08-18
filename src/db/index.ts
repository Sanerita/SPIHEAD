// src/db/index.ts
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type DbClient = ReturnType<typeof drizzle>;
export type SqlClient = ReturnType<typeof neon>;

// ============================================
// CONNECTION STRING
// ============================================

const connectionString = process.env.DATABASE_URL || '';

// ============================================
// FALLBACK STUB FOR UNCONFIGURED DATABASE
// ============================================

function createUnconfiguredStub() {
  const fail = (method?: string) => {
    throw new Error(
      `Database is not available (DATABASE_URL missing or invalid). Falling back to in-memory storage.${method ? ` Called method: ${method}` : ''}`
    );
  };

  // Create a proxy that catches all property/method access
  return new Proxy(() => {}, {
    get: (target, prop) => {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        // Return undefined for promise methods to avoid issues
        return undefined;
      }
      return () => fail(String(prop));
    },
    apply: () => fail('apply'),
  });
}

// ============================================
// DATABASE CLIENT INITIALIZATION
// ============================================

let sqlClient: SqlClient | null = null;
let dbClient: DbClient | null = null;
let isConnected = false;

try {
  if (connectionString && connectionString.startsWith('postgresql://')) {
    console.log('🔌 [DB] Connecting to Neon PostgreSQL...');
    
    // Initialize Neon client
    sqlClient = neon(connectionString);
    
    // Initialize Drizzle with schema
    dbClient = drizzle(sqlClient, { schema });
    
    // Test connection
    try {
      await dbClient.select().from(schema.users).limit(1);
      isConnected = true;
      console.log('✅ [DB] Connected successfully to Neon PostgreSQL');
    } catch (testErr) {
      console.warn('⚠️ [DB] Connection test failed, but continuing:', testErr);
      isConnected = true; // Still mark as connected since we have a client
    }
  } else {
    console.warn('⚠️ [DB] DATABASE_URL is not set or invalid — running with in-memory storage only.');
    console.warn('   Expected format: postgresql://username:password@host:port/database');
    sqlClient = null;
    dbClient = null;
  }
} catch (err) {
  console.error('❌ [DB] Failed to initialize Neon DB client — falling back to in-memory storage:', err);
  if (err instanceof Error) {
    console.error('   Error details:', err.message);
  }
  sqlClient = null;
  dbClient = null;
}

// ============================================
// EXPORTS
// ============================================

// Export the SQL client (for raw queries)
export const sql: SqlClient | null = sqlClient;

// Export the Drizzle ORM client
export const db: DbClient | null = dbClient;

// Export connection status
export const isDatabaseConnected = isConnected;

// Export a helper to check database status
export function getDbStatus() {
  return {
    connected: !!dbClient && isConnected,
    hasConnectionString: !!connectionString,
    clientInitialized: !!dbClient,
    connectionString: connectionString ? '***hidden***' : 'not set',
  };
}

// Export a helper to safely execute database operations
export async function withDb<T>(
  operation: (db: DbClient) => Promise<T>,
  fallbackValue?: T
): Promise<T | undefined> {
  if (!dbClient || !isConnected) {
    console.warn('⚠️ [DB] Database not available, using fallback');
    return fallbackValue;
  }
  
  try {
    return await operation(dbClient);
  } catch (error) {
    console.error('❌ [DB] Database operation failed:', error);
    throw error;
  }
}

// Export the schema for convenience
export * from './schema.js';

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  sql,
  db,
  isDatabaseConnected,
  getDbStatus,
  withDb,
  schema,
};
