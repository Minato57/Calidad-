// =================================================================
// CAPA: Application / Services
// Lógica de negocio del módulo Citas.
//
// CAMBIO (Enfoque A1 - horarios virtuales):
//   - listarHorariosDisponibles ahora GENERA los slots al vuelo
//     (no lee horarios pre-cargados).
//   - reservarCita recibe fecha+hora, crea el horario en BD en
//     ese momento y luego crea la cita.
// =================================================================
import { IEspecialidadRepository } from '../../domain/repositories/IEspecialidadRepository';
import { IHorarioRepository } from '../../domain/repositories/IHorarioRepository';
import { ICitaRepository } from '../../domain/repositories/ICitaRepository';

import { EspecialidadRepository } from '../../infrastructure/repositories/especialidad.repository';
import { HorarioRepository } from '../../infrastructure/repositories/horario.repository';
import { CitaRepository } from '../../infrastructure/repositories/cita.repository';
import { HorarioVirtualRepository } from '../../infrastructure/repositories/horario-virtual.repository';
import { FamiliarRepository } from '../../../usuarios/infrastructure/repositories/familiar.repository';

import { ReservarCitaDTO } from '../dto/reservar-cita.dto';
import { CitaFactory } from '../../domain/factories/cita.factory';
import { fechaEsReservable, esHoraPasada } from '../../domain/horario.config';
import { PagoService } from '../../../pagos/application/services/pago.service';
import { evaluarCancelacion } from '../../domain/cancelacion';
import { enTransaccion, ErrorNegocio } from '../../../../shared/db/transaccion';

export class CitaService {
    private especialidadRepo: IEspecialidadRepository = new EspecialidadRepository();
    private horarioRepo: IHorarioRepository           = new HorarioRepository();
    private citaRepo: ICitaRepository                 = new CitaRepository();
    private horarioVirtualRepo                        = new HorarioVirtualRepository();
    private familiarRepo                              = new FamiliarRepository();
    private pagoService                               = new PagoService();

    // ============================================================
    // 1) Listar especialidades activas
    // ============================================================
    async listarEspecialidades() {
        const especialidades = await this.especialidadRepo.findActivas();
        return { ok: true, especialidades };
    }

    // ============================================================
    // 2) Listar horarios disponibles (GENERADOS AL VUELO)
    // ============================================================
    async listarHorariosDisponibles(fecha: string, idMedico: number) {
            const resultado = await this.horarioVirtualRepo.obtenerSlots(fecha, idMedico);
            if (!resultado.ok) {
                return { ok: false, mensaje: resultado.motivo };
            }
            return { ok: true, medico: resultado.medico, horarios: resultado.slots };
    }

    // ============================================================
    // 2b) Calendario del mes (para pintar el calendario visual)
    // ============================================================
    async obtenerCalendario(anio: number, mes: number, idMedico: number) {
            const resultado = await this.horarioVirtualRepo.obtenerCalendario(anio, mes, idMedico);
            return { ok: resultado.ok, dias: resultado.dias };
    }

    // ============================================================
    // 3) Reservar una cita (Enfoque A1)
    //
    //    Flujo:
    //      a) Validar que la fecha esté dentro de la ventana 2 meses
    //      b) Obtener el médico de la especialidad
    //      c) Verificar que el slot no esté ya ocupado
    //      d) Crear el horario en BD (ya ocupado)
    //      e) Crear la cita RESERVADA apuntando a ese horario
    // ============================================================
    async reservarCita(idUsuario: number, data: ReservarCitaDTO) {
        // (0) Datos obligatorios (ahora incluye el médico)
        if (!idUsuario || !data.fecha || !data.hora || !data.id_especialidad || !data.id_medico) {
            return { ok: false, mensaje: 'Faltan datos obligatorios' };
        }

        // (1) La cuenta no debe estar suspendida (se revalida aquí, no solo en login)
        const suspension = await this.verificarSuspension(idUsuario);
        if (suspension) {
            return { ok: false, mensaje: suspension };
        }

        // (2) Ventana de reserva (no pasado, no más de 2 meses, día laborable)
        const validez = fechaEsReservable(data.fecha);
        if (!validez.ok) {
            return { ok: false, mensaje: validez.motivo };
        }

        // (3) Al menos 2 horas de anticipación
        if (esHoraPasada(data.fecha, data.hora)) {
            return { ok: false, mensaje: 'Debes reservar con al menos 2 horas de anticipación' };
        }

        // (4) La especialidad debe existir
        const especialidad = await this.especialidadRepo.findById(data.id_especialidad);
        if (!especialidad) {
            return { ok: false, mensaje: 'La especialidad no existe' };
        }

        // (5) Datos del menor si la especialidad lo requiere
        if (especialidad.requiere_datos_menor) {
            if (!data.id_dependiente) {
                return { ok: false, mensaje: 'Esta especialidad requiere registrar los datos del menor' };
            }
            const pertenece = await this.familiarRepo.perteneceATutor(data.id_dependiente, idUsuario);
            if (!pertenece) {
                return { ok: false, mensaje: 'El familiar seleccionado no es válido' };
            }
        } else {
            data.id_dependiente = undefined;
        }

        // (6) El médico debe PERTENECER a la especialidad y estar disponible/visible.
        const medicos = await this.horarioVirtualRepo.listarMedicosDeEspecialidad(data.id_especialidad);
        const medicoValido = medicos.some(m => m.id_medico === data.id_medico);
        if (!medicoValido) {
            return { ok: false, mensaje: 'El médico seleccionado no pertenece a esa especialidad o no está disponible' };
        }

        // (7) La fecha+hora debe ser un SLOT real, en fecha habilitada y libre.
        const slotsRes = await this.horarioVirtualRepo.obtenerSlots(data.fecha, data.id_medico);
        if (!slotsRes.ok) {
            return { ok: false, mensaje: slotsRes.motivo };
        }
        const slot = slotsRes.slots.find(s => s.hora === data.hora);
        if (!slot) {
            return { ok: false, mensaje: 'La hora seleccionada no es un horario válido' };
        }
        if (!slot.disponible) {
            return { ok: false, mensaje: 'Ese horario ya fue reservado, selecciona otro.' };
        }

        // (8) El usuario no puede tener OTRA cita a la misma fecha+hora (con otro médico)
        if (await this.citaRepo.usuarioYaTieneCitaEn(idUsuario, data.fecha, data.hora)) {
            return { ok: false, mensaje: 'Ya tienes una cita reservada a esa misma hora' };
        }

        // (8.1) Cobro: con SIS la cita es gratuita; sin SIS se exige un pago aprobado.
        const cobro = await this.pagoService.validarParaReserva(idUsuario, data.id_dependiente, data.id_pago);
        if (!cobro.ok) {
            return { ok: false, mensaje: cobro.mensaje ?? 'Pago requerido', requiere_pago: true };
        }

        // (9) TRANSACCIÓN: tomar el horario + crear la cita + consumir el pago.
        //     Si cualquier paso falla, no queda nada a medias (ni horario ocupado
        //     sin cita, ni pago consumido sin cita).
        try {
            const guardada = await enTransaccion(async (tx) => {
                // Revalida dentro de la transacción (reservas simultáneas del mismo usuario)
                if (await this.citaRepo.usuarioYaTieneCitaEn(idUsuario, data.fecha, data.hora, tx)) {
                    throw new ErrorNegocio('Ya tienes una cita reservada a esa misma hora');
                }
                // Crea el horario o reutiliza uno cuyas citas fueron canceladas
                const idHorario = await this.horarioRepo.tomarHorario(tx, data.id_medico, data.fecha, data.hora);

                const nueva = CitaFactory.crearReserva(idUsuario, {
                    id_horario: idHorario,
                    id_especialidad: data.id_especialidad,
                    id_dependiente: data.id_dependiente,
                    motivo: data.motivo,
                    notas: data.notas,
                });
                const cita = await this.citaRepo.save(nueva, tx);
                await this.pagoService.confirmarCobro(cobro, idUsuario, cita.id_cita, tx);
                return cita;
            });
            return { ok: true, mensaje: '¡Felicidades, ya tienes tu cita reservada!', cita: guardada };
        } catch (err: any) {
            if (err instanceof ErrorNegocio) return { ok: false, mensaje: err.message, ...err.extra };
            throw err;
        }
    }

    // Verifica si la cuenta está suspendida (misma regla dinámica que el login).
    // Devuelve el mensaje de bloqueo, o null si puede reservar.
    private async verificarSuspension(idUsuario: number): Promise<string | null> {
        const estado = await this.citaRepo.obtenerEstadoUsuario(idUsuario);
        if (!estado || !estado.cuenta_bloqueada) {
            return null;
        }

        const limiteFaltas = Number(await this.citaRepo.obtenerConfig('limite_inasistencias')) || 3;
        const limiteCancel = Number(await this.citaRepo.obtenerConfig('limite_cancelaciones')) || 3;

        let claveDias = 'dias_suspension';
        let motivoTexto = 'inasistencias';
        if (estado.cancelaciones >= limiteCancel && estado.inasistencias < limiteFaltas) {
            claveDias = 'dias_suspension_cancelaciones';
            motivoTexto = 'cancelaciones de último momento';
        }

        const diasSuspension = Number(await this.citaRepo.obtenerConfig(claveDias)) || 15;

        if (!estado.fecha_bloqueo) {
            return 'Tu cuenta está suspendida. No puedes reservar citas.';
        }

        const bloqueo = new Date(estado.fecha_bloqueo + 'T00:00:00');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const diasTranscurridos = Math.floor((hoy.getTime() - bloqueo.getTime()) / (1000 * 60 * 60 * 24));

        if (diasTranscurridos >= diasSuspension) {
            await this.citaRepo.desbloquearCuenta(idUsuario);
            return null;
        }

        const restantes = diasSuspension - diasTranscurridos;
        return `Tu cuenta está suspendida por ${motivoTexto}. Podrás reservar en ${restantes} día(s).`;
    }

    // ============================================================
    // 4) Historial de citas del paciente
    // ============================================================
// ============================================================
    // 4) Historial de citas del paciente (CON datos enriquecidos)
    // ============================================================
    async historialPaciente(idUsuario: number) {
        const citas = await this.citaRepo.findDetalladasByUsuario(idUsuario);
        return { ok: true, citas };
    }

    // ============================================================
    // 5) Contadores del dashboard
    // ============================================================
    async contadoresPaciente(idUsuario: number) {
        const contadores = await this.citaRepo.contadoresPorUsuario(idUsuario);
        return { ok: true, contadores };
    }

    // ============================================================
    // 6) Todas las citas (ADMIN)
    // ============================================================
    async listarTodas() {
        const citas = await this.citaRepo.listarTodas();
        return { ok: true, total: citas.length, citas };
    }
    // ============================================================
    // 7) Cancelar una cita del paciente
    //    Verifica que la cita le pertenezca al usuario.
    // ============================================================
    async cancelarCita(idUsuario: number, idCita: number) {
        const cita = await this.citaRepo.findById(idCita);

        if (!cita) {
            return { ok: false, mensaje: 'La cita no existe' };
        }

        // Seguridad: solo el dueño puede cancelar su cita
        if (cita.id_usuario !== idUsuario) {
            return { ok: false, mensaje: 'No puedes cancelar una cita que no es tuya' };
        }

        // Solo se pueden cancelar citas activas
        if (cita.estado !== 'RESERVADA') {
            return { ok: false, mensaje: `No se puede cancelar una cita en estado ${cita.estado}` };
        }

        // No se puede cancelar una cita pasada; < 24 h sanciona (salvo periodo de gracia)
        const fechaHora = await this.citaRepo.obtenerFechaHoraDeCita(idCita);
        if (!fechaHora) {
            return { ok: false, mensaje: 'No se encontró el horario de la cita' };
        }
        const evaluacion = evaluarCancelacion({
            inicioCita: new Date(`${fechaHora.fecha}T${fechaHora.hora}`),
            reservadaEn: new Date(cita.fecha_registro),
            ahora: new Date(),
        });
        if (!evaluacion.permitida) {
            return { ok: false, mensaje: evaluacion.motivo! };
        }

        // TRANSACCIÓN: cancelar + liberar horario + sanción + notificación
        const limiteStr = await this.citaRepo.obtenerConfig('limite_cancelaciones');
        const limite = limiteStr ? Number(limiteStr) : 3;
        let sancionada = false;
        let cuentaBloqueada = false;
        try {
            await enTransaccion(async (tx) => {
                if (!(await this.citaRepo.cancelar(idCita, tx))) {
                    throw new ErrorNegocio('La cita ya no está activa', 400);
                }
                if (!evaluacion.sancionable) return;

                sancionada = true;
                const totalCancelaciones = await this.citaRepo.incrementarCancelaciones(idUsuario, tx);
                if (totalCancelaciones >= limite) {
                    await this.citaRepo.bloquearPorCancelaciones(idUsuario, tx);
                    cuentaBloqueada = true;
                    await this.citaRepo.crearNotificacion(
                        idUsuario,
                        `Tu cuenta ha sido suspendida por acumular ${totalCancelaciones} cancelaciones de último momento. No podrás agendar citas durante el periodo de suspensión.`,
                        idCita, tx, 'BLOQUEO_CUENTA',
                    );
                } else {
                    const restantes = limite - totalCancelaciones;
                    await this.citaRepo.crearNotificacion(
                        idUsuario,
                        `Registramos una cancelación de último momento (${totalCancelaciones} de ${limite}). Te ${restantes === 1 ? 'queda 1 cancelación' : `quedan ${restantes} cancelaciones`} antes de que tu cuenta sea suspendida.`,
                        idCita, tx, 'SANCION',
                    );
                }
            });
        } catch (err: any) {
            if (err instanceof ErrorNegocio) return { ok: false, mensaje: err.message };
            throw err;
        }

        let mensaje = 'Cita cancelada correctamente';
        if (sancionada && cuentaBloqueada) {
            mensaje = 'Cita cancelada. Has superado el límite de cancelaciones de último momento y tu cuenta ha sido suspendida.';
        } else if (sancionada) {
            mensaje = 'Cita cancelada. Ten en cuenta que cancelar con menos de 24h de anticipación cuenta como una cancelación tardía.';
        }

        // Si la cita estaba pagada, el pago queda como saldo a favor (no se pierde)
        const saldoAFavor = await this.pagoService.montoPagadoDeCita(idCita);
        if (saldoAFavor !== null) {
            mensaje += ` Tu pago de S/ ${saldoAFavor.toFixed(2)} queda como saldo a favor para una próxima cita de este paciente.`;
        }

        return { ok: true, mensaje, id_cita: idCita, sancionada, cuentaBloqueada, saldo_a_favor: saldoAFavor };
    }
    async listarMedicosDeEspecialidad(idEspecialidad: number) {
        const medicos = await this.horarioVirtualRepo.listarMedicosDeEspecialidad(idEspecialidad);
        return { ok: true, medicos };
    }
}