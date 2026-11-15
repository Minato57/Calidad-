// =================================================================
// CRON: aviso de vencimiento de la verificación del SIS.
// Todos los días a las 08:00 crea una notificación (buzón + correo vía
// el cron de correos) para los SIS activos que vencen en 7 días.
// =================================================================
import cron from 'node-cron';

import { SeguroService } from '../../modules/seguros/application/services/seguro.service';

const service = new SeguroService();

export const iniciarCronSeguros = () => {
    cron.schedule('0 8 * * *', async () => {
        try {
            const avisos = await service.avisarVencimientos();
            if (avisos > 0) console.log(`[CRON SIS] Avisos de vencimiento creados: ${avisos}`);
        } catch (error) {
            console.error('[CRON SIS] Error:', error);
        }
    });
    console.log('Cron de vencimiento del SIS iniciado (diario 08:00)');
};
