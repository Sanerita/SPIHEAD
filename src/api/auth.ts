// src/api/auth.ts
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, isDatabaseConnected } from '../db/index.js';
import { users } from '../db/schema.js';
import {
  usersDb,
  activeSessions,
  ServerUser,
  createSessionToken,
  createRefreshToken,
  getVerifiedSession,
  createPasswordResetToken,
  verifyPasswordResetToken,
  consumePasswordResetToken,
  createEmailVerificationToken,
  verifyEmailToken,
  updateUser,
  findUserByEmail,
  hashPassword,
  verifyPassword,
  revokeSession,
  revokeAllUserSessions,
  refreshSession
} from './sessionStore.js';
import { handleProviderOAuthFlow } from './auth/[provider].js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/emailService.js';

const router = Router();

// ============= HELPERS =============

function mapDbUserToServerUser(dbU: any, req?: Request): ServerUser {
  const now = new Date().toISOString();
  return {
    id: dbU.id,
    email: dbU.email.toLowerCase(),
    name: dbU.name || '',
    passwordHash: dbU.passwordHash || '',
    role: dbU.role || 'User',
    authRole: dbU.role || 'User',
    mfaEnabled: false,
    pinCode: '',
    lastLoginAt: dbU.lastLoginAt ? new Date(dbU.lastLoginAt).toISOString() : now,
    jobTitle: dbU.jobTitle || '',
    department: dbU.department || '',
    ipAddress: req?.ip || dbU.ipAddress || 'unknown',
    companyName: dbU.companyName || dbU.company || '',
    companySize: '',
    selectedPlan: dbU.selectedPlan || 'free',
    createdAt: dbU.createdAt ? new Date(dbU.createdAt).toISOString() : now,
    updatedAt: dbU.updatedAt ? new Date(dbU.updatedAt).toISOString() : now,
    isActive: true,
    emailVerified: false,
    failedLoginAttempts: 0
  };
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  }
  if (req.body && typeof req.body.token === 'string') {
    return req.body.token;
  }
  return null;
}

function getClientInfo(req: Request): { ip: string; userAgent: string } {
  return {
    ip: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
}

// ============= AUTH HANDLERS =============

/**
 * POST /api/auth/register - Create new account
 */
export async function handleRegister(req: Request, res: Response) {
  try {
    console.log('📝 [REGISTER] Request received');
    const { fullName, email, password, companyName } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid email address is required' 
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 8 characters' 
      });
    }

    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Full name is required' 
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log(`📧 [REGISTER] Creating user: ${cleanEmail}`);

    const existingUser = findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists'
      });
    }

    if (db && isDatabaseConnected) {
      try {
        const dbUsers = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (dbUsers.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'An account with this email already exists'
          });
        }
      } catch (dbErr) {
        console.warn('⚠️ [REGISTER] Database check error:', dbErr);
      }
    }

    const passwordHash = hashPassword(password);
    const userId = `usr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date();
    const nowISO = now.toISOString();

    const user = {
      id: userId,
      email: cleanEmail,
      name: fullName.trim(),
      passwordHash: passwordHash,
      role: 'User',
      company: companyName?.trim() || '',
      jobTitle: '',
      department: '',
      selectedPlan: 'free',
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const userForMemory = {
      ...user,
      lastLoginAt: nowISO,
      createdAt: nowISO,
      updatedAt: nowISO,
      authRole: 'User',
      mfaEnabled: false,
      pinCode: '',
      ipAddress: req.ip || 'unknown',
      companySize: '',
      isActive: true,
      emailVerified: false,
      failedLoginAttempts: 0
    };
    usersDb.set(cleanEmail, userForMemory);
    console.log('✅ [REGISTER] User stored in memory');

    if (db && isDatabaseConnected) {
      try {
        console.log('💾 [REGISTER] Saving to database...');
        await db.insert(users).values({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
          passwordHash: user.passwordHash,
          jobTitle: user.jobTitle,
          department: user.department,
          selectedPlan: user.selectedPlan,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        });
        console.log('✅ [REGISTER] User saved to database');
      } catch (dbErr) {
        console.error('❌ [REGISTER] Database save error:', dbErr);
      }
    } else {
      console.log('⚠️ [REGISTER] No database connection - using memory only');
    }

    try {
      const verifyToken = createEmailVerificationToken(cleanEmail);
      await sendVerificationEmail(cleanEmail, verifyToken);
      console.log('✅ [REGISTER] Verification email sent');
    } catch (emailErr) {
      console.warn('⚠️ [REGISTER] Email send failed:', emailErr);
    }

    const sessionToken = createSessionToken(cleanEmail);
    const refreshToken = createRefreshToken(cleanEmail);

    const { passwordHash: _, ...publicUser } = userForMemory;

    console.log('✅ [REGISTER] Registration successful');
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: sessionToken,
      refreshToken,
      user: publicUser
    });
  } catch (error: any) {
    console.error('❌ [REGISTER] Registration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create account'
    });
  }
}

/**
 * POST /api/auth/login - Authenticate user
 */
export async function handleLogin(req: Request, res: Response) {
  try {
    console.log('🔐 [LOGIN] Request received');
    const { email, password } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log(`🔐 [LOGIN] Attempting login for: ${cleanEmail}`);
    
    let user = findUserByEmail(cleanEmail);
    console.log('🔐 [LOGIN] User found in memory:', !!user);

    if (!user && db && isDatabaseConnected) {
      try {
        console.log('🔐 [LOGIN] Checking database...');
        const dbUsers = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          company: users.company,
          passwordHash: users.passwordHash,
          jobTitle: users.jobTitle,
          department: users.department,
          selectedPlan: users.selectedPlan,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }).from(users).where(eq(users.email, cleanEmail)).limit(1);
        
        if (dbUsers.length > 0) {
          const dbU = dbUsers[0];
          user = {
            id: dbU.id,
            email: dbU.email.toLowerCase(),
            name: dbU.name || '',
            passwordHash: dbU.passwordHash || '',
            role: dbU.role || 'User',
            authRole: dbU.role || 'User',
            mfaEnabled: false,
            pinCode: '',
            lastLoginAt: new Date().toISOString(),
            jobTitle: dbU.jobTitle || '',
            department: dbU.department || '',
            ipAddress: req.ip || 'unknown',
            companyName: dbU.company || '',
            companySize: '',
            selectedPlan: dbU.selectedPlan || 'free',
            createdAt: dbU.createdAt || new Date().toISOString(),
            updatedAt: dbU.updatedAt || new Date().toISOString(),
            isActive: true,
            emailVerified: false,
            failedLoginAttempts: 0
          };
          usersDb.set(cleanEmail, user);
          console.log('✅ [LOGIN] User found in database');
        }
      } catch (dbErr) {
        console.warn('⚠️ [LOGIN] Database lookup error:', dbErr);
      }
    }

    if (!user) {
      console.log('❌ [LOGIN] User not found:', cleanEmail);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const passwordHash = hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      console.log('❌ [LOGIN] Invalid password');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    user.lastLoginAt = new Date().toISOString();
    user.ipAddress = req.ip || 'unknown';
    usersDb.set(cleanEmail, user);

    const sessionToken = createSessionToken(cleanEmail);
    const refreshToken = createRefreshToken(cleanEmail);

    const { passwordHash: _, ...publicUser } = user;

    console.log('✅ [LOGIN] Login successful:', cleanEmail);
    return res.json({
      success: true,
      token: sessionToken,
      refreshToken,
      user: publicUser
    });
  } catch (error: any) {
    console.error('❌ [LOGIN] Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to authenticate'
    });
  }
}

/**
 * POST /api/auth/signup - Alias for register
 */
export async function handleSignup(req: Request, res: Response) {
  return handleRegister(req, res);
}

/**
 * POST /api/auth/logout - End session
 */
export async function handleLogout(req: Request, res: Response) {
  try {
    const token = extractToken(req);
    if (token) {
      revokeSession(token);
    }
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
}

/**
 * GET /api/auth/me - Get current user
 */
export async function handleGetMe(req: Request, res: Response) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        isAuthenticated: false,
        error: 'No token provided'
      });
    }

    const session = getVerifiedSession(token);
    if (!session) {
      return res.status(401).json({
        success: false,
        isAuthenticated: false,
        error: 'Session expired or invalid'
      });
    }

    let user = findUserByEmail(session.userEmail);
    if (!user && db && isDatabaseConnected) {
      try {
        const dbUsers = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          company: users.company,
          passwordHash: users.passwordHash,
          jobTitle: users.jobTitle,
          department: users.department,
          selectedPlan: users.selectedPlan,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }).from(users).where(eq(users.email, session.userEmail)).limit(1);
        
        if (dbUsers.length > 0) {
          const dbU = dbUsers[0];
          user = {
            id: dbU.id,
            email: dbU.email.toLowerCase(),
            name: dbU.name || '',
            passwordHash: dbU.passwordHash || '',
            role: dbU.role || 'User',
            authRole: dbU.role || 'User',
            mfaEnabled: false,
            pinCode: '',
            lastLoginAt: new Date().toISOString(),
            jobTitle: dbU.jobTitle || '',
            department: dbU.department || '',
            ipAddress: req.ip || 'unknown',
            companyName: dbU.company || '',
            companySize: '',
            selectedPlan: dbU.selectedPlan || 'free',
            createdAt: dbU.createdAt || new Date().toISOString(),
            updatedAt: dbU.updatedAt || new Date().toISOString(),
            isActive: true,
            emailVerified: false,
            failedLoginAttempts: 0
          };
          usersDb.set(session.userEmail, user);
        }
      } catch (dbErr) {
        console.warn('Database lookup error:', dbErr);
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        isAuthenticated: false,
        error: 'User not found'
      });
    }

    const { passwordHash: _, ...publicUser } = user;
    return res.json({
      success: true,
      isAuthenticated: true,
      user: publicUser
    });
  } catch (error: any) {
    console.error('Get me error:', error);
    return res.status(500).json({
      success: false,
      isAuthenticated: false,
      error: 'Failed to get user'
    });
  }
}

/**
 * POST /api/auth/refresh - Refresh session token
 */
export async function handleRefresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const result = refreshSession(refreshToken);
    if (!result) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    return res.json({
      success: true,
      token: result.sessionToken,
      refreshToken: result.refreshToken
    });
  } catch (error: any) {
    console.error('Refresh error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
}

/**
 * POST /api/auth/forgot-password - Request password reset
 */
export async function handleForgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = findUserByEmail(cleanEmail);
    
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists, a reset link will be sent'
      });
    }

    const resetToken = createPasswordResetToken(cleanEmail);
    
    try {
      await sendPasswordResetEmail(cleanEmail, resetToken);
    } catch (emailErr) {
      console.warn('Email send failed:', emailErr);
    }

    return res.json({
      success: true,
      message: 'If an account exists, a reset link will be sent'
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request'
    });
  }
}

/**
 * POST /api/auth/reset-password - Reset password
 */
export async function handleResetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Token and password (min 8 chars) are required'
      });
    }

    const email = verifyPasswordResetToken(token);
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const newHash = hashPassword(newPassword);
    updateUser(email, {
      passwordHash: newHash,
      failedLoginAttempts: 0
    });

    consumePasswordResetToken(token);
    revokeAllUserSessions(email);

    return res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
}

/**
 * GET /api/auth/verify-email - Verify email address
 */
export async function handleVerifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Verification token required'
      });
    }

    const email = verifyEmailToken(token);
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.json({
        success: true,
        message: 'Email already verified'
      });
    }

    updateUser(email, { emailVerified: true });

    return res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error: any) {
    console.error('Verify email error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify email'
    });
  }
}

// ============= ROUTE REGISTRATION =============

router.post('/register', handleRegister);
router.post('/signup', handleSignup);
router.post('/login', handleLogin);
router.post('/logout', handleLogout);
router.get('/me', handleGetMe);
router.post('/me', handleGetMe);
router.post('/refresh', handleRefresh);
router.post('/forgot-password', handleForgotPassword);
router.post('/reset-password', handleResetPassword);
router.get('/verify-email', handleVerifyEmail);

// OAuth URL endpoint
router.get('/oauth/url', (req: Request, res: Response) => {
  try {
    const provider = (req.query.provider as string || 'microsoft').toLowerCase();
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = `${appUrl}/api/auth/oauth/callback/google`;
      
      const googleScopes = ['openid', 'profile', 'email'];
      
      const params = new URLSearchParams({
        client_id: clientId || 'demo-client-id',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: googleScopes.join(' '),
        access_type: 'online'
      });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      return res.json({ success: true, url: authUrl, provider: 'Google' });
    } else {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
      const redirectUri = `${appUrl}/api/auth/oauth/callback/microsoft`;
      const m365Scopes = ['openid', 'profile', 'email', 'User.Read'];
      const params = new URLSearchParams({
        client_id: clientId || 'demo-client-id',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: m365Scopes.join(' '),
        response_mode: 'query'
      });
      const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
      return res.json({ success: true, url: authUrl, provider: 'Microsoft' });
    }
  } catch (error: any) {
    console.error('OAuth URL error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate OAuth URL'
    });
  }
});

// OAuth Callbacks
router.get('/oauth/callback/google', handleProviderOAuthFlow);
router.get('/oauth/callback/microsoft', handleProviderOAuthFlow);
router.post('/oauth/callback/google', handleProviderOAuthFlow);
router.post('/oauth/callback/microsoft', handleProviderOAuthFlow);

// Wildcard routes - must come last
router.get('/:provider', (req, res, next) => {
  const p = req.params.provider;
  if (['register', 'signup', 'login', 'logout', 'me', 'refresh', 'forgot-password', 'reset-password', 'verify-email', 'oauth'].includes(p)) {
    return next('route');
  }
  return handleProviderOAuthFlow(req, res);
});

export default router;
