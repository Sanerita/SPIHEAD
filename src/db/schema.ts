import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull(),
  company: text('company'),
  passwordHash: text('password_hash'),
  jobTitle: text('job_title'),
  department: text('department'),
  selectedPlan: text('selected_plan'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  budget: integer('budget').default(0),
  status: text('status').default('New'),
  score: integer('score').default(50),
  urgency: boolean('urgency').default(false),
  engagement: integer('engagement').default(1),
  replyCount: integer('reply_count').default(0),
  notes: text('notes'),
  industry: text('industry'),
  tags: text('tags'), // JSON stringified array
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const meetings = pgTable('meetings', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  leadId: text('lead_id'),
  title: text('title').notNull(),
  leadName: text('lead_name'),
  leadEmail: text('lead_email'),
  date: text('date'),
  time: text('time'),
  duration: integer('duration').default(30),
  status: text('status').default('Scheduled'),
  notes: text('notes'),
  teamsJoinUrl: text('teams_join_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const activities = pgTable('activities', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  type: text('type').notNull(),
  message: text('message').notNull(),
  leadId: text('lead_id'),
  leadName: text('lead_name'),
  timestamp: timestamp('timestamp').defaultNow(),
});
