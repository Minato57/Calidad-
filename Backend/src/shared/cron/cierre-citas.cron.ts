// =================================================================
// CRON: cierre nocturno de citas.
// Todos los días a las 23:30, las citas RESERVADAS cuya hora ya pasó
// y que admisión no marcó pasan a FALTA con su sanción. Admisión puede
// corregirlas con "Asistió" el mismo día o el siguiente.
// =================================================================
import cron from 'node-cron';

import { AsistenciaService } from '../../modules/asistencias/application/services/asistencia.service';

const service = new AsistenciaService();

export const iniciarCronCierreCitas = () => {
    cron.schedule('30 23 * * *', async () => {
        try {
            const r = await service.cerrarCitasVencidas();
            if (r.revisadas > 0) console.log(`[CRON CIERRE] Citas sin marcar: ${r.revisadas}, registradas como falta: ${r.marcadas}`);
        } catch (error) {
            console.error('[CRON CIERRE] Error:', error);
        }
    });
    console.log('Cron de cierre de citas iniciado (diario 23:30)');
};
