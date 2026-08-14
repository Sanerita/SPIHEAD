import crypto from 'crypto';

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  authRole: string;
  mfaEnabled: boolean;
  pinCode: string;
  lastLoginAt: string;
  jobTitle: string;
  department: string;
  ipAddress: string;
  companyName?: string;
  companySize?: string;
  selectedPlan?: string;
}

export const SEED_USERS: ServerUser[] = [
  {
    id: "usr_001_exec",
    email: "sanelisiwe.sileku@spihead.com",
    name: "Sanelisiwe Sileku",
    passwordHash: crypto.createHash("sha256").update("Password123!").digest("hex"),
    role: "Owner",
    authRole: "Owner",
    mfaEnabled: true,
    pinCode: "1234",
    lastLoginAt: new Date().toISOString(),
    jobTitle: "Chief Executive Officer / Founder",
    department: "Executive Operations",
    ipAddress: "197.189.204.12",
    companyName: "SPIHEAD Enterprise",
    selectedPlan: "small-business"
  },
  {
    id: "usr_001_gmail",
    email: "sanelisiwe.sileku@gmail.com",
    name: "Sanelisiwe Sileku",
    passwordHash: crypto.createHash("sha256").update("Password123!").digest("hex"),
    role: "Owner",
    authRole: "Owner",
    mfaEnabled: true,
    pinCode: "1234",
    lastLoginAt: new Date().toISOString(),
    jobTitle: "Chief Executive Officer / Founder",
    department: "Executive Operations",
    ipAddress: "197.189.204.12",
    companyName: "SPIHEAD Enterprise",
    selectedPlan: "small-business"
  },
  {
    id: "usr_002_admin",
    email: "admin@spihead.com",
    name: "SPIHEAD Administrator",
    passwordHash: crypto.createHash("sha256").update("Password123!").digest("hex"),
    role: "Admin",
    authRole: "Admin",
    mfaEnabled: true,
    pinCode: "1234",
    lastLoginAt: new Date().toISOString(),
    jobTitle: "Enterprise Systems Administrator",
    department: "IT Security",
    ipAddress: "127.0.0.1",
    companyName: "SPIHEAD Corp",
    selectedPlan: "enterprise"
  },
  {
    id: "usr_003_demo",
    email: "user@company.com",
    name: "Demo Sales Executive",
    passwordHash: crypto.createHash("sha256").update("Password123!").digest("hex"),
    role: "Sales Rep",
    authRole: "Sales Rep",
    mfaEnabled: true,
    pinCode: "1234",
    lastLoginAt: new Date().toISOString(),
    jobTitle: "Senior Account Executive",
    department: "Global Revenue",
    ipAddress: "192.168.1.1",
    companyName: "Acme Corp",
    selectedPlan: "small-business"
  }
];

export const usersDb = new Map<string, ServerUser>();
SEED_USERS.forEach((u) => usersDb.set(u.email.toLowerCase(), u));

export const activeSessions = new Map<string, { userEmail: string; expiresAt: number }>();

const SECRET_KEY = process.env.SESSION_SECRET || process.env.DATABASE_URL || 'spihead-enterprise-session-signing-key-2026';

function hmacSign(data: string): string {
  return crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
}

/**
 * Creates a stateless signed session token that works seamlessly across serverless instances and cold starts.
 */
export function createSessionToken(userEmail: string, expiresInHours = 24): string {
  const expiresAt = Date.now() + expiresInHours * 60 * 60 * 1000;
  const payload = JSON.stringify({ email: userEmail.toLowerCase(), exp: expiresAt, rand: crypto.randomBytes(8).toString('hex') });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = hmacSign(base64Payload);
  const token = `tok_v2_${base64Payload}.${signature}`;

  // Also record in local activeSessions cache
  activeSessions.set(token, { userEmail: userEmail.toLowerCase(), expiresAt });
  return token;
}

/**
 * Verifies a session token statelessly or via memory cache.
 */
export function getVerifiedSession(token: string): { userEmail: string; expiresAt: number } | null {
  if (!token) return null;

  // 1. Check in-memory session cache first
  const cached = activeSessions.get(token);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      activeSessions.delete(token);
      return null;
    }
    return cached;
  }

  // 2. Decode and verify stateless signed token
  if (token.startsWith('tok_v2_')) {
    try {
      const parts = token.slice(7).split('.');
      if (parts.length !== 2) return null;
      const [base64Payload, signature] = parts;
      const expectedSig = hmacSign(base64Payload);
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
      }
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf-8'));
      if (!payload.email || typeof payload.exp !== 'number' || Date.now() > payload.exp) {
        return null;
      }
      const session = { userEmail: payload.email, expiresAt: payload.exp };
      activeSessions.set(token, session);
      return session;
    } catch (err) {
      return null;
    }
  }

  return null;
}
