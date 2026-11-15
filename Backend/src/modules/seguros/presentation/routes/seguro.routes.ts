import { Router } from 'express';
import { authHandler } from '../../../../shared/middlewares/auth.handler';
import { SeguroController } from '../controllers/seguro.controller';

const router = Router();
const controller = new SeguroController();

// Lectura: también la usa el personal (consulta de un DNI).
router.get('/consulta', authHandler({ roles: ['PACIENTE', 'ADMISION', 'ADMIN', 'MEDICO'] }), controller.consultar);

// La verificación la hace cada paciente por sí mismo (titular o sus familiares).
router.get('/mis-estados',        authHandler({ roles: ['PACIENTE'] }), controller.misEstados);
router.get('/captcha',            authHandler({ roles: ['PACIENTE'] }), controller.captcha);
router.post('/verificar-captcha', authHandler({ roles: ['PACIENTE'] }), controller.verificarCaptcha);

export default router;
