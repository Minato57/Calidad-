import { Router } from 'express';
import { authHandler } from '../../../../shared/middlewares/auth.handler';
import { MedicoController } from '../controllers/medico.controller';
import { AtencionDTO } from '../../application/dto/atencion.dto';

const router = Router();
const controller = new MedicoController();

router.get('/perfil',     authHandler({ roles: ['MEDICO'] }), controller.perfil);
router.get('/citas-hoy',  authHandler({ roles: ['MEDICO'] }), controller.citasDelDia);
router.post('/citas/:id/atencion', authHandler({ roles: ['MEDICO'], dto: AtencionDTO }), controller.atender);

// Verificación pública de autenticidad de una receta por su código.
router.get('/verificar/:codigo', controller.verificar);

export default router;
