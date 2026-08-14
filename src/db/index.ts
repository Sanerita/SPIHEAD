import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || '';

export const sql = connectionString
  ? neon(connectionString)
  : (async () => {
      throw new Error("DATABASE_URL environment variable is not configured.");
    }) as any;

export const db = connectionString ? drizzle(sql, { schema }) : (null as any);
