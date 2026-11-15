// =================================================================
// CAPA: Application / Services
// Gestión de asistencias (admisión) y cierre automático de citas.
//
// Ciclo de una cita: RESERVADA → COMPLETADA | FALTA (| CANCELADA)
//   - Admisión marca "Asistió" o "Falta" desde Citas de hoy.
//   - Asistir reinicia las inasistencias CONSECUTIVAS del paciente.
//   - Una falta marcada por error se corrige con "Asistió" el mismo día
//     o el siguiente: se retira la inasistencia y, si la suspensión era
//     solo por inasistencias, se levanta.
//   - Cierre nocturno: las citas que nadie marcó pasan a FALTA con su sanción.
// =================================================================
import { IAsistenciaRepository } from '../../domain/repositories/IAsistenciaRepository';
import { AsistenciaRepository } from '../../infrastructure/repositories/asistencia.repository';
import { evaluarMarcaAsistencia, evaluarMarcaFalta } from '../../domain/reglas-asistencia';
import { enTransaccion, ErrorNegocio } from '../../../../shared/db/transaccion';

function hoyLocal(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fechaLegible(fecha: string): string {
    const [a, m, d] = fecha.split('-');
    return `${d}/${m}/${a}`;
}

export class AsistenciaService {
    private repo: IAsistenciaRepository = new AsistenciaRepository();

    private async limite(clave: string, porDefecto: number): Promise<number> {
        const config = await this.repo.obtenerConfiguracion(clave);
        return config ? Number(config.valor) || porDefecto : porDefecto;
    }

    // ============================================================
    // 1) LISTAR CITAS DE UN DÍA (por defecto HOY en hora local)
    // ============================================================
    async listarCitasDelDia(fecha?: string) {
        const fechaConsulta = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : hoyLocal();
        const citas = await this.repo.listarCitasDelDia(fechaConsulta);
        return { ok: true, fecha: fechaConsulta, total: citas.length, citas };
    }

    // ============================================================
    // 2) MARCAR ASISTENCIA (RESERVADA → COMPLETADA, o corrección FALTA → COMPLETADA)
    // ============================================================
    async marcarAsistencia(idCita: number) {
        const datos = await this.repo.obtenerCitaParaMarcar(idCita);
        if (!datos) return { ok: false, mensaje: 'La cita no existe' };

        const { cita, fecha, hora } = datos;
        const ev = evaluarMarcaAsistencia({ estado: cita.estado, fecha, hora }, new Date());
        if (!ev.permitido) return { ok: false, mensaje: ev.motivo! };

        const limiteCancel = await this.limite('limite_cancelaciones', 3);
        let cuentaReactivada = false;
        try {
            await enTransaccion(async (tx) => {
                if (!(await this.repo.cambiarEstadoCita(tx, idCita, 'COMPLETADA', cita.estado))) {
                    throw new ErrorNegocio('La cita cambió de estado; actualiza la lista');
                }
                await this.repo.reiniciarInasistencias(tx, cita.id_usuario);
                await this.repo.registrarHistorial(tx, idCita, cita.id_usuario, 'COMPLETADA');

                if (ev.esCorreccion) {
                    cuentaReactivada = await this.repo.desbloquearSiSoloPorInasistencias(tx, cita.id_usuario, limiteCancel);
                    await this.repo.crearNotificacion(tx, cita.id_usuario, 'SANCION',
                        `Corregimos tu registro: sí asististe a tu cita del ${fechaLegible(fecha)}. Se retiró la inasistencia`
                        + (cuentaReactivada ? ' y tu cuenta fue reactivada.' : '.'),
                        idCita);
                }
            });
        } catch (err) {
            if (err instanceof ErrorNegocio) return { ok: false, mensaje: err.message };
            throw err;
        }

        return {
            ok: true,
            mensaje: ev.esCorreccion
                ? `Falta corregida: la cita quedó como completada${cuentaReactivada ? ' y la cuenta del paciente fue reactivada' : ''}`
                : 'Asistencia registrada correctamente',
            id_cita: idCita,
            nuevo_estado: 'COMPLETADA',
            correccion: !!ev.esCorreccion,
            cuenta_reactivada: cuentaReactivada,
        };
    }

    // ============================================================
    // 3) MARCAR INASISTENCIA (RESERVADA → FALTA + contador + suspensión)
    //    automatico = true cuando la marca el cierre nocturno.
    // ============================================================
    async marcarInasistencia(idCita: number, automatico = false) {
        const datos = await this.repo.obtenerCitaParaMarcar(idCita);
        if (!datos) return { ok: false, mensaje: 'La cita no existe' };

        const { cita, fecha, hora } = datos;
        const ev = evaluarMarcaFalta({ estado: cita.estado, fecha, hora }, new Date());
        if (!ev.permitido) return { ok: false, mensaje: ev.motivo! };

        const limite = await this.limite('limite_inasistencias', 3);
        let totalInasistencias = 0;
        let cuentaBloqueada = false;
        try {
            await enTransaccion(async (tx) => {
                if (!(await this.repo.cambiarEstadoCita(tx, idCita, 'FALTA', 'RESERVADA'))) {
                    throw new ErrorNegocio('La cita cambió de estado; actualiza la lista');
                }
                await this.repo.registrarHistorial(tx, idCita, cita.id_usuario, 'FALTA');
                totalInasistencias = await this.repo.incrementarInasistencias(tx, cita.id_usuario);
                const origen = automatico
                    ? `Tu cita del ${fechaLegible(fecha)} se registró como inasistencia porque no se marcó tu asistencia.`
                    : `Registramos una inasistencia a tu cita del ${fechaLegible(fecha)}.`;

                if (totalInasistencias >= limite) {
                    await this.repo.bloquearCuenta(tx, cita.id_usuario);
                    cuentaBloqueada = true;
                    await this.repo.crearNotificacion(tx, cita.id_usuario, 'BLOQUEO_CUENTA',
                        `${origen} Tu cuenta ha sido suspendida por acumular ${totalInasistencias} inasistencias consecutivas. No podrás agendar citas durante el periodo de suspensión.`,
                        idCita);
                } else {
                    const restantes = limite - totalInasistencias;
                    await this.repo.crearNotificacion(tx, cita.id_usuario, 'SANCION',
                        `${origen} Llevas ${totalInasistencias} de ${limite} inasistencias consecutivas; te ${restantes === 1 ? 'queda 1 falta' : `quedan ${restantes} faltas`} antes de que tu cuenta sea suspendida. Si asistes a tu próxima cita, el contador vuelve a cero.`,
                        idCita);
                }
            });
        } catch (err) {
            if (err instanceof ErrorNegocio) return { ok: false, mensaje: err.message };
            throw err;
        }

        return {
            ok: true,
            mensaje: 'Inasistencia registrada correctamente',
            id_cita: idCita,
            nuevo_estado: 'FALTA',
            inasistencias_totales: totalInasistencias,
            limite_configurado: limite,
            cuenta_bloqueada: cuentaBloqueada,
        };
    }

    // ============================================================
    // 4) CIERRE NOCTURNO: citas cuya hora ya pasó y nadie marcó → FALTA
    // ============================================================
    async cerrarCitasVencidas(): Promise<{ revisadas: number; marcadas: number }> {
        const ids = await this.repo.citasVencidasSinMarcar();
        let marcadas = 0;
        for (const id of ids) {
            try {
                const r = await this.marcarInasistencia(id, true);
                if (r.ok) marcadas++;
            } catch (err: any) {
                console.error(`[CIERRE CITAS] No se pudo cerrar la cita ${id}:`, err?.message);
            }
        }
        return { revisadas: ids.length, marcadas };
    }
}
