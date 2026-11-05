// =================================================================
// Plantilla HTML de la receta/diagnóstico que se envía por correo,
// con la firma digital del médico.
// =================================================================
import { NOMBRE_INSTITUCION } from '../../../notificaciones/application/services/mailer.template';

const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const bloque = (titulo: string, texto: string | null) =>
    texto
        ? `<h3 style="margin:18px 0 6px;color:#1E3A8A;font-size:14px;text-transform:uppercase;letter-spacing:.5px">${titulo}</h3>
           <div style="white-space:pre-wrap;font-size:14px;color:#0F172A;line-height:1.5">${esc(texto)}</div>`
        : '';

export interface DatosReceta {
    paciente: string;
    paciente_dni: string;
    saludoA: string;
    fecha: string;
    medico: string;
    cmp: string | null;
    especialidad: string;
    diagnostico: string;
    receta: string | null;
    indicaciones: string | null;
    codigo: string;
    fechaEmision: Date;
    urlVerificacion: string | null;
}

export function construirCorreoReceta(d: DatosReceta): string {
    const emitido = d.fechaEmision.toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });
    return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden">
  <div style="background:#1E3A8A;color:#fff;padding:18px 24px">
    <div style="font-size:18px;font-weight:bold">${esc(NOMBRE_INSTITUCION)}</div>
    <div style="font-size:12px;opacity:.85">Diagnóstico y receta médica</div>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#0F172A">Hola ${esc(d.saludoA)}, a continuación el resultado de la atención del <strong>${esc(d.fecha)}</strong>.</p>
    <table style="font-size:13px;color:#334155;margin:8px 0 0">
      <tr><td style="padding:2px 12px 2px 0"><strong>Paciente:</strong></td><td>${esc(d.paciente)} (DNI ${esc(d.paciente_dni)})</td></tr>
      <tr><td style="padding:2px 12px 2px 0"><strong>Especialidad:</strong></td><td>${esc(d.especialidad)}</td></tr>
    </table>
    ${bloque('Diagnóstico', d.diagnostico)}
    ${bloque('Receta / Tratamiento', d.receta)}
    ${bloque('Indicaciones', d.indicaciones)}

    <div style="margin-top:28px;padding-top:16px;border-top:2px solid #1E3A8A">
      <div style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:30px;color:#1E3A8A">${esc(d.medico)}</div>
      <div style="font-size:13px;color:#334155"><strong>Dr(a). ${esc(d.medico)}</strong> · ${esc(d.especialidad)}${d.cmp ? ` · CMP ${esc(d.cmp)}` : ''}</div>
      <div style="font-size:11px;color:#64748B;margin-top:6px">
        Firmado digitalmente el ${esc(emitido)}<br>
        Código de verificación: <strong style="letter-spacing:1px">${esc(d.codigo)}</strong>
        ${d.urlVerificacion ? `<br><a href="${esc(d.urlVerificacion)}" style="color:#2563EB">Verificar autenticidad</a>` : ''}
      </div>
    </div>
  </div>
  <div style="background:#F8FAFC;padding:12px 24px;font-size:11px;color:#64748B">
    Este documento fue emitido electrónicamente. Conserva este correo como constancia de tu receta.
  </div>
</div>`;
}
