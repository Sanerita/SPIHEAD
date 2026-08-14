import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || '';

function unconfiguredStub() {
  const fail = () => {
    throw new Error(
      'Database is not available (DATABASE_URL missing or invalid). Falling back to in-memory storage.'
    );
  };
  return new Proxy(fail, {
    get: () => fail,
    apply: () => fail(),
  });
}

let sqlClient: any;
let dbClient: any;

try {
  if (connectionString) {
    sqlClient = neon(connectionString);
    dbClient = drizzle(sqlClient, { schema });
  } else {
    console.warn('DATABASE_URL is not set — running with in-memory storage only.');
    sqlClient = unconfiguredStub();
    dbClient = null;
  }
} catch (err) {
  // neon() validates the connection string immediately and can throw
  // synchronously at import time if it's malformed. Catching this here
  // prevents a bad DATABASE_URL from crashing the entire serverless
  // function (FUNCTION_INVOCATION_FAILED) before any route can run.
  console.error('Failed to initialize Neon DB client — falling back to in-memory storage:', err);
  sqlClient = unconfiguredStub();
  dbClient = null;
}

export const sql: any = sqlClient;
export const db: any = dbClient;
