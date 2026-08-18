import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { usersDb, activeSessions, ServerUser, createSessionToken, getVerifiedSession } from './sessionStore.js';
import { handleProviderOAuthFlow } from './auth/[provider].js';

const router = Router();

// Helper function to create a ServerUser from database data
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
    emailVerified: dbU.emailVerified || false
  };
}

// Helper to create new user with only provided data
function createNewUser(userData: {
  email: string;
  name: string;
  passwordHash: string;
  role?: string;
  companyName?: string;
  ipAddress?: string;
}): ServerUser {
  const now = new Date().toISOString();
  return {
    id: `usr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
    email: userData.email.toLowerCase(),
    name: userData.name,
    passwordHash: userData.passwordHash,
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
    emailVerified: false
  };
}

/**
 * Handles POST /api/auth/login
 */
export async function handleLogin(req: Request, res: Response) {
  if (res.headersSent) return;
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ success: false, error: 'Password is required to sign in.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = usersDb.get(cleanEmail);

    // Query database if not in cache
    if (!user && db) {
      try {
        const dbResult = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (dbResult && dbResult.length > 0) {
          user = mapDbUserToServerUser(dbResult[0], req);
          usersDb.set(cleanEmail, user);
        }
      } catch (dbErr) {
        console.warn('DB user query error during login:', dbErr);
        return res.status(500).json({ success: false, error: 'Database error occurred.' });
      }
    }

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'No account found with this email. Please sign up first.' 
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        error: 'Account has been deactivated. Please contact support.' 
      });
    }

    // Validate password
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.passwordHash && passwordHash !== user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Incorrect password.' });
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    user.ipAddress = req.ip || user.ipAddress || 'unknown';
    usersDb.set(cleanEmail, user);

    // Update database
    if (db) {
      try {
        await db.update(users)
          .set({ 
            lastLoginAt: user.lastLoginAt,
            updatedAt: user.updatedAt,
            ipAddress: user.ipAddress
          })
          .where(eq(users.email, cleanEmail));
      } catch (dbErr) {
        console.warn('Failed to update last login:', dbErr);
      }
    }

    // Create session token
    const token = createSessionToken(cleanEmail);

    const { passwordHash: _, ...publicProfile } = user;

    return res.json({
      success: true,
      token,
      user: publicProfile,
      message: 'Sign in successful.'
    });
  } catch (err: any) {
    console.error('Error in login endpoint:', err);
    return res.status(500).json({ 
      success: false, 
      error: err?.message || 'Internal server error during authentication.' 
    });
  }
}

/**
 * Handles POST /api/auth/signup
 */
export async function handleSignup(req: Request, res: Response) {
  if (res.headersSent) return;
  try {
    const { fullName, email, password, companyName } = req.body || {};

    // Validate required fields
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        error: 'A valid email address is required.' 
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 8 characters long.' 
      });
    }

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Full name is required.' 
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check for existing user
    if (db) {
      try {
        const dbUsers = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (dbUsers && dbUsers.length > 0) {
          return res.status(400).json({
            success: false,
            error: `An account with ${cleanEmail} already exists. Please sign in.`
          });
        }
      } catch (err) {
        console.warn('Database check error during signup:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Error checking existing account.' 
        });
      }
    }

    if (usersDb.has(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: `An account with ${cleanEmail} already exists. Please sign in.`
      });
    }

    // Create new user
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const newUser = createNewUser({
      email: cleanEmail,
      name: fullName.trim(),
      passwordHash,
      companyName: companyName?.trim() || '',
      ipAddress: req.ip || 'unknown'
    });

    // Store in memory
    usersDb.set(cleanEmail, newUser);

    // Persist to database
    if (db) {
      try {
        await db.insert(users).values({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          company: newUser.companyName,
          passwordHash: newUser.passwordHash,
          jobTitle: newUser.jobTitle,
          department: newUser.department,
          selectedPlan: newUser.selectedPlan,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
          isActive: newUser.isActive,
          emailVerified: newUser.emailVerified,
          ipAddress: newUser.ipAddress
        });
      } catch (dbErr) {
        console.error('Failed to persist user to database:', dbErr);
        // Remove from memory if database fails
        usersDb.delete(cleanEmail);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create account. Please try again.' 
        });
      }
    }

    // Create session token
    const token = createSessionToken(cleanEmail);

    const { passwordHash: _, ...publicProfile } = newUser;

    return res.json({
      success: true,
      token,
      user: publicProfile,
      message: 'Account created successfully.'
    });
  } catch (err: any) {
    console.error('Error in signup endpoint:', err);
    return res.status(500).json({ 
      success: false, 
      error: err?.message || 'Internal server error during registration.' 
    });
  }
}

/**
 * Handles GET /api/auth/me
 */
export async function handleGetMe(req: Request, res: Response) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        isAuthenticated: false, 
        error: 'No token provided.' 
      });
    }

    const session = getVerifiedSession(token);
    if (!session) {
      activeSessions.delete(token);
      return res.status(401).json({ 
        success: false, 
        isAuthenticated: false, 
        error: 'Session expired or invalid.' 
      });
    }

    let user = usersDb.get(session.userEmail);
    
    if (!user && db) {
      try {
        const dbUsers = await db.select().from(users).where(eq(users.email, session.userEmail)).limit(1);
        if (dbUsers.length > 0) {
          user = mapDbUserToServerUser(dbUsers[0], req);
          usersDb.set(session.userEmail, user);
        }
      } catch (dbErr) {
        console.warn('DB user lookup error in /api/auth/me:', dbErr);
        return res.status(500).json({ 
          success: false, 
          isAuthenticated: false, 
          error: 'Database error occurred.' 
        });
      }
    }

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        isAuthenticated: false, 
        error: 'User account not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        isAuthenticated: false, 
        error: 'Account is deactivated.' 
      });
    }

    const { passwordHash: _, ...publicProfile } = user;
    return res.json({ 
      success: true, 
      isAuthenticated: true, 
      user: publicProfile 
    });
  } catch (err: any) {
    console.error('Error in /me endpoint:', err);
    return res.status(500).json({ 
      success: false, 
      isAuthenticated: false, 
      error: 'Failed to authenticate session.' 
    });
  }
}

/**
 * Handles POST /api/auth/logout
 */
export async function handleLogout(req: Request, res: Response) {
  try {
    const token = extractToken(req);
    if (token) {
      activeSessions.delete(token);
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    console.error('Logout error:', err);
    return res.status(500).json({ success: false, error: 'Logout failed.' });
  }
}

/**
 * Helper to extract token from request
 */
function extractToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  
  if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  }
  
  if (req.body && typeof req.body.token === 'string') {
    return req.body.token;
  }
  
  return '';
}

// ============= ROUTE REGISTRATION =============

// 1. Sign Up
router.post('/signup', handleSignup);
router.post('/signup/', handleSignup);
router.get('/signup', (req: Request, res: Response) => {
  return res.json({ success: true, message: 'Signup API endpoint. Use POST to register.' });
});

// 2. Login
router.post('/login', handleLogin);
router.post('/login/', handleLogin);
router.get('/login', (req: Request, res: Response) => {
  return res.json({ success: true, message: 'Login API endpoint. Use POST to sign in.' });
});

// 3. Current User
router.get('/me', handleGetMe);
router.get('/me/', handleGetMe);
router.post('/me', handleGetMe);
router.post('/me/', handleGetMe);

// 4. Logout
router.post('/logout', handleLogout);
router.post('/logout/', handleLogout);

// 5. OAuth URL
router.get('/oauth/url', (req: Request, res: Response) => {
  try {
    const provider = (req.query.provider as string || 'microsoft').toLowerCase();
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID || 'demo-google-client-id.apps.googleusercontent.com';
      const redirectUri = `${appUrl}/api/auth/oauth/callback/google`;
      const googleScopes = [
        'openid',
        'profile',
        'email',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/contacts.readonly'
      ];
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: googleScopes.join(' '),
        access_type: 'offline',
        prompt: 'consent'
      });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      return res.json({ success: true, url: authUrl, provider: 'Google Workspace' });
    } else {
      const clientId = process.env.MICROSOFT_CLIENT_ID || 'demo-m365-client-id';
      const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
      const redirectUri = `${appUrl}/api/auth/oauth/callback/microsoft`;
      const m365Scopes = [
        'openid',
        'profile',
        'email',
        'offline_access',
        'User.Read',
        'Mail.ReadWrite',
        'Mail.Send',
        'Calendars.ReadWrite',
        'Contacts.Read',
        'Contacts.ReadWrite',
        'OnlineMeetings.ReadWrite'
      ];
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: m365Scopes.join(' '),
        response_mode: 'query'
      });
      const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
      return res.json({ success: true, url: authUrl, provider: 'Microsoft 365' });
    }
  } catch (err: any) {
    console.error('OAuth URL error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate OAuth URL.' });
  }
});
router.get('/oauth/url/', (req: Request, res: Response) => {
  return res.redirect('/api/auth/oauth/url' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
});

// 6. OAuth Callbacks - Must be registered BEFORE wildcard route
router.get('/oauth/callback/google', handleProviderOAuthFlow);
router.get('/oauth/callback/google/', handleProviderOAuthFlow);
router.post('/oauth/callback/google', handleProviderOAuthFlow);
router.get('/oauth/callback/microsoft', handleProviderOAuthFlow);
router.get('/oauth/callback/microsoft/', handleProviderOAuthFlow);
router.post('/oauth/callback/microsoft', handleProviderOAuthFlow);

// 7. OAuth Provider routes (wildcard) - Must come LAST
router.get('/:provider', (req, res, next) => {
  const p = req.params.provider;
  if (['signup', 'login', 'me', 'logout', 'oauth'].includes(p)) {
    return next('route');
  }
  return handleProviderOAuthFlow(req, res);
});
router.post('/:provider', (req, res, next) => {
  const p = req.params.provider;
  if (['signup', 'login', 'me', 'logout', 'oauth'].includes(p)) {
    return next('route');
  }
  return handleProviderOAuthFlow(req, res);
});

// 8. OAuth Callback wildcard - Must come LAST
router.get('/callback/:provider', handleProviderOAuthFlow);
router.post('/callback/:provider', handleProviderOAuthFlow);

// 9. Deprecated SSO endpoint
router.post('/oauth/sso', async (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'This endpoint has been disabled. Please use the real OAuth sign-in.',
  });
});

export default router;
