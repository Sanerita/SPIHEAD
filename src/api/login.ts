import { Router, Request, Response } from 'express';
import { handleLogin } from './auth';

export { handleLogin };

const router = Router();
router.post('/', handleLogin);
router.post('/login', handleLogin);
router.get(['/', '/login'], (req: Request, res: Response) => {
  return res.json({ success: true, message: 'SPIHEAD Authentication Login API endpoint active. Use POST to sign in.' });
});

export default router;
