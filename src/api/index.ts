import { Router } from 'express';
import authRouter from './auth';
import loginRouter from './login';
import signupRouter from './signup';
import leadsRouter from './leads';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/login', loginRouter);
apiRouter.use('/signup', signupRouter);
apiRouter.use('/leads', leadsRouter);

export default apiRouter;
