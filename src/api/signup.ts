import { Router, Request, Response } from 'express';
import { handleRegister } from './auth.js';

const router = Router();

router.post('/', handleRegister);
router.post('/signup', handleRegister);
router.get('/', (req: Request, res: Response) => {
  return res.json({
    success: true,
    message: 'Signup API endpoint. Use POST to register.'
  });
});

export default router;
