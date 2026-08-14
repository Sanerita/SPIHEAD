import { Router } from 'express';
import authRouter from './auth.js';
import loginRouter from './login.js';
import signupRouter from './signup.js';
import leadsRouter from './leads.js';
import { apiErrorHandler, apiNotFoundHandler } from './utils.js';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/login', loginRouter);
apiRouter.use('/signup', signupRouter);
apiRouter.use('/leads', leadsRouter);

export * from './utils.js';
export { apiRouter, apiErrorHandler, apiNotFoundHandler };
export default apiRouter;

