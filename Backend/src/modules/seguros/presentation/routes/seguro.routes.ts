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

router.get(
    '/captcha',
    authHandler({ roles: ['PACIENTE', 'ADMISION', 'ADMIN', 'MEDICO'] }),
    controller.captcha,
);

router.post(
    '/verificar-captcha',
    authHandler({ roles: ['PACIENTE', 'ADMISION', 'ADMIN', 'MEDICO'] }),
    controller.verificarCaptcha,
);

router.get(
    '/digito-verificador',
    authHandler({ roles: ['PACIENTE', 'ADMISION', 'ADMIN', 'MEDICO'] }),
    controller.digitoVerificador,
);

export default router;
