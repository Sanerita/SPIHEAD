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
// FALLBACK STUB FOR UNCONFIGURATED DATABASE
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
let connectionError: Error | null = null;

try {
  if (connectionString && connectionString.startsWith('postgresql://')) {
    console.log('🔌 [DB] Connecting to Neon PostgreSQL...');
    
    // Initialize Neon client
    sqlClient = neon(connectionString);
    
    // Initialize Drizzle with schema
    dbClient = drizzle(sqlClient, { schema });
    
    // Mark as connected (we'll test lazily)
    isConnected = true;
    console.log('✅ [DB] Client initialized successfully');
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
    connectionError = err;
  }
  sqlClient = null;
  dbClient = null;
}

// ============================================
// ASYNC CONNECTION TESTER
// ============================================

export async function testConnection(): Promise<boolean> {
  if (!dbClient || !isConnected) {
    return false;
  }

  try {
    await dbClient.select().from(schema.users).limit(1);
    console.log('✅ [DB] Connection verified successfully');
    return true;
  } catch (error) {
    console.warn('⚠️ [DB] Connection test failed:', error);
    return false;
  }
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

// Export connection error if any
export const getConnectionError = () => connectionError;

// Export a helper to check database status
export function getDbStatus() {
  return {
    connected: !!dbClient && isConnected,
    hasConnectionString: !!connectionString,
    clientInitialized: !!dbClient,
    connectionString: connectionString ? '***hidden***' : 'not set',
    error: connectionError?.message || null,
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

// Export init functions (will be used by createApp)
export * from './init.js';

// ============================================
// AUTO-INITIALIZE IN DEVELOPMENT
// ============================================

// Only auto-initialize if not in production and not in build
if (process.env.NODE_ENV === 'development' && !process.env.VITE_BUILD) {
  import('./init.js').then(({ initDbTables }) => {
    console.log('🔄 [DB] Auto-initializing in development mode...');
    initDbTables().catch((err) => {
      console.warn('⚠️ [DB] Auto-initialization failed:', err);
    });
  });
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  sql,
  db,
  isDatabaseConnected,
  getDbStatus,
  getConnectionError,
  testConnection,
  withDb,
  schema,
};
