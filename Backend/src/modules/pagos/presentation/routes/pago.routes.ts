import { Router } from 'express';
import { authHandler } from '../../../../shared/middlewares/auth.handler';
import { PagoController } from '../controllers/pago.controller';

const router = Router();
const controller = new PagoController();

// Webhook público (Mercado Pago no envía JWT). Se re-valida contra la API de MP.
router.post('/webhook', controller.webhook);

router.get('/requisito',     authHandler({ roles: ['PACIENTE'] }), controller.requisito);
router.post('/checkout',     authHandler({ roles: ['PACIENTE'] }), controller.checkout);
router.get('/:id/verificar', authHandler({ roles: ['PACIENTE'] }), controller.verificar);

export default router;
