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
}

// In-memory database (replace with actual database in production)
export const usersDb = new Map<string, ServerUser>();
export const activeSessions = new Map<string, { userEmail: string; expiresAt: number }>();
export const refreshTokens = new Map<string, { userEmail: string; expiresAt: number }>();

const SECRET_KEY = process.env.SESSION_SECRET || process.env.DATABASE_URL || 'spihead-enterprise-session-signing-key-2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'spihead-refresh-secret-key-2026';

function hmacSign(data: string, secret: string = SECRET_KEY): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

// Generate a unique ID
function generateId(): string {
  return `usr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

// Hash password
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Verify password
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Create a new user
export function createUser(userData: Omit<ServerUser, 'id' | 'passwordHash' | 'createdAt' | 'updatedAt' | 'isActive' | 'emailVerified'> & { password: string }): ServerUser {
  const now = new Date().toISOString();
  
  const user: ServerUser = {
    id: generateId(),
    email: userData.email.toLowerCase(),
    name: userData.name,
    passwordHash: hashPassword(userData.password),
    role: userData.role || 'User',
    authRole: userData.authRole || 'User',
    mfaEnabled: userData.mfaEnabled || false,
    pinCode: userData.pinCode || '',
    lastLoginAt: now,
    jobTitle: userData.jobTitle || '',
    department: userData.department || '',
    ipAddress: userData.ipAddress || '',
    companyName: userData.companyName,
    companySize: userData.companySize,
    selectedPlan: userData.selectedPlan || 'free',
    createdAt: now,
    updatedAt: now,
    isActive: true,
    emailVerified: false
  };

  usersDb.set(user.email, user);
  return user;
}

// Find user by email
export function findUserByEmail(email: string): ServerUser | null {
  return usersDb.get(email.toLowerCase()) || null;
}

// Find user by ID
export function findUserById(id: string): ServerUser | null {
  for (const user of usersDb.values()) {
    if (user.id === id) {
      return user;
    }
  }
  return null;
}

// Update user
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

// Delete user (soft delete)
export function deleteUser(email: string): boolean {
  const user = usersDb.get(email.toLowerCase());
  if (!user) return false;

  user.isActive = false;
  user.updatedAt = new Date().toISOString();
  usersDb.set(email.toLowerCase(), user);
  return true;
}

// Create session token
export function createSessionToken(userEmail: string, expiresInHours = 24): string {
  const expiresAt = Date.now() + expiresInHours * 60 * 60 * 1000;
  const payload = JSON.stringify({ 
    email: userEmail.toLowerCase(), 
    exp: expiresAt, 
    rand: crypto.randomBytes(8).toString('hex'),
    type: 'session'
  });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = hmacSign(base64Payload);
  const token = `tok_v2_${base64Payload}.${signature}`;

  activeSessions.set(token, { userEmail: userEmail.toLowerCase(), expiresAt });
  return token;
}

// Create refresh token
export function createRefreshToken(userEmail: string, expiresInDays = 7): string {
  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ 
    email: userEmail.toLowerCase(), 
    exp: expiresAt, 
    rand: crypto.randomBytes(8).toString('hex'),
    type: 'refresh'
  });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = hmacSign(base64Payload, REFRESH_SECRET);
  const token = `ref_v2_${base64Payload}.${signature}`;

  refreshTokens.set(token, { userEmail: userEmail.toLowerCase(), expiresAt });
  return token;
}

// Verify session token
export function getVerifiedSession(token: string): { userEmail: string; expiresAt: number } | null {
  if (!token) return null;

  // Check in-memory session cache first
  const cached = activeSessions.get(token);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      activeSessions.delete(token);
      return null;
    }
    return cached;
  }

  // Verify stateless signed token
  if (token.startsWith('tok_v2_')) {
    return verifyToken(token, SECRET_KEY, 'session');
  }

  return null;
}

// Verify refresh token
export function verifyRefreshToken(token: string): { userEmail: string; expiresAt: number } | null {
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

// Helper to verify tokens
function verifyToken(token: string, secret: string, expectedType: string): { userEmail: string; expiresAt: number } | null {
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
    
    const session = { userEmail: payload.email, expiresAt: payload.exp };
    
    // Store in appropriate cache
    if (expectedType === 'session') {
      activeSessions.set(token, session);
    } else {
      refreshTokens.set(token, session);
    }
    
    return session;
  } catch (err) {
    return null;
  }
}

// Refresh session using refresh token
export function refreshSession(refreshToken: string): { newSessionToken: string; newRefreshToken: string } | null {
  const verified = verifyRefreshToken(refreshToken);
  if (!verified) return null;

  // Delete old refresh token (one-time use)
  refreshTokens.delete(refreshToken);

  const user = findUserByEmail(verified.userEmail);
  if (!user || !user.isActive) return null;

  // Create new tokens
  const newSessionToken = createSessionToken(user.email);
  const newRefreshToken = createRefreshToken(user.email);

  return { newSessionToken, newRefreshToken };
}

// Revoke all sessions for a user
export function revokeAllUserSessions(userEmail: string): void {
  const email = userEmail.toLowerCase();
  
  // Remove from active sessions
  for (const [token, session] of activeSessions.entries()) {
    if (session.userEmail === email) {
      activeSessions.delete(token);
    }
  }
  
  // Remove from refresh tokens
  for (const [token, session] of refreshTokens.entries()) {
    if (session.userEmail === email) {
      refreshTokens.delete(token);
    }
  }
}

// Logout - revoke specific session
export function revokeSession(token: string): boolean {
  if (activeSessions.has(token)) {
    activeSessions.delete(token);
    return true;
  }
  return false;
}

// Clean up expired sessions (should be run periodically)
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
}
