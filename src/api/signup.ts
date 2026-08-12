import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { users } from '../db/schema';
import { usersDb, activeSessions, ServerUser } from './sessionStore';

export async function handleSignup(req: Request, res: Response) {
  try {
    const { fullName, email, password, companyName, companySize, role, selectedPlan } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid work email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check Neon DB and memory for existing user
    let existingInDb = null;
    try {
      const dbUsers = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
      if (dbUsers.length > 0) {
        existingInDb = dbUsers[0];
      }
    } catch (err) {
      console.warn('Neon DB user query warning during signup:', err);
    }

    if (existingInDb || usersDb.has(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: `An account with ${cleanEmail} already exists. Please sign in instead.`
      });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const userId = 'usr_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    const assignedRole = role || 'Admin';

    const newUser: ServerUser = {
      id: userId,
      email: cleanEmail,
      name: fullName?.trim() || 'Workspace Director',
      passwordHash,
      role: assignedRole,
      authRole: assignedRole,
      mfaEnabled: true,
      pinCode: '1234',
      lastLoginAt: new Date().toISOString(),
      jobTitle: `${companyName || 'Enterprise'} Workspace Administrator`,
      department: 'Executive Operations',
      ipAddress: req.ip || '127.0.0.1',
      companyName: companyName?.trim() || 'Enterprise Workspace',
      companySize: companySize || '11-50',
      selectedPlan: selectedPlan || 'small-business'
    };

    // Store in memory cache
    usersDb.set(cleanEmail, newUser);

    // Persist to Neon DB using Drizzle ORM
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

    // Issue Session Token
    const token = 'tok_' + crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, {
      userEmail: cleanEmail,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    const { passwordHash: _, ...publicProfile } = newUser;

    return res.json({
      success: true,
      token,
      user: publicProfile,
      message: 'Enterprise workspace account created successfully.'
    });
  } catch (err: any) {
    console.error('Error in signup endpoint:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during account registration.' });
  }
}

const router = Router();
router.post('/', handleSignup);
router.post('/signup', handleSignup);
router.get(['/', '/signup'], (req: Request, res: Response) => {
  return res.json({ success: true, message: 'SPIHEAD Authentication Signup API endpoint active. Use POST to register.' });
});

export default router;
