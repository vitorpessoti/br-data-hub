import { Router } from 'express';
import statusRoute from './status.route.js';
import authRoute from '../modules/auth/auth.route.js';
import cepRoute from '../modules/cep/cep.route.js';
import cnpjRoute from '../modules/cnpj/cnpj.route.js';
import jobRoute from '../modules/job/job.route.js';
import requireAuthentication from '../middlewares/require-authentication.middleware.js';

const router = Router();
const baseRoute = '/api/v1';

// Only these auth routes are open; every other request (existing route or not) needs a valid token.
export const PUBLIC_ROUTES = [
    `POST ${baseRoute}/auth/register`,
    `POST ${baseRoute}/auth/login`,
    `POST ${baseRoute}/auth/forgot-password`,
    `POST ${baseRoute}/auth/reset-password`,
];

router.use(requireAuthentication(PUBLIC_ROUTES));

router.use(`${baseRoute}/status`, statusRoute);
router.use(`${baseRoute}/auth`, authRoute);
router.use(`${baseRoute}/cep`, cepRoute);
router.use(`${baseRoute}/cnpj`, cnpjRoute);
router.use(`${baseRoute}/jobs`, jobRoute);
// router.use(`${baseRoute}/<recurso>`, <recurso>Route);

export default router;
