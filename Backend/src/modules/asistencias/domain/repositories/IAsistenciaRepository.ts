// =================================================================
// CAPA: Domain / Repositories
// CONTRATO de persistencia del módulo Asistencias.
//
// IMPORTANTE: Todas las operaciones devuelven ENTIDADES del dominio
// (Cita, User, Configuracion). NUNCA Models de TypeORM.
//
// Para la vista enriquecida del panel de admisión (con joins de
// paciente, médico y especialidad) usamos una "vista" del dominio
// llamada CitaDelDia, que NO es una entidad sino un DTO de salida.
// =================================================================
import { Cita } from '../../../citas/domain/entities/cita.entity';
import { Configuracion } from '../../../administracion/domain/entities/configuracion.entity';
import { TipoNotificacion } from '../../../notificaciones/domain/entities/notificacion.entity';
import { Tx } from '../../../../shared/db/transaccion';

/**
 * Vista enriquecida de una cita con datos de paciente, médico y
 * especialidad. Es un DTO de salida del Domain, NO una entidad
 * (no se persiste).
 */
export interface CitaDelDia {
    cita: Cita;                       // entidad pura del dominio
    paciente_nombres: string;
    paciente_apellidos: string;
    paciente_dni: string;
    fecha: string;
    hora: string;
    id_medico: number;
    medico_nombres: string;
    medico_apellidos: string;
    especialidad: string;
}

export interface CitaParaMarcarDB {
    cita: Cita;
    fecha: string;   // YYYY-MM-DD
    hora: string;    // HH:MM:SS
}

export interface IAsistenciaRepository {
    /** Lista citas de un día con datos enriquecidos */
    listarCitasDelDia(fecha: string): Promise<CitaDelDia[]>;
    /** Cita + fecha/hora de su horario */
    obtenerCitaParaMarcar(idCita: number): Promise<CitaParaMarcarDB | null>;
    /** Cambia el estado solo si sigue en `estadoEsperado`. true = se cambió */
    cambiarEstadoCita(tx: Tx, idCita: number, nuevoEstado: string, estadoEsperado: string): Promise<boolean>;
    /** Incrementa el contador de inasistencias (consecutivas) y devuelve el total */
    incrementarInasistencias(tx: Tx, idUsuario: number): Promise<number>;
    /** Asistir reinicia el contador de inasistencias consecutivas */
    reiniciarInasistencias(tx: Tx, idUsuario: number): Promise<void>;
    /** Bloquea la cuenta del paciente */
    bloquearCuenta(tx: Tx, idUsuario: number): Promise<void>;
    /** Levanta la suspensión si no hay otro motivo (cancelaciones). true = se desbloqueó */
    desbloquearSiSoloPorInasistencias(tx: Tx, idUsuario: number, limiteCancelaciones: number): Promise<boolean>;
    /** Obtiene un parámetro de configuración como entidad del dominio */
    obtenerConfiguracion(clave: string): Promise<Configuracion | null>;
    crearNotificacion(tx: Tx, idUsuario: number, tipo: TipoNotificacion, mensaje: string, idCita: number | null): Promise<void>;
    /** Registra la marca en historial_asistencia (auditoría) */
    registrarHistorial(tx: Tx, idCita: number, idUsuario: number, estado: 'COMPLETADA' | 'FALTA'): Promise<void>;
    /** Citas RESERVADAS cuya hora ya pasó y que nadie marcó */
    citasVencidasSinMarcar(): Promise<number[]>;
}