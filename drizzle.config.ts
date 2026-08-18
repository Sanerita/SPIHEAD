// drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // ✅ Ignore system tables and the test table
  tablesFilter: [
    '!pg_catalog.*', 
    '!information_schema.*',
    '!playing_with_neon', // ✅ Ignore the Neon test table
  ],
  introspect: {
    casing: 'camel',
  },
  migrations: {
    prefix: 'timestamp',
    table: 'migrations',
    schema: 'public',
  },
  // ✅ Optional: Be more strict about schema changes
  strict: true,
  // ✅ Optional: Verbose output for debugging
  verbose: true,
});
