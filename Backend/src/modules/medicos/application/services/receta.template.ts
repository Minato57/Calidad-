// =================================================================
// Plantilla HTML de la receta/diagnóstico que se envía por correo,
// con la firma digital del médico.
// 100% Dinámica, Responsive (móviles/tablets/desktop) y apta para impresión.
// =================================================================
import { NOMBRE_INSTITUCION } from '../../../notificaciones/application/services/mailer.template';

const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

    const seccionReceta = d.receta
        ? `
        <tr>
          <td style="padding:16px 0 8px 0;">
            <div style="font-size:11px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
              💊 Tratamiento / Receta Médica
            </div>
            <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #2563EB;border-radius:8px;padding:14px 16px;font-size:14px;color:#1E293B;line-height:1.6;white-space:pre-wrap;word-break:break-word;">
              ${esc(d.receta)}
            </div>
          </td>
        </tr>`
        : '';

    const seccionIndicaciones = d.indicaciones
        ? `
        <tr>
          <td style="padding:12px 0 8px 0;">
            <div style="font-size:11px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
              📝 Indicaciones y Recomendaciones
            </div>
            <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #0D9488;border-radius:8px;padding:14px 16px;font-size:14px;color:#1E293B;line-height:1.6;white-space:pre-wrap;word-break:break-word;">
              ${esc(d.indicaciones)}
            </div>
          </td>
        </tr>`
        : '';

    const botonVerificacion = d.urlVerificacion
        ? `
        <div style="margin-top:16px;">
          <a href="${esc(d.urlVerificacion)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#1E3A8A;color:#FFFFFF;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:bold;letter-spacing:0.3px;">
            Verificar Autenticidad Digital
          </a>
        </div>`
        : '';

    return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Receta Médica - ${esc(d.paciente)}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media only screen and (max-width: 600px) {
      .receta-container { width: 100% !important; padding: 12px !important; }
      .receta-card { border-radius: 8px !important; }
      .receta-padding { padding: 16px !important; }
      .receta-col { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .firma-medico { font-size: 26px !important; }
    }

    @media print {
      body { background-color: #FFFFFF !important; color: #000000 !important; }
      .receta-card { border: 1px solid #94A3B8 !important; box-shadow: none !important; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:24px 10px;background-color:#F1F5F9;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <!-- Tarjeta Principal Fluida -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="receta-container" style="max-width:640px;margin:0 auto;">
          <tr>
            <td>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="receta-card" style="background-color:#FFFFFF;border:1px solid #CBD5E1;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                
                <!-- Cabecera Institucional Dinámica -->
                <tr>
                  <td style="background-color:#1E3A8A;padding:20px 24px;color:#FFFFFF;" class="receta-padding">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <div style="font-size:18px;font-weight:800;letter-spacing:-0.2px;">${esc(NOMBRE_INSTITUCION)}</div>
                          <div style="font-size:12px;color:#93C5FD;margin-top:2px;">Documento Oficial de Diagnóstico y Prescripción Médica</div>
                        </td>
                        <td align="right" class="no-print">
                          <span style="background-color:rgba(255,255,255,0.15);padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;">
                            Cita Médica
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Cuerpo de la Receta -->
                <tr>
                  <td style="padding:24px;" class="receta-padding">
                    <p style="font-size:15px;color:#0F172A;margin:0 0 16px 0;">
                      Estimado(a) <strong>${esc(d.saludoA)}</strong>, compartimos el resumen clínico y la receta de tu consulta realizada el <strong>${esc(d.fecha)}</strong>:
                    </p>

                    <!-- Ficha Resumen Paciente y Consulta -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px;margin-bottom:20px;">
                      <tr>
                        <td style="padding:4px 8px;font-size:13px;color:#64748B;width:40%;" class="receta-col">
                          <strong>Paciente:</strong>
                        </td>
                        <td style="padding:4px 8px;font-size:13px;color:#0F172A;font-weight:600;" class="receta-col">
                          ${esc(d.paciente)} (DNI ${esc(d.paciente_dni)})
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 8px;font-size:13px;color:#64748B;" class="receta-col">
                          <strong>Especialidad:</strong>
                        </td>
                        <td style="padding:4px 8px;font-size:13px;color:#0F172A;font-weight:600;" class="receta-col">
                          ${esc(d.especialidad)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 8px;font-size:13px;color:#64748B;" class="receta-col">
                          <strong>Médico Tratante:</strong>
                        </td>
                        <td style="padding:4px 8px;font-size:13px;color:#0F172A;font-weight:600;" class="receta-col">
                          Dr(a). ${esc(d.medico)}${d.cmp ? ` (CMP ${esc(d.cmp)})` : ''}
                        </td>
                      </tr>
                    </table>

                    <!-- Bloques Clínicos Dinámicos -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <!-- Diagnóstico Obligatorio -->
                      <tr>
                        <td style="padding:8px 0;">
                          <div style="font-size:11px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
                            📋 Diagnóstico Clínico
                          </div>
                          <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #1E3A8A;border-radius:8px;padding:14px 16px;font-size:14px;color:#1E293B;line-height:1.6;white-space:pre-wrap;word-break:break-word;">
                            ${esc(d.diagnostico)}
                          </div>
                        </td>
                      </tr>

                      <!-- Receta / Medicamentos (si aplica) -->
                      ${seccionReceta}

                      <!-- Indicaciones Generales (si aplica) -->
                      ${seccionIndicaciones}
                    </table>

                    <!-- Firma Digital y Código de Seguridad -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;padding-top:18px;border-top:2px dashed #CBD5E1;">
                      <tr>
                        <td>
                          <div class="firma-medico" style="font-family:'Brush Script MT','Segoe Script',cursive;font-size:28px;color:#1E3A8A;">
                            ${esc(d.medico)}
                          </div>
                          <div style="font-size:13px;color:#1E293B;font-weight:bold;margin-top:2px;">
                            Dr(a). ${esc(d.medico)}
                          </div>
                          <div style="font-size:12px;color:#64748B;">
                            ${esc(d.especialidad)}${d.cmp ? ` · Colegiatura Médica: CMP ${esc(d.cmp)}` : ''}
                          </div>
                          
                          <div style="margin-top:14px;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px;font-size:12px;color:#475569;line-height:1.5;">
                            <div><strong>🔒 Firma Digital Registrada:</strong> ${esc(emitido)}</div>
                            <div style="margin-top:4px;">
                              Código de verificación: <strong style="font-family:monospace;font-size:13px;color:#1E3A8A;letter-spacing:1px;">${esc(d.codigo)}</strong>
                            </div>
                            ${botonVerificacion}
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Pie de Página Institucional -->
                <tr>
                  <td style="background-color:#F8FAFC;padding:16px 24px;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;line-height:1.5;" class="receta-padding">
                    <p style="margin:0 0 6px 0;">
                      Este documento ha sido emitido electrónicamente a través de la plataforma de salud de <strong>${esc(NOMBRE_INSTITUCION)}</strong>. Posee plena validez como constancia de atención y prescripción médica.
                    </p>
                    <p style="margin:0;color:#94A3B8;">
                      Si presentas dudas sobre la administración de tus medicamentos, consulta directamente a tu centro médico de referencia.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
