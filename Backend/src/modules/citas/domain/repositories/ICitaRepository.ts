// =================================================================
// CAPA: Domain / Repositories
// CONTRATO del repositorio de Citas.
// =================================================================
import { Cita } from '../entities/cita.entity';
import { Tx } from '../../../../shared/db/transaccion';
import { TipoNotificacion } from '../../../notificaciones/domain/entities/notificacion.entity';

export interface ICitaRepository {
    save(cita: Cita, tx?: Tx): Promise<Cita>;

    findByUsuario(idUsuario: number): Promise<Cita[]>;

    /**
     * Citas del paciente CON datos enriquecidos (fecha, hora,
     * especialidad, médico) para mostrar en el dashboard y mis-citas.
     */
    findDetalladasByUsuario(idUsuario: number): Promise<any[]>;

    contadoresPorUsuario(idUsuario: number): Promise<{
        total: number;
        completadas: number;
        proximas: number;
        canceladas: number;
        faltas: number;
    }>;

    listarTodas(): Promise<any[]>;

    /**
     * Busca una cita por id (entidad pura).
     */
    findById(idCita: number): Promise<Cita | null>;

    /**
     * Cambia el estado de una cita y libera su horario.
     */
    /** Cancela si sigue activa y libera el horario. false si ya no estaba activa. */
    cancelar(idCita: number, tx?: Tx): Promise<boolean>;
    obtenerFechaHoraDeCita(idCita: number): Promise<{ fecha: string; hora: string } | null>;
    incrementarCancelaciones(idUsuario: number, tx?: Tx): Promise<number>;
    bloquearPorCancelaciones(idUsuario: number, tx?: Tx): Promise<void>;
    obtenerConfig(clave: string): Promise<string | null>;
    obtenerEstadoUsuario(idUsuario: number): Promise<{
        cuenta_bloqueada: boolean;
        fecha_bloqueo: string | null;
        inasistencias: number;
        cancelaciones: number;
    } | null>;
    desbloquearCuenta(idUsuario: number): Promise<void>;
    usuarioYaTieneCitaEn(idUsuario: number, fecha: string, hora: string, tx?: Tx): Promise<boolean>;
    /** tipo por defecto: SANCION */
    crearNotificacion(idUsuario: number, mensaje: string, idCita?: number | null, tx?: Tx, tipo?: TipoNotificacion): Promise<void>;
}