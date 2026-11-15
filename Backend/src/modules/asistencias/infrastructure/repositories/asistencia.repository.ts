// =================================================================
// CAPA: Infrastructure / Repositories
// Implementación CONCRETA de IAsistenciaRepository.
//
// ╔═══════════════════════════════════════════════════════════════╗
// ║  PATRÓN APLICADO: Repository + Data Mapper                    ║
// ║                                                                ║
// ║  El Repository es el ÚNICO lugar de la aplicación que conoce  ║
// ║  los Models de TypeORM. Internamente usa los Models para las  ║
// ║  queries, pero SIEMPRE devuelve entidades del Domain (Cita,   ║
// ║  User, Configuracion) gracias a los Mappings.                 ║
// ╚═══════════════════════════════════════════════════════════════╝
// =================================================================
import { Repository } from 'typeorm';

import { AppDataSource } from '../../../../config/datasource';

import {
    IAsistenciaRepository,
    CitaDelDia,
    CitaParaMarcarDB,
} from '../../domain/repositories/IAsistenciaRepository';
import { Tx } from '../../../../shared/db/transaccion';
import { TipoNotificacion } from '../../../notificaciones/domain/entities/notificacion.entity';

// ----- ENTIDADES del Domain (lo que devolvemos al Service) -----
import { Cita } from '../../../citas/domain/entities/cita.entity';
import { Configuracion } from '../../../administracion/domain/entities/configuracion.entity';

// ----- MODELS de TypeORM (uso INTERNO únicamente) -----
import { CitaModel } from '../../../citas/infrastructure/models/cita.model';
import { ConfiguracionModel } from '../../../administracion/infrastructure/models/configuracion.model';

// ----- MAPPINGS (traducen Model ⇄ Entity) -----
import { CitaMapping } from '../../../citas/infrastructure/mapping/cita.mapping';
import { ConfiguracionMapping } from '../../../administracion/infrastructure/mapping/configuracion.mapping';

// Helper: convierte una fecha de BD a "YYYY-MM-DD" en hora LOCAL
// (evita el desfase de un día que causaba toISOString con UTC)
function fechaLocalStr(fecha: any): string {
    if (fecha instanceof Date) {
        const a = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const d = String(fecha.getDate()).padStart(2, '0');
        return `${a}-${m}-${d}`;
    }
    return String(fecha).slice(0, 10);
}


export class AsistenciaRepository implements IAsistenciaRepository {
    // Los repos de TypeORM trabajan con Models (necesario por decoradores)
    private citaRepo: Repository<CitaModel>;
    private configRepo: Repository<ConfiguracionModel>;

    constructor() {
        this.citaRepo   = AppDataSource.getRepository(CitaModel);
        this.configRepo = AppDataSource.getRepository(ConfiguracionModel);
    }

    // ============================================================
    // Lista las citas de un día con datos enriquecidos.
    // ============================================================
    async listarCitasDelDia(fecha: string): Promise<CitaDelDia[]> {
        const rows = await this.citaRepo
            .createQueryBuilder('c')
            .innerJoin('horarios',       'h', 'h.id_horario = c.id_horario')
            .innerJoin('medicos',        'm', 'm.id_medico = h.id_medico')
            .innerJoin('especialidades', 'e', 'e.id_especialidad = m.id_especialidad')
            .innerJoin('usuarios',       'p', 'p.id_usuario = c.id_usuario')
            .select([
                'c.id_cita         AS id_cita',
                'c.id_usuario      AS id_usuario',
                'c.id_horario      AS id_horario',
                'c.id_dependiente  AS id_dependiente',
                'c.motivo          AS motivo',
                'c.notas           AS notas',
                'c.estado          AS estado',
                'c.fecha_registro  AS fecha_registro',
                'h.fecha           AS fecha',
                'h.hora            AS hora',
                'p.nombres         AS paciente_nombres',
                'p.apellidos       AS paciente_apellidos',
                'p.dni             AS paciente_dni',
                'm.id_medico       AS id_medico',
                'm.nombres         AS medico_nombres',
                'm.apellidos       AS medico_apellidos',
                'e.nombre          AS especialidad',
            ])
            .where('h.fecha = :fecha', { fecha })
            .orderBy('h.hora', 'ASC')
            .getRawMany();

        return rows.map(r => {
            const cita = new Cita(
                Number(r.id_cita),
                Number(r.id_usuario),
                Number(r.id_horario),
                r.id_dependiente ? Number(r.id_dependiente) : null,
                r.motivo,
                r.notas,
                r.estado,
                r.fecha_registro,
            );

            return {
                cita,
                paciente_nombres: r.paciente_nombres,
                paciente_apellidos: r.paciente_apellidos,
                paciente_dni: r.paciente_dni,
                fecha: fechaLocalStr(r.fecha),
                hora: r.hora,
                id_medico: Number(r.id_medico),
                medico_nombres: r.medico_nombres ?? '',
                medico_apellidos: r.medico_apellidos ?? '',
                especialidad: r.especialidad,
            };
        });
    }

    // ============================================================
    // Cita + su fecha/hora (para validar si se puede marcar)
    // ============================================================
    async obtenerCitaParaMarcar(idCita: number): Promise<CitaParaMarcarDB | null> {
        const model = await this.citaRepo.findOne({ where: { id_cita: idCita } });
        if (!model) return null;
        const [h] = await AppDataSource.query(
            `SELECT h.fecha, h.hora FROM horarios h WHERE h.id_horario = ? LIMIT 1`, [model.id_horario],
        );
        if (!h) return null;
        return { cita: CitaMapping.toDomain(model), fecha: fechaLocalStr(h.fecha), hora: String(h.hora) };
    }

    // ============================================================
    // Cambia el estado SOLO si la cita sigue en el estado esperado
    // (evita que dos personas la marquen a la vez). true = se cambió.
    // ============================================================
    async cambiarEstadoCita(tx: Tx, idCita: number, nuevoEstado: string, estadoEsperado: string): Promise<boolean> {
        const res = await tx.query(
            `UPDATE citas SET estado = ? WHERE id_cita = ? AND estado = ?`,
            [nuevoEstado, idCita, estadoEsperado],
        );
        return Number(res?.affectedRows ?? 0) > 0;
    }

    // ============================================================
    async incrementarInasistencias(tx: Tx, idUsuario: number): Promise<number> {
        await tx.query(`UPDATE usuarios SET inasistencias = inasistencias + 1 WHERE id_usuario = ?`, [idUsuario]);
        const [row] = await tx.query(`SELECT inasistencias FROM usuarios WHERE id_usuario = ?`, [idUsuario]);
        return row ? Number(row.inasistencias) : 0;
    }

    // Las inasistencias son CONSECUTIVAS: asistir reinicia el contador.
    async reiniciarInasistencias(tx: Tx, idUsuario: number): Promise<void> {
        await tx.query(`UPDATE usuarios SET inasistencias = 0 WHERE id_usuario = ?`, [idUsuario]);
    }

    // ============================================================
    async bloquearCuenta(tx: Tx, idUsuario: number): Promise<void> {
        const hoy = new Date();
        const fechaStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        await tx.query(
            `UPDATE usuarios SET cuenta_bloqueada = 1, fecha_bloqueo = ? WHERE id_usuario = ?`,
            [fechaStr, idUsuario],
        );
    }

    // Al corregir una falta: levanta la suspensión si NO hay otro motivo (cancelaciones).
    async desbloquearSiSoloPorInasistencias(tx: Tx, idUsuario: number, limiteCancelaciones: number): Promise<boolean> {
        const res = await tx.query(
            `UPDATE usuarios SET cuenta_bloqueada = 0, fecha_bloqueo = NULL
             WHERE id_usuario = ? AND cuenta_bloqueada = 1 AND cancelaciones < ?`,
            [idUsuario, limiteCancelaciones],
        );
        return Number(res?.affectedRows ?? 0) > 0;
    }

    // ============================================================
    async obtenerConfiguracion(clave: string): Promise<Configuracion | null> {
        const model = await this.configRepo.findOne({ where: { clave } });
        if (!model) return null;
        return ConfiguracionMapping.toDomain(model);
    }

    // Crea una notificación para el paciente (buzón + correo vía cron)
    async crearNotificacion(tx: Tx, idUsuario: number, tipo: TipoNotificacion, mensaje: string, idCita: number | null): Promise<void> {
        await tx.query(
            `INSERT INTO notificaciones (id_cita, id_usuario, tipo, mensaje, enviado, leida, fecha_programada)
             VALUES (?, ?, ?, ?, 1, 0, NOW())`,
            [idCita, idUsuario, tipo, mensaje],
        );
    }

    // Historial de asistencia (auditoría): cada marca queda registrada,
    // incluida la corrección de una falta (FALTA y luego COMPLETADA).
    async registrarHistorial(tx: Tx, idCita: number, idUsuario: number, estado: 'COMPLETADA' | 'FALTA'): Promise<void> {
        await tx.query(
            `INSERT INTO historial_asistencia (id_cita, id_usuario, estado) VALUES (?, ?, ?)`,
            [idCita, idUsuario, estado],
        );
    }

    // ============================================================
    // Citas RESERVADAS cuya hora ya pasó y que nadie marcó (cierre nocturno)
    // ============================================================
    async citasVencidasSinMarcar(): Promise<number[]> {
        const rows = await AppDataSource.query(
            `SELECT c.id_cita FROM citas c
             INNER JOIN horarios h ON h.id_horario = c.id_horario
             WHERE c.estado = 'RESERVADA' AND TIMESTAMP(h.fecha, h.hora) < NOW()
             ORDER BY h.fecha, h.hora`,
        );
        return rows.map((r: any) => Number(r.id_cita));
    }
}