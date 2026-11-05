// Layout con <table> + estilos en línea (lo único que respetan Gmail/Outlook).

export const NOMBRE_INSTITUCION = 'CENTRO DE SALUD SAN GENARO DE VILLA';

// Si tienes una URL pública del logo del MINSA, pégala aquí y aparecerá
// en el encabezado. Si la dejas vacía, se omite (igual se ve bien).
export const LOGO_MINSA_URL = '';

const ROJO_BANDERA = '#D91023';
const TEAL_MINSA   = '#0B7C8C';
const GRIS_TEXTO   = '#333333';
const GRIS_SUAVE   = '#777777';

export function asuntoCorreo(tipo: string): string {
    if (tipo === 'CANCELACION') return 'Cancelación de tu cita - Centro de Salud San Genaro de Villa';
    if (tipo === 'RECORDATORIO') return 'Recordatorio de tu cita - Centro de Salud San Genaro de Villa';
    return 'Notificación - Centro de Salud San Genaro de Villa';
}

export function construirCorreoHTML(nombrePaciente: string, mensaje: string): string {
    const saludo = nombrePaciente ? `Hola ${nombrePaciente},` : 'Hola,';

    const logoHtml = LOGO_MINSA_URL
        ? `<img src="${LOGO_MINSA_URL}" alt="MINSA" width="48" style="display:block;border:0;" />`
        : '';

    return `
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${NOMBRE_INSTITUCION}</title>
  <style>
    body { margin:0; padding:0; width:100% !important; background-color:#ffffff; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse:collapse; }
    img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }

    @media only screen and (max-width:600px) {
      .px { padding-left:18px !important; padding-right:18px !important; }
      .titulo { font-size:16px !important; line-height:1.3 !important; }
      .subtitulo { font-size:11px !important; }
      .texto { font-size:15px !important; }
      .logo-cell { display:block !important; width:100% !important; padding:0 0 10px 0 !important; }
      .head-cell { display:block !important; width:100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">

  <!-- Franja bandera del Perú: rojo / blanco / rojo (ancho completo) -->
  <tr>
    <td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" style="height:6px;background-color:${ROJO_BANDERA};line-height:6px;font-size:0;">&nbsp;</td>
          <td width="34%" style="height:6px;background-color:#ffffff;line-height:6px;font-size:0;">&nbsp;</td>
          <td width="33%" style="height:6px;background-color:${ROJO_BANDERA};line-height:6px;font-size:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Encabezado (ancho completo) -->
  <tr>
    <td class="px" style="background-color:${TEAL_MINSA};padding:20px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${LOGO_MINSA_URL ? `<td class="logo-cell" width="60" valign="middle" style="padding-right:12px;">${logoHtml}</td>` : ''}
          <td class="head-cell" valign="middle">
            <span class="titulo" style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.3px;">${NOMBRE_INSTITUCION}</span><br/>
            <span class="subtitulo" style="color:#d8f3f5;font-size:12px;">Ministerio de Salud del Perú</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Cuerpo (ancho completo) -->
  <tr>
    <td class="px" style="padding:28px;">
      <p class="texto" style="margin:0 0 16px 0;color:${GRIS_TEXTO};font-size:15px;">${saludo}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4fafb;border-left:4px solid ${TEAL_MINSA};border-radius:4px;">
        <tr>
          <td class="texto" style="padding:16px 18px;color:${GRIS_TEXTO};font-size:15px;line-height:1.5;">${mensaje}</td>
        </tr>
      </table>
      <p class="texto" style="margin:22px 0 0 0;color:${GRIS_TEXTO};font-size:14px;line-height:1.5;">Gracias por confiar en nosotros para el cuidado de tu salud.</p>
    </td>
  </tr>

  <!-- Pie (ancho completo) -->
  <tr>
    <td class="px" style="background-color:#fafbfc;padding:18px 28px;border-top:1px solid #eaecef;">
      <p style="margin:0;color:${GRIS_SUAVE};font-size:12px;line-height:1.5;">Este es un mensaje automático del ${NOMBRE_INSTITUCION}. Por favor, no respondas a este correo.</p>
    </td>
  </tr>

</table>
</body>
</html>`.trim();
}