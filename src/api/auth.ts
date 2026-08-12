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

// 2. Sign In / Login Endpoint (/api/auth/login)
router.post('/login', handleLogin);

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

// 4. Logout Endpoint (/api/auth/logout)
router.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
