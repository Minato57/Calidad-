// =================================================================
// CAPA: Infrastructure / Repositories
// Implementación CONCRETA de IAdminRepository usando TypeORM.
// Aquí ocurren las queries reales contra MySQL.
//
// PATRONES APLICADOS:
//   - Abstract Factory (UsuarioFactory.crearAdmision) para
//     construir el usuario antes de mapearlo al Model de TypeORM.
//     Esto garantiza que el rol ADMISION y los campos por defecto
//     (inasistencias=0, activo=true, etc.) sean consistentes.
//
// Reutiliza models de otros módulos: CitaModel, EspecialidadModel,
// UserModel.
// =================================================================
import { Repository } from 'typeorm';

import { AppDataSource } from '../../../../config/datasource';

import { IAdminRepository } from '../../domain/repositories/IAdminRepository';
import { Configuracion } from '../../domain/entities/configuracion.entity';

import { FechaBloqueadaModel } from '../models/fecha-bloqueada.model';
import { ConfiguracionModel } from '../models/configuracion.model';
import { ConfiguracionMapping } from '../mapping/configuracion.mapping';

// Reutilizamos los models de otros módulos
import { CitaModel } from '../../../citas/infrastructure/models/cita.model';
import { EspecialidadModel } from '../../../citas/infrastructure/models/especialidad.model';
import { UserModel } from '../../../usuarios/infrastructure/models/user.model';
import { MedicoModel } from '../../../citas/infrastructure/models/medico.model';
//  Patrón Abstract Factory aplicado también aquí
import { UsuarioFactory } from '../../../usuarios/domain/factories/usuario.factory';

export class AdminRepository implements IAdminRepository {
    private fechaBloqueadaRepo: Repository<FechaBloqueadaModel>;
    private configuracionRepo: Repository<ConfiguracionModel>;
    private citaRepo: Repository<CitaModel>;
    private especialidadRepo: Repository<EspecialidadModel>;
    private userRepo: Repository<UserModel>;
    private medicoRepo: Repository<MedicoModel>;

    constructor() {
        this.fechaBloqueadaRepo = AppDataSource.getRepository(FechaBloqueadaModel);
        this.configuracionRepo  = AppDataSource.getRepository(ConfiguracionModel);
        this.citaRepo           = AppDataSource.getRepository(CitaModel);
        this.especialidadRepo   = AppDataSource.getRepository(EspecialidadModel);
        this.userRepo           = AppDataSource.getRepository(UserModel);
        this.medicoRepo         = AppDataSource.getRepository(MedicoModel);
    }

    // =============================================================
    // 1) CANCELACIÓN MASIVA
    // =============================================================
    async cancelarCitasPorFechaEspecialidad(
        fecha: string,
        idEspecialidad: number,
        _motivo: string,
    ): Promise<{ afectadas: number; idsUsuariosAfectados: number[] }> {
        const citas = await this.citaRepo
            .createQueryBuilder('c')
            .innerJoin('horarios', 'h',  'h.id_horario = c.id_horario')
            .innerJoin('medicos',  'm',  'm.id_medico = h.id_medico')
            .select(['c.id_cita AS id_cita', 'c.id_usuario AS id_usuario'])
            .where('h.fecha = :fecha', { fecha })
            .andWhere('m.id_especialidad = :idEsp', { idEsp: idEspecialidad })
            .andWhere("c.estado NOT IN ('CANCELADA','COMPLETADA','FALTA')")
            .getRawMany();

        if (citas.length === 0) {
            return { afectadas: 0, idsUsuariosAfectados: [] };
        }

        const idsCitas    = citas.map(c => c.id_cita);
        const idsUsuarios = citas.map(c => c.id_usuario);

        await this.citaRepo
            .createQueryBuilder()
            .update(CitaModel)
            .set({ estado: 'CANCELADA' })
            .whereInIds(idsCitas)
            .execute();

        return {
            afectadas: idsCitas.length,
            idsUsuariosAfectados: idsUsuarios,
        };
    }

    async insertarNotificacionesMasivas(
        idsUsuarios: number[],
        idCita: number | null,
        mensaje: string,
    ): Promise<void> {
        if (idsUsuarios.length === 0) return;

        const values = idsUsuarios.map(idUsuario => ({
            id_cita: idCita,
            id_usuario: idUsuario,
            tipo: 'CANCELACION',
            mensaje,
            enviado: false,
            fecha_programada: new Date(),
        }));

        await AppDataSource
            .createQueryBuilder()
            .insert()
            .into('notificaciones')
            .values(values)
            .execute();
    }

    async registrarFechaBloqueada(
        fecha: string,
        idEspecialidad: number,
        motivo: string,
        creadoPor: number,
    ): Promise<void> {
        const registro = this.fechaBloqueadaRepo.create({
            fecha: new Date(fecha),
            id_especialidad: idEspecialidad,
            motivo,
            creado_por: creadoPor,
        });
        await this.fechaBloqueadaRepo.save(registro);
    }

    // =============================================================
    // 2) GESTIÓN DE ESPECIALIDADES
    // =============================================================
    async existeEspecialidadPorNombre(nombre: string): Promise<boolean> {
        const count = await this.especialidadRepo.count({
            where: { nombre },
        });
        return count > 0;
    }

    async crearEspecialidad(
        nombre: string,
        descripcion: string,
        requiereDatosMenor: boolean = false,
    ): Promise<{ id: number }> {
        const nueva = this.especialidadRepo.create({
            nombre,
            descripcion,
            estado: 'ACTIVA',
            requiere_datos_menor: requiereDatosMenor ? 1 : 0,
        });
        const guardada = await this.especialidadRepo.save(nueva);
        return { id: guardada.id_especialidad };
    }

    async inhabilitarEspecialidad(
        idEspecialidad: number,
        desde: string,
        hasta: string,
        motivo: string,
        creadoPor: number,
    ): Promise<void> {
        await this.especialidadRepo.update(
            { id_especialidad: idEspecialidad },
            { estado: 'INACTIVA' },
        );

        const inicio = new Date(desde);
        const fin    = new Date(hasta);
        const registros: Partial<FechaBloqueadaModel>[] = [];

        for (
            let d = new Date(inicio);
            d <= fin;
            d.setDate(d.getDate() + 1)
        ) {
            registros.push({
                fecha: new Date(d),
                id_especialidad: idEspecialidad,
                motivo,
                creado_por: creadoPor,
            });
        }

        if (registros.length > 0) {
            await this.fechaBloqueadaRepo.insert(registros);
        }
    }

    // =============================================================
    // 3) CONFIGURACIÓN DE SANCIONES
    // =============================================================
    async obtenerConfiguracion(clave: string): Promise<Configuracion | null> {
        const model = await this.configuracionRepo.findOne({ where: { clave } });
        if (!model) return null;
        return ConfiguracionMapping.toDomain(model);
    }

    async guardarConfiguracion(
        clave: string,
        valor: string,
        descripcion?: string,
    ): Promise<void> {
        const existente = await this.configuracionRepo.findOne({ where: { clave } });

        if (existente) {
            existente.valor = valor;
            if (descripcion) existente.descripcion = descripcion;
            await this.configuracionRepo.save(existente);
        } else {
            const nuevo = this.configuracionRepo.create({
                clave,
                valor,
                descripcion: descripcion ?? '',
            });
            await this.configuracionRepo.save(nuevo);
        }
    }

    // =============================================================
    // 4) USUARIOS DE ADMISIÓN
    //
    //  PATRÓN APLICADO: Abstract Factory (UsuarioFactory)
    //    En vez de construir el usuario manualmente con
    //    `userRepo.create({ ..., rol: 'ADMISION' })`,
    //    delegamos en el factory para garantizar consistencia
    //    en los campos por defecto.
    // =============================================================
    async correoOdniExiste(correo: string, dni: string): Promise<boolean> {
        const count = await this.userRepo
            .createQueryBuilder('u')
            .where('u.correo = :correo OR u.dni = :dni', { correo, dni })
            .getCount();
        return count > 0;
    }

    async crearUsuarioAdmision(data: {
        correo: string;
        contrasenaHash: string;
        dni: string;
        nombres: string;
        apellidos: string;
        telefono: string;
    }): Promise<{ id_usuario: number }> {
        //  Abstract Factory: el factory garantiza rol y campos por defecto.
        const entidad = UsuarioFactory.crearAdmision({
            correo: data.correo,
            contrasenaHash: data.contrasenaHash,
            dni: data.dni,
            nombres: data.nombres,
            apellidos: data.apellidos,
            telefono: data.telefono,
        });

        // Convertimos la Entity a Model y persistimos
        const modelo = this.userRepo.create({
            correo: entidad.correo,
            contrasena: entidad.contrasena,
            rol: entidad.rol,
            dni: entidad.dni,
            nombres: entidad.nombres,
            apellidos: entidad.apellidos,
            telefono: entidad.telefono,
            fecha_nacimiento: entidad.fecha_nacimiento,
            direccion: entidad.direccion,
            genero: entidad.genero,
            inasistencias: entidad.inasistencias,
            cuenta_bloqueada: entidad.cuenta_bloqueada,
            intentos_fallidos: entidad.intentos_fallidos,
            activo: entidad.activo,
            fecha_registro: entidad.fecha_registro,
        });

        const guardado = await this.userRepo.save(modelo);
        return { id_usuario: guardado.id_usuario };
    }// ============================================================
    // LISTADOS
    // ============================================================
   async listarEspecialidades() {
        const models = await this.especialidadRepo.find({
            order: { id_especialidad: 'ASC' },
        });
        return models.map(e => ({
            id_especialidad: e.id_especialidad,
            nombre: e.nombre,
            descripcion: e.descripcion ?? null,
            estado: e.estado,
            requiere_datos_menor: !!(e as any).requiere_datos_menor,
            fecha_inhabilitacion: this.fechaStr((e as any).fecha_inhabilitacion),
            fecha_habilitacion: this.fechaStr((e as any).fecha_habilitacion),
        }));
    }

    private fechaStr(fecha: any): string | null {
        if (!fecha) return null;
        if (fecha instanceof Date) {
            return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        }
        return String(fecha).slice(0, 10);
    }

    async listarUsuariosAdmision() {
        const models = await this.userRepo.find({
            where: { rol: 'ADMISION' as any },
            order: { id_usuario: 'ASC' },
        });
        return models.map(u => ({
            id_usuario: u.id_usuario,
            correo: u.correo,
            nombres: u.nombres ?? '',
            apellidos: u.apellidos ?? '',
            dni: u.dni ?? '',
            activo: !!u.activo,
        }));
    }

    // ============================================================
    // GESTIÓN DE MÉDICOS
    // ============================================================
    async existeEspecialidadActiva(idEspecialidad: number): Promise<boolean> {
        const count = await this.especialidadRepo.count({
            where: { id_especialidad: idEspecialidad, estado: 'ACTIVA' as any },
        });
        return count > 0;
    }

    async crearMedico(data: {
        nombres: string;
        apellidos: string;
        id_especialidad: number;
    }): Promise<{ id_medico: number }> {
        const nuevo = this.medicoRepo.create({
            nombres: data.nombres,
            apellidos: data.apellidos,
            id_especialidad: data.id_especialidad,
        });
        const guardado = await this.medicoRepo.save(nuevo);
        return { id_medico: guardado.id_medico };
    }

    async listarMedicos() {
        const rows = await this.medicoRepo
            .createQueryBuilder('m')
            .innerJoin('especialidades', 'e', 'e.id_especialidad = m.id_especialidad')
            .select([
                'm.id_medico             AS id_medico',
                'm.nombres               AS nombres',
                'm.apellidos             AS apellidos',
                'm.id_especialidad       AS id_especialidad',
                'm.estado                AS estado',
                'm.fecha_inhabilitacion  AS fecha_inhabilitacion',
                'm.fecha_habilitacion    AS fecha_habilitacion',
                'e.nombre                AS especialidad',
            ])
            .orderBy('m.id_medico', 'ASC')
            .getRawMany();

        // Cuentas de acceso vinculadas (tabla medico_usuario). Si la migración aún
        // no se aplicó, el listado sigue funcionando sin ese dato.
        const cuentas = new Map<number, string | null>();
        try {
            const filas = await AppDataSource.query(`SELECT id_medico, cmp FROM medico_usuario`);
            filas.forEach((f: any) => cuentas.set(Number(f.id_medico), f.cmp ?? null));
        } catch { /* tabla inexistente */ }

        return rows.map(r => ({
            id_medico: Number(r.id_medico),
            nombres: r.nombres,
            apellidos: r.apellidos,
            id_especialidad: Number(r.id_especialidad),
            especialidad: r.especialidad,
            estado: r.estado,
            fecha_inhabilitacion: this.fechaStr(r.fecha_inhabilitacion),
            fecha_habilitacion: this.fechaStr(r.fecha_habilitacion),
            tiene_cuenta: cuentas.has(Number(r.id_medico)),
            cmp: cuentas.get(Number(r.id_medico)) ?? null,
        }));
    }

    async medicoTieneCuenta(idMedico: number): Promise<boolean> {
        const rows = await AppDataSource.query(`SELECT 1 FROM medico_usuario WHERE id_medico = ? LIMIT 1`, [idMedico]);
        return rows.length > 0;
    }

    async obtenerMedico(idMedico: number) {
        return this.medicoRepo.findOne({ where: { id_medico: idMedico } });
    }

    async crearCuentaMedico(data: {
        id_medico: number;
        id_especialidad: number;
        correo: string;
        contrasenaHash: string;
        dni: string;
        nombres: string;
        apellidos: string;
        telefono: string;
        cmp: string | null;
    }): Promise<{ id_usuario: number }> {
        const entidad = UsuarioFactory.crearMedico({
            correo: data.correo,
            contrasenaHash: data.contrasenaHash,
            dni: data.dni,
            nombres: data.nombres,
            apellidos: data.apellidos,
            telefono: data.telefono,
            id_especialidad: data.id_especialidad,
        });

        return AppDataSource.transaction(async (manager) => {
            const modelo = manager.getRepository(UserModel).create({
                correo: entidad.correo,
                contrasena: entidad.contrasena,
                rol: entidad.rol,
                dni: entidad.dni,
                nombres: entidad.nombres,
                apellidos: entidad.apellidos,
                telefono: entidad.telefono,
                fecha_nacimiento: entidad.fecha_nacimiento,
                direccion: entidad.direccion,
                genero: entidad.genero,
                inasistencias: entidad.inasistencias,
                cuenta_bloqueada: entidad.cuenta_bloqueada,
                intentos_fallidos: entidad.intentos_fallidos,
                activo: entidad.activo,
                fecha_registro: entidad.fecha_registro,
            });
            const guardado = await manager.getRepository(UserModel).save(modelo);
            await manager.query(
                `INSERT INTO medico_usuario (id_medico, id_usuario, cmp) VALUES (?, ?, ?)`,
                [data.id_medico, guardado.id_usuario, data.cmp],
            );
            return { id_usuario: guardado.id_usuario };
        });
    }
    // ============================================================
    // FASE 3: programar disponibilidad de ESPECIALIDAD
    // ============================================================
    async programarEspecialidad(id: number, accion: 'INHABILITAR' | 'HABILITAR', fecha: string) {
        const esp = await this.especialidadRepo.findOne({ where: { id_especialidad: id } });
        if (!esp) return { ok: false, mensaje: 'La especialidad no existe' };

        if (accion === 'INHABILITAR') {
            await this.especialidadRepo.update(
                { id_especialidad: id },
                { fecha_inhabilitacion: fecha as any, fecha_habilitacion: null as any },
            );
            return { ok: true, mensaje: `Especialidad programada para inhabilitarse el ${fecha}` };
        } else {
            // HABILITAR: programa la reapertura
            await this.especialidadRepo.update(
                { id_especialidad: id },
                { fecha_habilitacion: fecha as any, aviso_habilitacion_enviado: 0 as any },
            );
            return { ok: true, mensaje: `Especialidad programada para habilitarse el ${fecha}` };
        }
    }

    // ============================================================
    // FASE 3: programar disponibilidad de MÉDICO
    // ============================================================
    async programarMedico(id: number, accion: 'INHABILITAR' | 'HABILITAR', fecha: string) {
        const med = await this.medicoRepo.findOne({ where: { id_medico: id } });
        if (!med) return { ok: false, mensaje: 'El médico no existe' };

        if (accion === 'INHABILITAR') {
            await this.medicoRepo.update(
                { id_medico: id },
                { fecha_inhabilitacion: fecha as any, fecha_habilitacion: null as any },
            );
            return { ok: true, mensaje: `Médico programado para inhabilitarse el ${fecha}` };
        } else {
            await this.medicoRepo.update(
                { id_medico: id },
                { fecha_habilitacion: fecha as any, aviso_habilitacion_enviado: 0 as any },
            );
            return { ok: true, mensaje: `Médico programado para habilitarse el ${fecha}` };
        }
    }
    // Cancela (limpia) una programación: 'INHABILITAR' o 'HABILITAR'
    async cancelarProgramacionEspecialidad(id: number, cual: 'INHABILITAR' | 'HABILITAR') {
        const campo = cual === 'INHABILITAR'
            ? { fecha_inhabilitacion: null as any }
            : { fecha_habilitacion: null as any, aviso_habilitacion_enviado: 0 as any };
        await this.especialidadRepo.update({ id_especialidad: id }, campo);
        return { ok: true, mensaje: 'Programación cancelada' };
    }

    async cancelarProgramacionMedico(id: number, cual: 'INHABILITAR' | 'HABILITAR') {
        const campo = cual === 'INHABILITAR'
            ? { fecha_inhabilitacion: null as any }
            : { fecha_habilitacion: null as any, aviso_habilitacion_enviado: 0 as any };
        await this.medicoRepo.update({ id_medico: id }, campo as any);
        return { ok: true, mensaje: 'Programación cancelada' };
    }
}