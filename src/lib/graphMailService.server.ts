import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { oauthTokens } from '../db/schema.js';
import crypto from 'crypto';

// In-memory fallback store, used only when DATABASE_URL isn't configured.
// NOTE: like the rest of this app's in-memory fallbacks, this will not
// survive across serverless cold starts / different instances. Configure
// DATABASE_URL for reliable token persistence in production.
const memoryTokens = new Map<string, StoredToken>();

interface StoredToken {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: number; // epoch ms
  scope?: string | null;
}

function tokenKey(userEmail: string, provider: string) {
  return `${provider}:${userEmail.toLowerCase().trim()}`;
}

export async function saveOAuthToken(
  userEmail: string,
  provider: string,
  accessToken: string,
  refreshToken: string | undefined | null,
  expiresInSeconds: number,
  scope?: string
) {
  const cleanEmail = userEmail.toLowerCase().trim();
  const expiresAt = Date.now() + expiresInSeconds * 1000;

  memoryTokens.set(tokenKey(cleanEmail, provider), {
    accessToken,
    refreshToken,
    expiresAt,
    scope,
  });

  if (db) {
    try {
      const existing = await db
        .select()
        .from(oauthTokens)
        .where(and(eq(oauthTokens.userEmail, cleanEmail), eq(oauthTokens.provider, provider)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(oauthTokens)
          .set({
            accessToken,
            refreshToken: refreshToken || existing[0].refreshToken,
            expiresAt: new Date(expiresAt),
            scope,
            updatedAt: new Date(),
          })
          .where(eq(oauthTokens.id, existing[0].id));
      } else {
        await db.insert(oauthTokens).values({
          id: 'tok_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex'),
          userEmail: cleanEmail,
          provider,
          accessToken,
          refreshToken: refreshToken || null,
          expiresAt: new Date(expiresAt),
          scope,
        });
      }
    } catch (err) {
      console.warn('Failed to persist OAuth token to Neon DB, using in-memory only:', err);
    }
  }
}

async function loadOAuthToken(userEmail: string, provider: string): Promise<StoredToken | null> {
  const cleanEmail = userEmail.toLowerCase().trim();
  const key = tokenKey(cleanEmail, provider);

  if (db) {
    try {
      const rows = await db
        .select()
        .from(oauthTokens)
        .where(and(eq(oauthTokens.userEmail, cleanEmail), eq(oauthTokens.provider, provider)))
        .limit(1);
      if (rows.length > 0) {
        const row = rows[0];
        const stored: StoredToken = {
          accessToken: row.accessToken,
          refreshToken: row.refreshToken,
          expiresAt: new Date(row.expiresAt).getTime(),
          scope: row.scope,
        };
        memoryTokens.set(key, stored);
        return stored;
      }
    } catch (err) {
      console.warn('Failed to load OAuth token from Neon DB, checking in-memory fallback:', err);
    }
  }

  return memoryTokens.get(key) || null;
}

async function refreshMicrosoftToken(refreshToken: string): Promise<StoredToken | null> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth is not configured on the server (missing MICROSOFT_CLIENT_ID/SECRET).');
  }

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data: any = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Microsoft access token.');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    scope: data.scope,
  };
}

/**
 * Returns a valid (non-expired) Microsoft Graph access token for this user,
 * transparently refreshing it if it's expired or about to expire. Returns
 * null if the user has never connected their Microsoft 365 account.
 */
export async function getValidMicrosoftAccessToken(userEmail: string): Promise<string | null> {
  const stored = await loadOAuthToken(userEmail, 'microsoft');
  if (!stored) return null;

  const bufferMs = 2 * 60 * 1000; // refresh 2 min before actual expiry
  if (Date.now() < stored.expiresAt - bufferMs) {
    return stored.accessToken;
  }

  if (!stored.refreshToken) {
    // Expired and no refresh token available (offline_access scope wasn't
    // granted, or this is a demo-mode token) — caller must re-connect.
    return null;
  }

  const refreshed = await refreshMicrosoftToken(stored.refreshToken);
  if (!refreshed) return null;

  await saveOAuthToken(
    userEmail,
    'microsoft',
    refreshed.accessToken,
    refreshed.refreshToken,
    Math.round((refreshed.expiresAt - Date.now()) / 1000),
    refreshed.scope || undefined
  );

  return refreshed.accessToken;
}

export interface SendMailParams {
  to: string;
  subject: string;
  bodyHtml: string;
}

/**
 * Sends a real email via the signed-in user's Microsoft 365 mailbox using
 * Microsoft Graph's POST /me/sendMail endpoint.
 */
export async function sendMailViaGraph(accessToken: string, params: SendMailParams) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: params.subject,
        body: {
          contentType: 'HTML',
          content: params.bodyHtml,
        },
        toRecipients: [{ emailAddress: { address: params.to } }],
      },
      saveToSentItems: true,
    }),
  });

  // Graph returns 202 Accepted with an empty body on success.
  if (res.status === 202) {
    return { success: true };
  }

  let errorBody: any = null;
  try {
    errorBody = await res.json();
  } catch {
    // ignore parse failure
  }
  const message =
    errorBody?.error?.message || `Microsoft Graph sendMail failed with status ${res.status}`;
  throw new Error(message);
}
