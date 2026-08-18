import { Router, Request, Response } from 'express';
import { getVerifiedSession } from './sessionStore.js';
import { getValidMicrosoftAccessToken, sendMailViaGraph } from '../lib/graphMailService.server.js';

const router = Router();

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

router.post('/send', async (req: Request, res: Response) => {
  try {
    const token = getBearerToken(req);
    const session = token ? getVerifiedSession(token) : null;

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'You must be signed in to send email.',
      });
    }

    const { to, subject, body } = req.body || {};
    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, body.',
      });
    }

    const accessToken = await getValidMicrosoftAccessToken(session.userEmail);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          'No connected Microsoft 365 account found. Connect your Outlook account (Settings \u2192 M365 Integration) and grant Mail.Send permission, then try again.',
        code: 'M365_NOT_CONNECTED',
      });
    }

    await sendMailViaGraph(accessToken, {
      to,
      subject,
      bodyHtml: body,
    });

    return res.json({ success: true, message: `Email sent to ${to} via Microsoft 365.` });
  } catch (err: any) {
    console.error('Error in /api/mail/send:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to send email.',
    });
  }
});

export default router;
