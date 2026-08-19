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
    failedLoginAttempts: 0,
    phoneNumber: dbU.phoneNumber || '', // ✅ ADDED
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
    console.log('📝 [REGISTER] Body:', JSON.stringify(req.body, null, 2));
    
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
      console.log('❌ [REGISTER] User already exists in memory');
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists'
      });
    }

    if (db && isDatabaseConnected) {
      try {
        const dbUsers = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (dbUsers.length > 0) {
          console.log('❌ [REGISTER] User already exists in database');
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
    console.log('🔑 [REGISTER] Password hash created:', passwordHash.substring(0, 20) + '...');
    
    const userId = `usr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const nowISO = new Date().toISOString();

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
      phoneNumber: '', // ✅ ADDED
    };

    const userForMemory = {
      ...user,
      lastLoginAt: nowISO,
      authRole: 'User',
      mfaEnabled: false,
      pinCode: '',
      ipAddress: req.ip || 'unknown',
      companySize: '',
      isActive: true,
      emailVerified: false,
      failedLoginAttempts: 0,
      phoneNumber: '', // ✅ ADDED
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
          phoneNumber: '', // ✅ ADDED
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        } as any);
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

    console.log('✅ [REGISTER] Registration successful for:', cleanEmail);
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: sessionToken,
      refreshToken,
      user: publicUser
    });
  } catch (error: any) {
    console.error('❌ [REGISTER] Registration error:', error);
    console.error('❌ [REGISTER] Stack:', error.stack);
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
    console.log('🔐 [LOGIN] Body:', JSON.stringify(req.body, null, 2));
    
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
          phoneNumber: users.phoneNumber, // ✅ ADDED
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }).from(users).where(eq(users.email, cleanEmail)).limit(1);
        
        console.log('🔐 [LOGIN] Database result:', dbUsers.length > 0 ? 'User found' : 'User not found');
        
        if (dbUsers.length > 0) {
          const dbU = dbUsers[0];
          console.log('🔐 [LOGIN] Database password hash:', dbU.passwordHash ? 'Exists' : 'Missing');
          
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
            createdAt: dbU.createdAt ? new Date(dbU.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: dbU.updatedAt ? new Date(dbU.updatedAt).toISOString() : new Date().toISOString(),
            isActive: true,
            emailVerified: false,
            failedLoginAttempts: 0,
            phoneNumber: dbU.phoneNumber || '', // ✅ ADDED
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

    console.log('🔐 [LOGIN] Stored password hash:', user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'MISSING');
    console.log('🔐 [LOGIN] Password provided:', password ? '****' : 'MISSING');
    
    const passwordHash = hashPassword(password);
    console.log('🔐 [LOGIN] Computed hash:', passwordHash.substring(0, 20) + '...');
    console.log('🔐 [LOGIN] Hashes match:', passwordHash === user.passwordHash);
    
    if (passwordHash !== user.passwordHash) {
      console.log('❌ [LOGIN] Invalid password for:', cleanEmail);
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

    console.log('✅ [LOGIN] Login successful for:', cleanEmail);
    return res.json({
      success: true,
      token: sessionToken,
      refreshToken,
      user: publicUser
    });
  } catch (error: any) {
    console.error('❌ [LOGIN] Login error:', error);
    console.error('❌ [LOGIN] Stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to authenticate'
    });
  }
}

// ============= TEST USER ENDPOINT =============

export async function handleTestCreateUser(req: Request, res: Response) {
  try {
    console.log('🧪 [TEST] Creating test user...');
    const { email, password } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Valid email is required'
      });
    }
    
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }
    
    const cleanEmail = email.trim().toLowerCase();
    console.log('🧪 [TEST] Email:', cleanEmail);
    
    const existingUser = findUserByEmail(cleanEmail);
    if (existingUser) {
      console.log('🧪 [TEST] User already exists');
      return res.json({
        success: true,
        message: 'User already exists',
        user: {
          email: existingUser.email,
          passwordHash: existingUser.passwordHash ? existingUser.passwordHash.substring(0, 20) + '...' : 'MISSING'
        }
      });
    }
    
    const passwordHash = hashPassword(password);
    console.log('🧪 [TEST] Password hash:', passwordHash.substring(0, 20) + '...');
    
    const userId = `usr_test_${Date.now()}`;
    const nowISO = new Date().toISOString();
    
    const user = {
      id: userId,
      email: cleanEmail,
      name: 'Test User',
      passwordHash: passwordHash,
      role: 'User',
      company: 'Test Company',
      jobTitle: 'Test Job',
      department: 'Test Department',
      selectedPlan: 'free',
      createdAt: nowISO,
      updatedAt: nowISO,
      phoneNumber: '', // ✅ ADDED
    };
    
    const userForMemory = {
      ...user,
      lastLoginAt: nowISO,
      authRole: 'User',
      mfaEnabled: false,
      pinCode: '',
      ipAddress: req.ip || 'unknown',
      companySize: '',
      isActive: true,
      emailVerified: false,
      failedLoginAttempts: 0,
      phoneNumber: '', // ✅ ADDED
    };
    usersDb.set(cleanEmail, userForMemory);
    console.log('✅ [TEST] Test user created in memory');
    
    if (db && isDatabaseConnected) {
      try {
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
          phoneNumber: '', // ✅ ADDED
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        } as any);
        console.log('✅ [TEST] Test user saved to database');
      } catch (dbErr) {
        console.warn('⚠️ [TEST] Database save error (continuing):', dbErr);
      }
    }
    
    return res.json({
      success: true,
      message: 'Test user created successfully',
      user: {
        email: cleanEmail,
        password: password,
        passwordHash: passwordHash,
        hashPrefix: passwordHash.substring(0, 20) + '...'
      }
    });
  } catch (error: any) {
    console.error('❌ [TEST] Test user error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create test user'
    });
  }
}

export async function handleSignup(req: Request, res: Response) {
  return handleRegister(req, res);
}

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
          phoneNumber: users.phoneNumber, // ✅ ADDED
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
            createdAt: dbU.createdAt ? new Date(dbU.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: dbU.updatedAt ? new Date(dbU.updatedAt).toISOString() : new Date().toISOString(),
            isActive: true,
            emailVerified: false,
            failedLoginAttempts: 0,
            phoneNumber: dbU.phoneNumber || '', // ✅ ADDED
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

// ============================================
// PROFILE UPDATE ENDPOINTS
// ============================================

export async function handleUpdateProfile(req: Request, res: Response) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const session = getVerifiedSession(token);
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid session' 
      });
    }

    const { name, jobTitle, companyName, department, phoneNumber } = req.body;
    const user = findUserByEmail(session.userEmail);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    const updatedUser = updateUser(session.userEmail, {
      name: name || user.name,
      jobTitle: jobTitle || user.jobTitle,
      companyName: companyName || user.companyName,
      department: department || user.department,
      phoneNumber: phoneNumber || user.phoneNumber,
    });

    if (!updatedUser) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update user' 
      });
    }

    const { passwordHash: _, ...publicUser } = updatedUser;

    console.log('✅ Profile updated for:', session.userEmail);
    return res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: publicUser
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update profile' 
    });
  }
}

export async function handleChangePassword(req: Request, res: Response) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const session = getVerifiedSession(token);
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid session' 
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = findUserByEmail(session.userEmail);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (hashPassword(currentPassword) !== user.passwordHash) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current password is incorrect' 
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'New password must be at least 8 characters long' 
      });
    }

    const updatedUser = updateUser(session.userEmail, {
      passwordHash: hashPassword(newPassword),
    });

    if (!updatedUser) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update password' 
      });
    }

    console.log('✅ Password changed for:', session.userEmail);
    return res.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to change password' 
    });
  }
}

// ============================================
// ROUTE REGISTRATION
// ============================================

router.post('/register', handleRegister);
router.post('/signup', handleSignup);
router.post('/login', handleLogin);
router.post('/test-create-user', handleTestCreateUser);
router.post('/logout', handleLogout);
router.get('/me', handleGetMe);
router.post('/me', handleGetMe);
router.post('/refresh', handleRefresh);
router.post('/forgot-password', handleForgotPassword);
router.post('/reset-password', handleResetPassword);
router.get('/verify-email', handleVerifyEmail);
router.put('/update-profile', handleUpdateProfile);
router.post('/change-password', handleChangePassword);

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

router.get('/oauth/callback/google', handleProviderOAuthFlow);
router.get('/oauth/callback/microsoft', handleProviderOAuthFlow);
router.post('/oauth/callback/google', handleProviderOAuthFlow);
router.post('/oauth/callback/microsoft', handleProviderOAuthFlow);

router.get('/:provider', (req, res, next) => {
  const p = req.params.provider;
  if (['register', 'signup', 'login', 'logout', 'me', 'refresh', 'forgot-password', 'reset-password', 'verify-email', 'oauth', 'test-create-user', 'update-profile', 'change-password'].includes(p)) {
    return next('route');
  }
  return handleProviderOAuthFlow(req, res);
});

export default router;
