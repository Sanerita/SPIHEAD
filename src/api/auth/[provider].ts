import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { usersDb, ServerUser, createSessionToken, createRefreshToken, findUserByEmail, updateUser } from '../sessionStore.js';

const router = Router();

interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  provider: string;
}

function createOAuthUser(profile: UserProfile, req?: Request): ServerUser {
  const now = new Date().toISOString();
  return {
    id: `usr_oauth_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
    email: profile.email.toLowerCase(),
    name: profile.name || profile.email.split('@')[0],
    passwordHash: '',
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
    emailVerified: true
  };
}

export async function exchangeOAuthCode(
  provider: string,
  code: string,
  redirectUri: string
): Promise<UserProfile> {
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured');
    }

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

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error('Failed to get access token');
      }

      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      const userData = await userRes.json();
      if (!userData.email) {
        throw new Error('Failed to get user email');
      }

      return {
        email: userData.email,
        name: userData.name || userData.email.split('@')[0],
        picture: userData.picture,
        provider: 'Google'
      };
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  } else {
    // Microsoft
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenant = process.env.MICROSOFT_TENANT_ID || 'common';

    if (!clientId || !clientSecret) {
      throw new Error('Microsoft OAuth not configured');
    }

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

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error('Failed to get access token');
      }

      const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      const userData = await userRes.json();
      const email = userData.mail || userData.userPrincipalName;
      
      if (!email) {
        throw new Error('Failed to get user email');
      }

      return {
        email,
        name: userData.displayName || email.split('@')[0],
        provider: 'Microsoft'
      };
    } catch (error) {
      console.error('Microsoft OAuth error:', error);
      throw new Error('Failed to authenticate with Microsoft');
    }
  }
}

export async function handleProviderOAuthFlow(req: Request, res: Response) {
  try {
    const provider = req.params.provider || req.query.provider || 'google';
    const code = req.query.code as string;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code required'
      });
    }

    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/oauth/callback/${provider}`;

    const profile = await exchangeOAuthCode(provider, code, redirectUri);
    const cleanEmail = profile.email.toLowerCase();

    let user = findUserByEmail(cleanEmail);

    if (!user) {
      // Create new user
      user = createOAuthUser(profile, req);
      usersDb.set(cleanEmail, user);

      if (db) {
        try {
          await db.insert(users).values({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            passwordHash: user.passwordHash,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            ipAddress: user.ipAddress
          });
        } catch (dbErr) {
          console.error('Failed to save OAuth user:', dbErr);
        }
      }
    } else {
      // Update existing user
      updateUser(cleanEmail, {
        lastLoginAt: new Date().toISOString(),
        ipAddress: req.ip || 'unknown'
      });
    }

    const sessionToken = createSessionToken(cleanEmail, req.ip, req.headers['user-agent']);
    const refreshToken = createRefreshToken(cleanEmail);

    const { passwordHash: _, ...publicUser } = user;

    // Return HTML for popup if needed
    if (req.headers.accept?.includes('text/html')) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Authentication Complete</title></head>
          <body>
            <script>
              window.opener.postMessage({
                type: 'OAUTH_SUCCESS',
                token: '${sessionToken}',
                refreshToken: '${refreshToken}',
                user: ${JSON.stringify(publicUser)}
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    return res.json({
      success: true,
      token: sessionToken,
      refreshToken,
      user: publicUser
    });
  } catch (error: any) {
    console.error('OAuth flow error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'OAuth authentication failed'
    });
  }
}

// Routes
router.get('/callback/:provider', handleProviderOAuthFlow);
router.post('/callback/:provider', handleProviderOAuthFlow);
router.get('/:provider', handleProviderOAuthFlow);

export default router;
