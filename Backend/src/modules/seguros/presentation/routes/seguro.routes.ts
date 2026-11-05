import { Router } from 'express';
import { authHandler } from '../../../../shared/middlewares/auth.handler';
import { SeguroController } from '../controllers/seguro.controller';

const router = Router();
const controller = new SeguroController();

router.get(
    '/consulta',
    authHandler({ roles: ['PACIENTE', 'ADMISION', 'ADMIN', 'MEDICO'] }),
    controller.consultar,
);

export default router;
