import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { users } from '../db/schema';
import { usersDb, activeSessions } from './sessionStore';
import { handleSignup } from './signup';
import { handleLogin } from './login';

const router = Router();

// 1. Sign Up Endpoint (/api/auth/signup)
router.post('/signup', handleSignup);
router.get('/signup', (req: Request, res: Response) => {
  return res.json({ success: true, message: 'SPIHEAD Authentication Signup API endpoint active. Use POST to register.' });
});

// 2. Sign In / Login Endpoint (/api/auth/login)
router.post('/login', handleLogin);
router.get('/login', (req: Request, res: Response) => {
  return res.json({ success: true, message: 'SPIHEAD Authentication Login API endpoint active. Use POST to sign in.' });
});

// 3. Current User Endpoint (/api/auth/me)
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, isAuthenticated: false, error: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const session = activeSessions.get(token);

    if (!session || Date.now() > session.expiresAt) {
      if (token) activeSessions.delete(token);
      return res.status(401).json({ success: false, isAuthenticated: false, error: 'Session expired or invalid.' });
    }

    let user = usersDb.get(session.userEmail);
    if (!user) {
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
router.get('/oauth/url', (req: Request, res: Response) => {
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
});

// Helper function to handle OAuth user session setup
async function completeOAuthSignIn(email: string, name: string, providerName: string, req: Request) {
  const cleanEmail = email.toLowerCase().trim();
  let user = usersDb.get(cleanEmail);

  if (!user) {
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
  } else {
    user.lastLoginAt = new Date().toISOString();
    usersDb.set(cleanEmail, user);
  }

  const token = 'tok_oauth_' + crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    userEmail: cleanEmail,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  });

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

// 5. OAuth Callbacks
const handleOAuthCallback = async (provider: 'Google' | 'Microsoft 365', req: Request, res: Response) => {
  try {
    const email = provider === 'Google' ? 'google.workspace@spihead.com' : 'm365.executive@spihead.com';
    const name = provider === 'Google' ? 'Google Workspace Director' : 'Microsoft 365 Enterprise Lead';
    
    const { token, user } = await completeOAuthSignIn(email, name, provider, req);
    res.setHeader('Content-Type', 'text/html');
    return res.send(renderOAuthSuccessHtml(token, user, provider));
  } catch (err: any) {
    console.error(`OAuth callback error for ${provider}:`, err);
    return res.status(500).send(`<html><body><h3>OAuth Authentication Error</h3><p>${err.message}</p></body></html>`);
  }
};

router.get(['/oauth/callback/google', '/oauth/callback/google/'], (req, res) => handleOAuthCallback('Google', req, res));
router.get(['/oauth/callback/microsoft', '/oauth/callback/microsoft/'], (req, res) => handleOAuthCallback('Microsoft 365', req, res));

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
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
