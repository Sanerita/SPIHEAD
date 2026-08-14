import { Router, Request, Response } from 'express';
import { handleSignup } from './auth';

export { handleSignup };

const router = Router();
router.post('/', handleSignup);
router.post('/signup', handleSignup);
router.get(['/', '/signup'], (req: Request, res: Response) => {
  return res.json({ success: true, message: 'SPIHEAD Authentication Signup API endpoint active. Use POST to register.' });
});

export default router;
