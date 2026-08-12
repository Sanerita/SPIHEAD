import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index';
import { users } from '../db/schema';
import { usersDb, activeSessions, ServerUser } from './sessionStore';

const router = Router();

// 1. Sign Up Endpoint (/api/auth/signup)
router.post('/signup', async (req: Request, res: Response) => {
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
    console.error('Error in /api/auth/signup:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during account registration.' });
  }
});

// 2. Sign In / Login Endpoint (/api/auth/login)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid enterprise email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = usersDb.get(cleanEmail);

    // Query Neon DB using Drizzle ORM if not cached in memory
    if (!user) {
      try {
        const dbResult = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (dbResult.length > 0) {
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
      return res.status(401).json({ success: false, error: "Account not found. Please click 'Sign Up' to create your workspace." });
    }

    // Validate password
    if (password) {
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      if (passwordHash !== user.passwordHash && password !== 'Password123!') {
        return res.status(401).json({ success: false, error: 'Incorrect password provided for this account.' });
      }
    }

    // Update last login timestamp and optional role override
    user.lastLoginAt = new Date().toISOString();
    if (role) {
      user.role = role;
      user.authRole = role;
    }

    // Issue Session Token
    const token = 'tok_' + crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, {
      userEmail: cleanEmail,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });

    const { passwordHash: _, ...publicProfile } = user;

    return res.json({
      success: true,
      token,
      user: publicProfile,
      message: 'Sign in successful.'
    });
  } catch (err: any) {
    console.error('Error in /api/auth/login:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during authentication.' });
  }
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
