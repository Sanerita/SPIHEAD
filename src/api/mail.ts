import { Router, Request, Response } from 'express';
import { getVerifiedSession } from './sessionStore.js';

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
        error: 'Authentication required'
      });
    }

    const { to, subject, body } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, body'
      });
    }

    // TODO: Implement actual email sending
    console.log(`Email would be sent to ${to} with subject "${subject}"`);

    return res.json({
      success: true,
      message: `Email sent to ${to}`
    });
  } catch (error: any) {
    console.error('Email send error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send email'
    });
  }
});

export default router;
