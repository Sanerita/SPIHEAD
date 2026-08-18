// src/db/schema.ts
import { pgTable, text, timestamp, integer, boolean, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

// ============================================
// USERS TABLE
// ============================================
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('User'),
  authRole: text('auth_role').default('User'),
  company: text('company'),
  passwordHash: text('password_hash'),
  jobTitle: text('job_title'),
  department: text('department'),
  selectedPlan: text('selected_plan').default('free'),
  companySize: text('company_size'),
  ipAddress: text('ip_address'),
  mfaEnabled: boolean('mfa_enabled').default(false),
  pinCode: text('pin_code'),
  lastLoginAt: timestamp('last_login_at'),
  isActive: boolean('is_active').default(true),
  emailVerified: boolean('email_verified').default(false),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  lastPasswordChange: timestamp('last_password_change'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('email_idx').on(table.email),
}));

// ============================================
// LEADS TABLE
// ============================================
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
  tags: jsonb('tags'), // ✅ Changed to jsonb for better querying
  m365Synced: boolean('m365_synced').default(false),
  lastContactedAt: timestamp('last_contacted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('leads_user_id_idx').on(table.userId),
}));

// ============================================
// OAUTH TOKENS TABLE
// ============================================
export const oauthTokens = pgTable('oauth_tokens', {
  id: text('id').primaryKey(),
  userEmail: text('user_email').notNull(),
  provider: text('provider').notNull(), // 'microsoft' | 'google'
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at').notNull(),
  scope: text('scope'),
  tokenType: text('token_type').default('Bearer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userProviderIdx: uniqueIndex('oauth_user_provider_idx').on(table.userEmail, table.provider),
}));

// ============================================
// MEETINGS TABLE
// ============================================
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
  meetingLink: text('meeting_link'),
  calendarEventId: text('calendar_event_id'),
  reminderSent: boolean('reminder_sent').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  leadIdIdx: uniqueIndex('meetings_lead_id_idx').on(table.leadId),
  userIdIdx: uniqueIndex('meetings_user_id_idx').on(table.userId),
}));

// ============================================
// ACTIVITIES TABLE
// ============================================
export const activities = pgTable('activities', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  type: text('type').notNull(), // 'email', 'call', 'meeting', 'note', 'task'
  message: text('message').notNull(),
  leadId: text('lead_id'),
  leadName: text('lead_name'),
  metadata: jsonb('metadata'), // Additional data like email subject, call duration, etc.
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  leadIdIdx: uniqueIndex('activities_lead_id_idx').on(table.leadId),
  userIdIdx: uniqueIndex('activities_user_id_idx').on(table.userId),
  timestampIdx: uniqueIndex('activities_timestamp_idx').on(table.timestamp),
}));

// ============================================
// SESSIONS TABLE (Optional - for persistent sessions)
// ============================================
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at').notNull(),
  isValid: boolean('is_valid').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('sessions_user_id_idx').on(table.userId),
  tokenIdx: uniqueIndex('sessions_token_idx').on(table.token),
}));

// ============================================
// EMAIL LOGS TABLE (Optional)
// ============================================
export const emailLogs = pgTable('email_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  leadId: text('lead_id'),
  to: text('to').notNull(),
  subject: text('subject').notNull(),
  body: text('body'),
  status: text('status').default('sent'), // 'sent', 'failed', 'opened', 'clicked'
  sentAt: timestamp('sent_at').defaultNow(),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  leadIdIdx: uniqueIndex('email_logs_lead_id_idx').on(table.leadId),
  userIdIdx: uniqueIndex('email_logs_user_id_idx').on(table.userId),
}));

// ============================================
// API KEYS TABLE (Optional - for API access)
// ============================================
export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  permissions: jsonb('permissions'), // Array of permissions
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('api_keys_user_id_idx').on(table.userId),
  keyIdx: uniqueIndex('api_keys_key_idx').on(table.key),
}));

// ============================================
// AUDIT LOGS TABLE (Optional - for security)
// ============================================
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  resource: text('resource'),
  resourceId: text('resource_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  details: jsonb('details'),
  severity: text('severity').default('info'), // 'info', 'warning', 'error', 'critical'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('audit_logs_user_id_idx').on(table.userId),
  createdAtIdx: uniqueIndex('audit_logs_created_at_idx').on(table.createdAt),
}));

// ============================================
// SUBSCRIPTIONS TABLE (Optional)
// ============================================
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  plan: text('plan').default('free'), // 'free', 'freelancer', 'business', 'enterprise'
  status: text('status').default('active'), // 'active', 'canceled', 'expired', 'trial'
  seats: integer('seats').default(1),
  aiCredits: integer('ai_credits').default(150),
  aiCreditsUsed: integer('ai_credits_used').default(0),
  billingInterval: text('billing_interval').default('monthly'), // 'monthly', 'annual'
  trialEndsAt: timestamp('trial_ends_at'),
  nextBillingAt: timestamp('next_billing_at'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('subscriptions_user_id_idx').on(table.userId),
}));

// ============================================
// INVOICES TABLE (Optional)
// ============================================
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  subscriptionId: text('subscription_id'),
  amount: integer('amount').notNull(),
  currency: text('currency').default('USD'),
  status: text('status').default('pending'), // 'pending', 'paid', 'failed'
  stripeInvoiceId: text('stripe_invoice_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  paidAt: timestamp('paid_at'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('invoices_user_id_idx').on(table.userId),
}));

// ============================================
// EXPORT ALL TABLES
// ============================================
export default {
  users,
  leads,
  oauthTokens,
  meetings,
  activities,
  sessions,
  emailLogs,
  apiKeys,
  auditLogs,
  subscriptions,
  invoices,
};
