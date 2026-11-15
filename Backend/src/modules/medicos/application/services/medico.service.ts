// =================================================================
// CAPA: Application / Services — Panel del médico
//   - Pacientes (citas) del día del médico autenticado
//   - Registro de diagnóstico + receta, envío por correo con firma digital
// =================================================================
import { getJwtSecret } from '../../../../config/security';
import { firmarAtencion, instanteDeEmision } from '../../domain/firma-receta';

import { MedicoPanelRepository } from '../../infrastructure/repositories/medico-panel.repository';
import { SeguroService } from '../../../seguros/application/services/seguro.service';
import { MailerService } from '../../../notificaciones/application/services/mailer.service';
import { construirCorreoReceta } from './receta.template';
import { AtencionDTO } from '../dto/atencion.dto';

const ESTADOS_NO_ATENDIBLES = ['CANCELADA', 'FALTA'];

export class MedicoService {
    private repo = new MedicoPanelRepository();
    private seguroService = new SeguroService();
    private mailer = new MailerService();

    async perfil(idUsuario: number) {
        const perfil = await this.repo.perfilPorUsuario(idUsuario);
        if (!perfil) {
            return { ok: false, mensaje: 'Tu cuenta no está vinculada a un médico. Contacta al administrador.' };
        }
        return { ok: true, perfil };
    }

    async citasDelDia(idUsuario: number, fecha: string) {
        const perfil = await this.repo.perfilPorUsuario(idUsuario);
        if (!perfil) {
            return { ok: false, mensaje: 'Tu cuenta no está vinculada a un médico. Contacta al administrador.' };
        }

        const citas = await this.repo.citasDelDia(perfil.id_medico, fecha);

        // Seguro (último resultado en caché; no dispara consultas externas).
        const cache = await this.seguroService.obtenerCache(
            Array.from(new Set(citas.map((c: any) => String(c.paciente_dni)).filter(Boolean))) as string[],
        );
        const enriquecidas = citas.map((c: any) => {
            const s = cache.get(String(c.paciente_dni).trim());
            return { ...c, seguro: s ? { tipo: s.tipo, tiene_seguro: s.tiene_seguro, verificado: s.verificado } : null };
        });

        return { ok: true, fecha, total: enriquecidas.length, medico: perfil, citas: enriquecidas };
    }

    async atenderCita(idUsuario: number, idCita: number, dto: AtencionDTO) {
        const perfil = await this.repo.perfilPorUsuario(idUsuario);
        if (!perfil) {
            return { ok: false, status: 403, mensaje: 'Tu cuenta no está vinculada a un médico.' };
        }

        // Solo puede atender citas de su propia agenda.
        const cita = await this.repo.citaParaAtencion(idCita, perfil.id_medico);
        if (!cita) return { ok: false, status: 404, mensaje: 'La cita no existe en tu agenda' };
        if (ESTADOS_NO_ATENDIBLES.includes(cita.estado)) {
            return { ok: false, status: 409, mensaje: `No se puede atender una cita en estado ${cita.estado}` };
        }
        if (cita.ya_atendida) {
            return { ok: false, status: 409, mensaje: 'Esta cita ya fue atendida' };
        }

        const diagnostico  = dto.diagnostico.trim();
        const receta       = dto.receta?.trim() || null;
        const indicaciones = dto.indicaciones?.trim() || null;
        const correoDestino = dto.correo_destino?.trim() || cita.correo || null;
        // Instante de emisión truncado a segundos: se guarda tal cual en fecha_atencion
        // para poder recalcular la firma al verificar.
        const emitido      = instanteDeEmision();

        // Firma digital: HMAC del contenido clínico + identidad del médico + fecha de emisión.
        const codigo = firmarAtencion(getJwtSecret(), {
            id_cita: cita.id_cita, id_medico: perfil.id_medico, diagnostico, receta, indicaciones, emitido,
        });

        const idAtencion = await this.repo.guardarAtencion({
            id_cita: cita.id_cita, id_medico: perfil.id_medico,
            diagnostico, receta, indicaciones, codigo, correo: correoDestino, emitido,
        });

        // Envío por correo (no bloquea el guardado: si falla, queda registrado como no enviado).
        let correoEnviado = false;
        if (correoDestino) {
            const base = process.env.BACKEND_PUBLIC_URL?.replace(/\/$/, '') || 'http://localhost:3000';
            const html = construirCorreoReceta({
                paciente: cita.paciente, paciente_dni: cita.paciente_dni,
                saludoA: cita.titular_nombres || cita.paciente,
                fecha: cita.fecha,
                medico: `${perfil.nombres} ${perfil.apellidos}`, cmp: perfil.cmp,
                especialidad: perfil.especialidad,
                diagnostico, receta, indicaciones, codigo, fechaEmision: emitido,
                urlVerificacion: `${base}/medico/verificar/${codigo}`,
            });
            correoEnviado = await this.mailer.enviarCorreoDirecto(
                correoDestino, `Diagnóstico y receta médica - ${perfil.especialidad}`, html,
            );
            if (correoEnviado) await this.repo.marcarCorreoEnviado(idAtencion);
        }

        let mensajeFinal: string;
        if (correoDestino && correoEnviado) {
            mensajeFinal = `Atención registrada y receta enviada a ${correoDestino}`;
        } else if (correoDestino) {
            mensajeFinal = `Atención registrada, pero no se pudo despachar el correo a ${correoDestino} (revisa remitentes SMTP configurados)`;
        } else {
            mensajeFinal = 'Atención registrada exitosamente (sin correo de paciente)';
        }

        return {
            ok: true, status: 201,
            mensaje: mensajeFinal,
            id_atencion: idAtencion,
            codigo_verificacion: codigo,
            correo_enviado: correoEnviado,
            correo_destino: correoDestino,
        };
    }

    // Verificación PÚBLICA (cualquiera con el enlace del correo): confirma que la
    // receta existe y no fue alterada, sin exponer datos clínicos ni del paciente.
    async verificarReceta(codigo: string) {
        const data = await this.repo.verificarCodigo(codigo.toUpperCase());
        if (!data) return { ok: true, valida: false };

        const recalculado = firmarAtencion(getJwtSecret(), {
            id_cita: data.id_cita, id_medico: data.id_medico,
            diagnostico: data.diagnostico, receta: data.receta, indicaciones: data.indicaciones,
            emitido: data.fecha_atencion,
        });
        const integra = recalculado === codigo.toUpperCase();

        return {
            ok: true,
            valida: integra,
            mensaje: integra
                ? 'Receta auténtica emitida por el Centro de Salud San Genaro de Villa'
                : 'El registro de esta receta fue modificado después de emitirse: no es válida',
            medico: data.medico,
            cmp: data.cmp,
            especialidad: data.especialidad,
            fecha_emision: data.fecha_atencion.toISOString(),
        };
    }
}
