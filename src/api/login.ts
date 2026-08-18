import { Router, Request, Response } from 'express';
import { handleLogin } from './auth.js';

const router = Router();

router.post('/', handleLogin);
router.post('/login', handleLogin);
router.get('/', (req: Request, res: Response) => {
  return res.json({
    success: true,
    message: 'Login API endpoint. Use POST to authenticate.'
  });
});

export default router;
