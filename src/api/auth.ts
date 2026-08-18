import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
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
import { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../lib/emailService.js';

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
    authRole: dbU.authRole || dbU.role || 'User',
    mfaEnabled: dbU.mfaEnabled || false,
    pinCode: dbU.pinCode || '',
    lastLoginAt: dbU.lastLoginAt || now,
    jobTitle: dbU.jobTitle || '',
    department: dbU.department || '',
    ipAddress: req?.ip || dbU.ipAddress || 'unknown',
    companyName: dbU.companyName || dbU.company || '',
    companySize: dbU.companySize || '',
    selectedPlan: dbU.selectedPlan || 'free',
    createdAt: dbU.createdAt || now,
    updatedAt: dbU.updatedAt || now,
    isActive: dbU.isActive !== undefined ? dbU.isActive : true,
    emailVerified: dbU.emailVerified || false,
    failedLoginAttempts: dbU.failedLoginAttempts || 0
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
    const { fullName, email, password, companyName } = req.body;

    // Validate required fields
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

    // Check existing user
    const existingUser = findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists'
      });
    }

    // Create user
    const newUser = {
      email: cleanEmail,
      name: fullName.trim(),
      password,
      role: 'User',
      companyName: companyName?.trim() || '',
      ipAddress: req.ip || 'unknown'
    };

    const user = {
      id: `usr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      ...newUser,
      passwordHash: hashPassword(newUser.password),
      authRole: 'User',
      mfaEnabled: false,
      pinCode: '',
      lastLoginAt: new Date().toISOString(),
      jobTitle: '',
      department: '',
      companySize: '',
      selectedPlan: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      emailVerified: false,
      failedLoginAttempts: 0
    };

    usersDb.set(cleanEmail, user);

    // Save to database
    if (db) {
      try {
        await db.insert(users).values({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.companyName,
          passwordHash: user.passwordHash,
          jobTitle: user.jobTitle,
          department: user.department,
          selectedPlan: user.selectedPlan,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          ipAddress: user.ipAddress
        });
      } catch (dbErr) {
        console.error('Database save error:', dbErr);
        usersDb.delete(cleanEmail);
        return res.status(500).json({
          success: false,
          error: 'Failed to create account'
        });
      }
    }

    // Generate verification token
    const verifyToken = createEmailVerificationToken(cleanEmail);
    
    // Send verification email
    try {
      await sendVerificationEmail(cleanEmail, verifyToken);
    } catch (emailErr) {
      console.warn('Email send failed:', emailErr);
    }

    // Create session
    const clientInfo = getClientInfo(req);
    const sessionToken = createSessionToken(cleanEmail, clientInfo.ip, clientInfo.userAgent);
    const refreshToken = createRefreshToken(cleanEmail);

    const { passwordHash: _, ...publicUser } = user;

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      token: sessionToken,
      refreshToken,
      user: publicUser
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create account'
    });
  }
}

/**
 * POST /api/auth/login - Authenticate user
 */
export async function handleLogin(req: Request, res: Response) {
  try {
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
    let user = findUserByEmail(cleanEmail);

    // Check database if not in memory
    if (!user && db) {
      try {
        const dbUsers = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (dbUsers.length > 0) {
          user = mapDbUserToServerUser(dbUsers[0], req);
          usersDb.set(cleanEmail, user);
        }
      } catch (dbErr) {
        console.warn('Database lookup error:', dbErr);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.lockedUntil && Date.now() < new Date(user.lockedUntil).getTime()) {
      return res.status(403).json({
        success: false,
        error: 'Account is temporarily locked. Please try again later.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated. Please contact support.'
      });
    }

    // Verify password
    if (!verifyPassword(password, user.passwordHash)) {
      // Increment failed login attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updates: any = { failedLoginAttempts: failedAttempts };
      
      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
      }
      
      updateUser(cleanEmail, updates);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        remainingAttempts: 5 - failedAttempts
      });
    }

    // Reset failed login attempts on success
    const clientInfo = getClientInfo(req);
    updateUser(cleanEmail, {
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      lastLoginAt: new Date().toISOString(),
      ipAddress: clientInfo.ip
    });

    // Create session
    const sessionToken = createSessionToken(cleanEmail, clientInfo.ip, clientInfo.userAgent);
    const refreshToken = createRefreshToken(cleanEmail);

    const { passwordHash: _, ...publicUser } = user;

    return res.json({
      success: true,
      token: sessionToken,
      refreshToken,
      user: publicUser
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to authenticate'
    });
  }
}

/**
 * POST /api/auth/signup - Alias for register (for compatibility)
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
    if (!user && db) {
      try {
        const dbUsers = await db.select().from(users).where(eq(users.email, session.userEmail)).limit(1);
        if (dbUsers.length > 0) {
          user = mapDbUserToServerUser(dbUsers[0], req);
          usersDb.set(session.userEmail, user);
        }
      } catch (dbErr) {
        console.warn('Database lookup error:', dbErr);
      }
    }

    if (!user || !user.isActive) {
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
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists, a reset link will be sent'
      });
    }

    const resetToken = createPasswordResetToken(cleanEmail);
    
    // Send reset email
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
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update password
    const newHash = hashPassword(newPassword);
    updateUser(email, {
      passwordHash: newHash,
      lastPasswordChange: new Date().toISOString(),
      failedLoginAttempts: 0
    });

    consumePasswordResetToken(token);

    // Revoke all sessions
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
router.post('/signup', handleSignup); // Alias for register
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
      
      const googleScopes = [
        'openid',
        'profile',
        'email'
      ];
      
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
      const m365Scopes = [
        'openid',
        'profile',
        'email',
        'User.Read'
      ];
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


// Export the router as default
export default router;
