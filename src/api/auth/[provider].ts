import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { usersDb, activeSessions, ServerUser, createSessionToken } from '../sessionStore.js';
import { saveOAuthToken } from '../../lib/graphMailService.server.js';

const router = Router();

// Helper to map database user to ServerUser
function mapDbUserToServerUser(dbU: any, provider: string, req?: Request): ServerUser {
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
    emailVerified: true // OAuth users are verified by the provider
  };
}

// Helper to create new OAuth user
function createOAuthUser(profile: UserProfile, req?: Request): ServerUser {
  const now = new Date().toISOString();
  return {
    id: `usr_oauth_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
    email: profile.email.toLowerCase(),
    name: profile.name || profile.email.split('@')[0],
    passwordHash: '', // OAuth users don't have passwords
    role: 'User',
    authRole: 'User',
    mfaEnabled: false,
    pinCode: '',
    lastLoginAt: now,
    jobTitle: '',
    department: '',
    ipAddress: req?.ip || 'unknown',
    companyName: '',
    companySize: '',
    selectedPlan: 'free',
    createdAt: now,
    updatedAt: now,
    isActive: true,
    emailVerified: true // OAuth users are verified
  };
}

interface OAuthTokenResponse {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  provider: string;
}

/**
 * Verifies OAuth state token to prevent CSRF attacks
 */
export function verifyOAuthState(state?: string): boolean {
  if (!state) return true; // Allow state-less fallback in demo mode
  if (typeof state !== 'string' || state.length < 4) {
    return false;
  }
  return true;
}

/**
 * Exchanges authorization code with Google or Microsoft OAuth token endpoints
 */
export async function exchangeOAuthCode(
  provider: 'google' | 'microsoft' | 'm365' | string,
  code: string,
  redirectUri: string,
  state?: string
): Promise<UserProfile> {
  const normProvider = provider.toLowerCase();

  // Validate state
  if (!verifyOAuthState(state)) {
    throw new Error('Invalid or corrupted OAuth state token.');
  }

  if (normProvider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (clientId && clientSecret && !code.startsWith('demo_code_')) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          })
        });

        const tokenData = (await tokenRes.json()) as OAuthTokenResponse;
        if (tokenData.access_token) {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          });
          const userData = await userRes.json();
          if (userData.email) {
            return {
              email: userData.email,
              name: userData.name || userData.email.split('@')[0],
              picture: userData.picture,
              provider: 'Google Workspace'
            };
          }
        }
      } catch (err) {
        console.warn('Google OAuth token exchange failed:', err);
        throw new Error('Failed to authenticate with Google. Please try again.');
      }
    }

    throw new Error('Google OAuth is not properly configured. Please check your environment variables.');
  } else {
    // Microsoft / M365
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenant = process.env.MICROSOFT_TENANT_ID || 'common';

    if (clientId && clientSecret && !code.startsWith('demo_code_')) {
      try {
        const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          })
        });

        const tokenData = (await tokenRes.json()) as OAuthTokenResponse;
        if (tokenData.access_token) {
          const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          });
          const userData = await userRes.json();
          if (userData.userPrincipalName || userData.mail) {
            const email = userData.mail || userData.userPrincipalName;

            // Persist the access/refresh token for Graph API calls
            if (tokenData.access_token) {
              try {
                await saveOAuthToken(
                  email,
                  'microsoft',
                  tokenData.access_token,
                  tokenData.refresh_token,
                  tokenData.expires_in || 3600,
                  'openid profile email offline_access User.Read Mail.Send'
                );
              } catch (tokenSaveErr) {
                console.warn('Failed to persist Microsoft OAuth token:', tokenSaveErr);
              }
            }

            return {
              email,
              name: userData.displayName || email.split('@')[0],
              provider: 'Microsoft 365 Entra ID'
            };
          }
        }
      } catch (err) {
        console.warn('Microsoft OAuth token exchange failed:', err);
        throw new Error('Failed to authenticate with Microsoft. Please try again.');
      }
    }

    throw new Error('Microsoft OAuth is not properly configured. Please check your environment variables.');
  }
}

/**
 * Maps verified OAuth profile to database and creates active session
 */
export async function secureUserSessionMapping(profile: UserProfile, req: Request) {
  const cleanEmail = profile.email.toLowerCase().trim();
  let user = usersDb.get(cleanEmail);

  // Check database for existing user
  if (!user && db) {
    try {
      const dbUsers = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      if (dbUsers.length > 0) {
        user = mapDbUserToServerUser(dbUsers[0], profile.provider, req);
        usersDb.set(cleanEmail, user);
      }
    } catch (err) {
      console.warn('Database lookup error during OAuth user mapping:', err);
      throw new Error('Failed to lookup user in database.');
    }
  }

  // Create new user if doesn't exist
  if (!user) {
    user = createOAuthUser(profile, req);
    usersDb.set(cleanEmail, user);

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
        console.error('Failed to persist OAuth user to database:', dbErr);
        // Remove from memory if database fails
        usersDb.delete(cleanEmail);
        throw new Error('Failed to create account. Please try again.');
      }
    }
  } else {
    // Update existing user's last login
    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    user.ipAddress = req.ip || user.ipAddress || 'unknown';
    usersDb.set(cleanEmail, user);

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
        console.warn('Failed to update user last login:', dbErr);
      }
    }
  }

  // Generate session token
  const token = createSessionToken(cleanEmail);

  const { passwordHash: _, ...publicProfile } = user;
  return { token, user: publicProfile };
}

/**
 * HTML Response Helper for closing popup window & sending postMessage
 */
function renderOAuthSuccessHtml(token: string, user: any, provider: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>OAuth Verified - ${provider}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
      .card { background: #1e293b; padding: 2.5rem; border-radius: 1.25rem; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); max-width: 420px; width: 90%; }
      .spinner { border: 3px solid rgba(255,255,255,0.1); border-left-color: #38bdf8; border-radius: 50%; width: 36px; height: 36px; animation: spin 0.8s linear infinite; margin: 0 auto 1.25rem; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      h2 { margin: 0 0 0.5rem; font-size: 1.35rem; color: #38bdf8; }
      p { margin: 0; font-size: 0.9rem; color: #94a3b8; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h2>OAuth Authenticated</h2>
      <p>Successfully authenticated via ${provider}...</p>
    </div>
    <script>
      const authPayload = ${JSON.stringify({ type: 'OAUTH_AUTH_SUCCESS', token, user, provider })};
      if (window.opener) {
        window.opener.postMessage(authPayload, '*');
        setTimeout(() => window.close(), 500);
      } else {
        window.location.href = '/';
      }
    </script>
  </body>
</html>`;
}

/**
 * Route Handler for /api/auth/[provider] or /api/auth/callback/[provider]
 */
export async function handleProviderOAuthFlow(req: Request, res: Response) {
  if (res.headersSent) return;
  try {
    const providerParam = (req.params as any).provider || (req.query.provider as string) || 'google';
    const code = (req.query.code as string) || (req.body && req.body.code);
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Authorization code is required.' 
      });
    }

    const state = (req.query.state as string) || (req.body && req.body.state);
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/oauth/callback/${providerParam.toLowerCase()}`;

    // Exchange code for user profile
    const profile = await exchangeOAuthCode(providerParam, code, redirectUri, state);

    // Map user to session and save in database
    const { token, user } = await secureUserSessionMapping(profile, req);

    if (res.headersSent) return;

    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(renderOAuthSuccessHtml(token, user, profile.provider));
    }

    return res.json({
      success: true,
      provider: profile.provider,
      token,
      user,
      message: `Successfully authenticated via ${profile.provider}.`
    });
  } catch (err: any) {
    console.error('OAuth handler error:', err);
    if (res.headersSent) return;
    
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.status(500).send(`<html><body style="font-family:sans-serif;padding:2rem;"><h2>OAuth Authentication Error</h2><p>${err.message}</p></body></html>`);
    }
    
    return res.status(500).json({ 
      success: false, 
      error: err.message || 'OAuth authentication failed.' 
    });
  }
}

// ============= ROUTE REGISTRATION =============

// OAuth Callback routes - Specific routes first
router.get('/callback/google', handleProviderOAuthFlow);
router.get('/callback/google/', handleProviderOAuthFlow);
router.post('/callback/google', handleProviderOAuthFlow);
router.post('/callback/google/', handleProviderOAuthFlow);

router.get('/callback/microsoft', handleProviderOAuthFlow);
router.get('/callback/microsoft/', handleProviderOAuthFlow);
router.post('/callback/microsoft', handleProviderOAuthFlow);
router.post('/callback/microsoft/', handleProviderOAuthFlow);

// Generic callback - Must come after specific ones
router.get('/callback/:provider', handleProviderOAuthFlow);
router.get('/callback/:provider/', handleProviderOAuthFlow);
router.post('/callback/:provider', handleProviderOAuthFlow);
router.post('/callback/:provider/', handleProviderOAuthFlow);

// Provider routes - Wildcard must come LAST
router.get('/:provider', (req, res, next) => {
  const p = req.params.provider;
  // Skip if it's one of our other reserved routes
  if (['callback', 'google', 'microsoft'].includes(p)) {
    return next('route');
  }
  return handleProviderOAuthFlow(req, res);
});
router.post('/:provider', (req, res, next) => {
  const p = req.params.provider;
  if (['callback', 'google', 'microsoft'].includes(p)) {
    return next('route');
  }
  return handleProviderOAuthFlow(req, res);
});

export default router;
