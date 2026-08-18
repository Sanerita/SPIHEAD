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
  tablesFilter: ['!pg_catalog.*', '!information_schema.*'],
  introspect: {
    casing: 'camel',
  },
  migrations: {
    prefix: 'timestamp',
    table: 'migrations',
    schema: 'public',
  },
});
