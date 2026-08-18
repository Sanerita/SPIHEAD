// src/lib/sessionStore.ts
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
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  emailVerified: boolean;
  mfaSecret?: string;
  lastPasswordChange?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string;
}

export interface SessionData {
  userEmail: string;
  expiresAt: number;
  createdAt: number;
  ipAddress?: string;
  userAgent?: string;
}

// In-memory stores (replace with Redis in production)
export const usersDb = new Map<string, ServerUser>();
export const activeSessions = new Map<string, SessionData>();
export const refreshTokens = new Map<string, SessionData>();
export const passwordResetTokens = new Map<string, { email: string; expiresAt: number }>();
export const emailVerificationTokens = new Map<string, { email: string; expiresAt: number }>();

const SECRET_KEY = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const REFRESH_SECRET = process.env.REFRESH_SECRET || crypto.randomBytes(32).toString('hex');

// Token expiration times (in seconds)
const SESSION_EXPIRY = 60 * 60 * 24; // 24 hours
const REFRESH_EXPIRY = 60 * 60 * 24 * 7; // 7 days
const RESET_EXPIRY = 60 * 60; // 1 hour
const VERIFICATION_EXPIRY = 60 * 60 * 24 * 7; // 7 days

function hmacSign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function generateId(): string {
  return `usr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function createUser(userData: {
  email: string;
  name: string;
  password: string;
  role?: string;
  companyName?: string;
  ipAddress?: string;
}): ServerUser {
  const now = new Date().toISOString();
  
  const user: ServerUser = {
    id: generateId(),
    email: userData.email.toLowerCase(),
    name: userData.name,
    passwordHash: hashPassword(userData.password),
    role: userData.role || 'User',
    authRole: userData.role || 'User',
    mfaEnabled: false,
    pinCode: '',
    lastLoginAt: now,
    jobTitle: '',
    department: '',
    ipAddress: userData.ipAddress || 'unknown',
    companyName: userData.companyName || '',
    companySize: '',
    selectedPlan: 'free',
    createdAt: now,
    updatedAt: now,
    isActive: true,
    emailVerified: false,
    failedLoginAttempts: 0
  };

  usersDb.set(user.email, user);
  return user;
}

export function findUserByEmail(email: string): ServerUser | null {
  return usersDb.get(email.toLowerCase()) || null;
}

export function findUserById(id: string): ServerUser | null {
  for (const user of usersDb.values()) {
    if (user.id === id) {
      return user;
    }
  }
  return null;
}

export function updateUser(email: string, updates: Partial<Omit<ServerUser, 'id' | 'email' | 'createdAt'>>): ServerUser | null {
  const user = usersDb.get(email.toLowerCase());
  if (!user) return null;

  const updatedUser = {
    ...user,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  usersDb.set(email.toLowerCase(), updatedUser);
  return updatedUser;
}

export function deleteUser(email: string): boolean {
  const user = usersDb.get(email.toLowerCase());
  if (!user) return false;

  user.isActive = false;
  user.updatedAt = new Date().toISOString();
  usersDb.set(email.toLowerCase(), user);
  return true;
}

export function createSessionToken(userEmail: string): string {
  const expiresAt = Date.now() + SESSION_EXPIRY * 1000;
  const payload = JSON.stringify({
    email: userEmail.toLowerCase(),
    exp: expiresAt,
    rand: crypto.randomBytes(8).toString('hex'),
    type: 'session'
  });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = hmacSign(base64Payload, SECRET_KEY);
  const token = `tok_v2_${base64Payload}.${signature}`;

  activeSessions.set(token, {
    userEmail: userEmail.toLowerCase(),
    expiresAt,
    createdAt: Date.now()
  });

  return token;
}

export function createRefreshToken(userEmail: string): string {
  const expiresAt = Date.now() + REFRESH_EXPIRY * 1000;
  const payload = JSON.stringify({
    email: userEmail.toLowerCase(),
    exp: expiresAt,
    rand: crypto.randomBytes(8).toString('hex'),
    type: 'refresh'
  });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = hmacSign(base64Payload, REFRESH_SECRET);
  const token = `ref_v2_${base64Payload}.${signature}`;

  refreshTokens.set(token, {
    userEmail: userEmail.toLowerCase(),
    expiresAt,
    createdAt: Date.now()
  });

  return token;
}

export function createPasswordResetToken(email: string): string {
  const expiresAt = Date.now() + RESET_EXPIRY * 1000;
  const token = `rst_${crypto.randomBytes(32).toString('hex')}`;
  
  passwordResetTokens.set(token, { email: email.toLowerCase(), expiresAt });
  return token;
}

export function verifyPasswordResetToken(token: string): string | null {
  const data = passwordResetTokens.get(token);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    passwordResetTokens.delete(token);
    return null;
  }
  return data.email;
}

export function consumePasswordResetToken(token: string): void {
  passwordResetTokens.delete(token);
}

export function createEmailVerificationToken(email: string): string {
  const expiresAt = Date.now() + VERIFICATION_EXPIRY * 1000;
  const token = `ver_${crypto.randomBytes(32).toString('hex')}`;
  
  emailVerificationTokens.set(token, { email: email.toLowerCase(), expiresAt });
  return token;
}

export function verifyEmailToken(token: string): string | null {
  const data = emailVerificationTokens.get(token);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    emailVerificationTokens.delete(token);
    return null;
  }
  return data.email;
}

export function getVerifiedSession(token: string): SessionData | null {
  if (!token) return null;

  const cached = activeSessions.get(token);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      activeSessions.delete(token);
      return null;
    }
    return cached;
  }

  if (token.startsWith('tok_v2_')) {
    return verifyToken(token, SECRET_KEY, 'session');
  }

  return null;
}

export function verifyRefreshToken(token: string): SessionData | null {
  if (!token) return null;

  const cached = refreshTokens.get(token);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      refreshTokens.delete(token);
      return null;
    }
    return cached;
  }

  if (token.startsWith('ref_v2_')) {
    return verifyToken(token, REFRESH_SECRET, 'refresh');
  }

  return null;
}

function verifyToken(token: string, secret: string, expectedType: string): SessionData | null {
  try {
    const prefix = expectedType === 'session' ? 'tok_v2_' : 'ref_v2_';
    const parts = token.slice(prefix.length).split('.');
    if (parts.length !== 2) return null;

    const [base64Payload, signature] = parts;
    const expectedSig = hmacSign(base64Payload, secret);

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf-8'));

    if (!payload.email || payload.type !== expectedType || typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return null;
    }

    const sessionData: SessionData = {
      userEmail: payload.email,
      expiresAt: payload.exp,
      createdAt: Date.now()
    };

    if (expectedType === 'session') {
      activeSessions.set(token, sessionData);
    } else {
      refreshTokens.set(token, sessionData);
    }

    return sessionData;
  } catch (err) {
    return null;
  }
}

export function refreshSession(refreshToken: string): { sessionToken: string; refreshToken: string } | null {
  const verified = verifyRefreshToken(refreshToken);
  if (!verified) return null;

  refreshTokens.delete(refreshToken);

  const user = findUserByEmail(verified.userEmail);
  if (!user || !user.isActive) return null;

  const newSessionToken = createSessionToken(user.email);
  const newRefreshToken = createRefreshToken(user.email);

  return { sessionToken: newSessionToken, refreshToken: newRefreshToken };
}

export function revokeAllUserSessions(userEmail: string): void {
  const email = userEmail.toLowerCase();

  for (const [token, session] of activeSessions.entries()) {
    if (session.userEmail === email) {
      activeSessions.delete(token);
    }
  }

  for (const [token, session] of refreshTokens.entries()) {
    if (session.userEmail === email) {
      refreshTokens.delete(token);
    }
  }
}

export function revokeSession(token: string): boolean {
  if (activeSessions.has(token)) {
    activeSessions.delete(token);
    return true;
  }
  return false;
}

export function cleanupExpiredSessions(): void {
  const now = Date.now();

  for (const [token, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      activeSessions.delete(token);
    }
  }

  for (const [token, session] of refreshTokens.entries()) {
    if (now > session.expiresAt) {
      refreshTokens.delete(token);
    }
  }

  for (const [token, data] of passwordResetTokens.entries()) {
    if (now > data.expiresAt) {
      passwordResetTokens.delete(token);
    }
  }

  for (const [token, data] of emailVerificationTokens.entries()) {
    if (now > data.expiresAt) {
      emailVerificationTokens.delete(token);
    }
  }
}
