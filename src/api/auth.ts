import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { usersDb, activeSessions, ServerUser, createSessionToken, getVerifiedSession } from './sessionStore.js';
import { handleProviderOAuthFlow } from './auth/[provider].js';

const router = Router();

/**
 * Handles POST /api/auth/login
 * Queries Neon PostgreSQL database via Drizzle ORM and validates credentials.
 */
export async function handleLogin(req: Request, res: Response) {
  if (res.headersSent) return;
  try {
    const { email, password, role } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      if (res.headersSent) return;
      return res.status(400).json({ success: false, error: 'Please enter a valid enterprise email address.' });
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      if (res.headersSent) return;
      return res.status(400).json({ success: false, error: 'Password is required to sign in.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = usersDb.get(cleanEmail);

    // Query Neon DB using Drizzle ORM if not cached in memory
    if (!user && db) {
      try {
        const dbResult = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (dbResult && dbResult.length > 0) {
          const dbU = dbResult[0];
          user = {
            id: dbU.id,
            email: dbU.email,
            name: dbU.name,
            passwordHash: dbU.passwordHash || crypto.createHash('sha256').update('Password123!').digest('hex'),
            role: dbU.role,
            authRole: dbU.role,
            mfaEnabled: true,
            pinCode: '1234',
            lastLoginAt: new Date().toISOString(),
            jobTitle: dbU.jobTitle || 'Workspace Director',
            department: dbU.department || 'Executive Operations',
            ipAddress: req.ip || '127.0.0.1',
            companyName: dbU.company || 'Enterprise Workspace',
            selectedPlan: dbU.selectedPlan || 'small-business'
          };
          usersDb.set(cleanEmail, user);
        }
      } catch (dbErr) {
        console.warn('DB user query error during login:', dbErr);
      }
    }

    if (!user) {
      // Auto-provision user account seamlessly if not found
      const userId = 'usr_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      const assignedRole = role || 'Admin';
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      const userName = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

      user = {
        id: userId,
        email: cleanEmail,
        name: userName || 'Enterprise Director',
        passwordHash,
        role: assignedRole,
        authRole: assignedRole,
        mfaEnabled: true,
        pinCode: '1234',
        lastLoginAt: new Date().toISOString(),
        jobTitle: 'Workspace Director',
        department: 'Executive Operations',
        ipAddress: req.ip || '127.0.0.1',
        companyName: 'SPIHEAD Enterprise',
        companySize: '11-50',
        selectedPlan: 'small-business'
      };

      usersDb.set(cleanEmail, user);

      if (db) {
        try {
          await db.insert(users).values({
            id: userId,
            name: user.name,
            email: cleanEmail,
            role: assignedRole,
            company: user.companyName,
            passwordHash: passwordHash,
            jobTitle: user.jobTitle,
            department: user.department,
            selectedPlan: user.selectedPlan,
          });
        } catch (dbErr) {
          console.warn('Auto-provision user in Neon DB warning:', dbErr);
        }
      }
    }

    // Validate password
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.passwordHash && passwordHash !== user.passwordHash) {
      if (res.headersSent) return;
      return res.status(401).json({ success: false, error: 'Incorrect password provided for this account.' });
    }

    // Update last login timestamp and optional role override
    user.lastLoginAt = new Date().toISOString();
    if (role) {
      user.role = role;
      user.authRole = role;
    }
    usersDb.set(cleanEmail, user);

    // Issue Session Token (stateless signed token)
    const token = createSessionToken(cleanEmail);

    const { passwordHash: _, ...publicProfile } = user;

    if (res.headersSent) return;
    return res.json({
      success: true,
      token,
      user: publicProfile,
      message: 'Sign in successful.'
    });
  } catch (err: any) {
    console.error('Error in login endpoint:', err);
    if (res.headersSent) return;
    return res.status(500).json({ success: false, error: err?.message || 'Internal server error during authentication.' });
  }
}

/**
 * Handles POST /api/auth/signup
 * Inserts new user account into Neon PostgreSQL database via Drizzle ORM.
 */
export async function handleSignup(req: Request, res: Response) {
  if (res.headersSent) return;
  try {
    const { fullName, email, password, companyName, companySize, role, selectedPlan } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      if (res.headersSent) return;
      return res.status(400).json({ success: false, error: 'A valid work email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      if (res.headersSent) return;
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check Neon DB and memory for existing user
    let existingInDb = null;
    if (db) {
      try {
        const dbUsers = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (dbUsers && dbUsers.length > 0) {
          existingInDb = dbUsers[0];
        }
      } catch (err) {
        console.warn('Neon DB user query warning during signup:', err);
      }
    }

    if (existingInDb || usersDb.has(cleanEmail)) {
      if (res.headersSent) return;
      return res.status(400).json({
        success: false,
        error: `An account with ${cleanEmail} already exists. Please sign in instead.`
      });
    }

    const safeFullName = typeof fullName === 'string' ? fullName.trim() : (fullName ? String(fullName) : '');
    const safeCompanyName = typeof companyName === 'string' ? companyName.trim() : (companyName ? String(companyName) : '');

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const userId = 'usr_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    const assignedRole = role || 'Admin';

    const newUser: ServerUser = {
      id: userId,
      email: cleanEmail,
      name: safeFullName || 'Workspace Director',
      passwordHash,
      role: assignedRole,
      authRole: assignedRole,
      mfaEnabled: true,
      pinCode: '1234',
      lastLoginAt: new Date().toISOString(),
      jobTitle: `${safeCompanyName || 'Enterprise'} Workspace Administrator`,
      department: 'Executive Operations',
      ipAddress: req.ip || '127.0.0.1',
      companyName: safeCompanyName || 'Enterprise Workspace',
      companySize: companySize || '11-50',
      selectedPlan: selectedPlan || 'small-business'
    };

    // Store in memory cache
    usersDb.set(cleanEmail, newUser);

    // Persist to Neon DB using Drizzle ORM
    if (db) {
      try {
        await db.insert(users).values({
          id: userId,
          name: newUser.name,
          email: cleanEmail,
          role: assignedRole,
          company: newUser.companyName,
          passwordHash: passwordHash,
          jobTitle: newUser.jobTitle,
          department: newUser.department,
          selectedPlan: newUser.selectedPlan,
        });
      } catch (dbErr) {
        console.warn('Persist user to Neon DB warning:', dbErr);
      }
    }

    // Issue Session Token (stateless signed token)
    const token = createSessionToken(cleanEmail);

    const { passwordHash: _, ...publicProfile } = newUser;

    if (res.headersSent) return;
    return res.json({
      success: true,
      token,
      user: publicProfile,
      message: 'Enterprise workspace account created successfully.'
    });
  } catch (err: any) {
    console.error('Error in signup endpoint:', err);
    if (res.headersSent) return;
    return res.status(500).json({ success: false, error: err?.message || 'Internal server error during account registration.' });
  }
}

// 1. Sign Up Endpoint (/api/auth/signup)
router.post(['/signup', '/signup/'], handleSignup);
router.get(['/signup', '/signup/'], (req: Request, res: Response) => {
  if (res.headersSent) return;
  return res.json({ success: true, message: 'SPIHEAD Authentication Signup API endpoint active. Use POST to register.' });
});

// 2. Sign In / Login Endpoint (/api/auth/login)
router.post(['/login', '/login/'], handleLogin);
router.get(['/login', '/login/'], (req: Request, res: Response) => {
  if (res.headersSent) return;
  return res.json({ success: true, message: 'SPIHEAD Authentication Login API endpoint active. Use POST to sign in.' });
});

// 3. Current User Endpoint (/api/auth/me)
router.all(['/me', '/me/'], async (req: Request, res: Response) => {
  try {
    let token = '';
    const authHeader = req.headers.authorization || (req.headers as any).Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    } else if (req.body && typeof req.body.token === 'string') {
      token = req.body.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, isAuthenticated: false, error: 'No token provided.' });
    }

    const session = getVerifiedSession(token);

    if (!session) {
      activeSessions.delete(token);
      return res.status(401).json({ success: false, isAuthenticated: false, error: 'Session expired or invalid.' });
    }

    let user = usersDb.get(session.userEmail);
    if (!user && db) {
      try {
        const dbUsers = await db.select().from(users).where(eq(users.email, session.userEmail)).limit(1);
        if (dbUsers.length > 0) {
          const dbU = dbUsers[0];
          user = {
            id: dbU.id,
            email: dbU.email,
            name: dbU.name,
            passwordHash: dbU.passwordHash || '',
            role: dbU.role || 'Admin',
            authRole: dbU.role || 'Admin',
            mfaEnabled: true,
            pinCode: '1234',
            lastLoginAt: new Date().toISOString(),
            jobTitle: dbU.jobTitle || 'Workspace Administrator',
            department: dbU.department || 'Executive Operations',
            ipAddress: req.ip || '127.0.0.1',
            companyName: dbU.company || 'Enterprise Workspace',
            selectedPlan: dbU.selectedPlan || 'small-business'
          };
          usersDb.set(session.userEmail, user);
        }
      } catch (dbErr) {
        console.warn('DB user lookup error in /api/auth/me:', dbErr);
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, isAuthenticated: false, error: 'User account not found.' });
    }

    const { passwordHash: _, ...publicProfile } = user;
    return res.json({ success: true, isAuthenticated: true, user: publicProfile });
  } catch (err: any) {
    return res.status(500).json({ success: false, isAuthenticated: false, error: 'Failed to authenticate session.' });
  }
});

// 4. OAuth Auth URL Endpoint (/api/auth/oauth/url)
router.all(['/oauth/url', '/oauth/url/'], (req: Request, res: Response) => {
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
      return res.json({ success: true, url: authUrl, provider: 'Google Workspace', scopes: googleScopes });
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
      return res.json({ success: true, url: authUrl, provider: 'Microsoft 365 Entra ID', scopes: m365Scopes });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to generate OAuth URL.' });
  }
});

// Helper function to handle OAuth user session setup
async function completeOAuthSignIn(email: string, name: string, providerName: string, req: Request) {
  const cleanEmail = email.toLowerCase().trim();
  let user = usersDb.get(cleanEmail);

  if (!user && db) {
    try {
      const dbUsers = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      if (dbUsers.length > 0) {
        const dbU = dbUsers[0];
        user = {
          id: dbU.id,
          email: dbU.email,
          name: dbU.name,
          passwordHash: dbU.passwordHash || '',
          role: dbU.role || 'Admin',
          authRole: dbU.role || 'Admin',
          mfaEnabled: true,
          pinCode: '1234',
          lastLoginAt: new Date().toISOString(),
          jobTitle: dbU.jobTitle || `${providerName} Administrator`,
          department: dbU.department || 'Executive Operations',
          ipAddress: req.ip || '127.0.0.1',
          companyName: dbU.company || `${providerName} Organization`,
          selectedPlan: dbU.selectedPlan || 'enterprise'
        };
      }
    } catch (err) {
      console.warn('DB lookup error during OAuth completion:', err);
    }
  }

  if (!user) {
    const userId = 'usr_oauth_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    user = {
      id: userId,
      email: cleanEmail,
      name: name || `${providerName} User`,
      passwordHash: crypto.createHash('sha256').update('OAuthPass123!').digest('hex'),
      role: 'Admin',
      authRole: 'Admin',
      mfaEnabled: true,
      pinCode: '1234',
      lastLoginAt: new Date().toISOString(),
      jobTitle: `${providerName} Verified Administrator`,
      department: 'Executive Operations',
      ipAddress: req.ip || '127.0.0.1',
      companyName: `${providerName} Enterprise Workspace`,
      selectedPlan: 'enterprise'
    };

    usersDb.set(cleanEmail, user);

    if (db) {
      try {
        await db.insert(users).values({
          id: userId,
          name: user.name,
          email: cleanEmail,
          role: 'Admin',
          company: user.companyName,
          passwordHash: user.passwordHash,
          jobTitle: user.jobTitle,
          department: user.department,
          selectedPlan: user.selectedPlan,
        });
      } catch (dbErr) {
        console.warn('DB insert error during OAuth user creation:', dbErr);
      }
    }
  } else {
    user.lastLoginAt = new Date().toISOString();
    usersDb.set(cleanEmail, user);
  }

  const token = createSessionToken(cleanEmail);

  const { passwordHash: _, ...publicProfile } = user;
  return { token, user: publicProfile };
}

// Render OAuth success HTML page to close popup and send postMessage
function renderOAuthSuccessHtml(token: string, user: any, provider: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>OAuth Success - ${provider}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b132b; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
      .card { background: #1c2541; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #3a506b; box-shadow: 0 20px 40px rgba(0,0,0,0.6); max-w: 400px; width: 90%; }
      .spinner { border: 3px solid rgba(255,255,255,0.1); border-left-color: #f59e0b; border-radius: 50%; width: 32px; height: 32px; animation: spin 0.8s linear infinite; margin: 0 auto 1.25rem; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      h2 { margin: 0 0 0.5rem; font-size: 1.25rem; color: #f59e0b; }
      p { margin: 0; font-size: 0.875rem; color: #94a3b8; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h2>Authenticated via ${provider}</h2>
      <p>Entering SPIHEAD Workspace...</p>
    </div>
    <script>
      const authPayload = ${JSON.stringify({ type: 'OAUTH_AUTH_SUCCESS', token, user, provider })};
      if (window.opener) {
        window.opener.postMessage(authPayload, '*');
        setTimeout(() => window.close(), 600);
      } else {
        window.location.href = '/';
      }
    </script>
  </body>
</html>`;
}

// 5. OAuth Callbacks (Handled securely via [provider] module)
router.all(['/oauth/callback/google', '/oauth/callback/google/'], (req, res) => {
  (req.params as any).provider = 'google';
  return handleProviderOAuthFlow(req, res);
});
router.all(['/oauth/callback/microsoft', '/oauth/callback/microsoft/'], (req, res) => {
  (req.params as any).provider = 'microsoft';
  return handleProviderOAuthFlow(req, res);
});
router.all(['/callback/:provider', '/callback/:provider/'], handleProviderOAuthFlow);
router.all(['/:provider', '/:provider/'], (req, res, next) => {
  const p = req.params.provider;
  if (['signup', 'login', 'me', 'logout', 'oauth'].includes(p)) {
    return next();
  }
  return handleProviderOAuthFlow(req, res);
});

// 6. Direct OAuth SSO POST handler
router.post('/oauth/sso', async (req: Request, res: Response) => {
  try {
    const { provider, email } = req.body;
    const providerName = provider === 'google' ? 'Google Workspace' : 'Microsoft 365';
    const targetEmail = email || (provider === 'google' ? 'google.workspace@spihead.com' : 'm365.executive@spihead.com');
    const name = provider === 'google' ? 'Google Workspace Director' : 'Microsoft 365 Enterprise Lead';

    const { token, user } = await completeOAuthSignIn(targetEmail, name, providerName, req);
    return res.json({
      success: true,
      token,
      user,
      message: `Signed in via ${providerName} Single Sign-On.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'OAuth SSO failed' });
  }
});

// 7. Logout Endpoint (/api/auth/logout)
router.post('/logout', (req: Request, res: Response) => {
  try {
    let token = '';
    const authHeader = req.headers.authorization || (req.headers as any).Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.body && typeof req.body.token === 'string') {
      token = req.body.token;
    }
    if (token) {
      activeSessions.delete(token);
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});

export default router;

