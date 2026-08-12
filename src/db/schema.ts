import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull(),
  company: text('company'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  company: text('company'),
  status: text('status'),
  value: integer('value').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const deals = pgTable('deals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  stage: text('stage').notNull(),
  value: integer('value').notNull(),
  currency: text('currency').default('USD'),
  createdAt: timestamp('created_at').defaultNow(),
});
