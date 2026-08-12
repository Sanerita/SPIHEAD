import { Router } from 'express';
import authRouter from './auth';
import leadsRouter from './leads';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/leads', leadsRouter);

export default apiRouter;
