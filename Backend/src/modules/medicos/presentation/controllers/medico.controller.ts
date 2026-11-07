import { Request, Response } from 'express';
import { MedicoService } from '../../application/services/medico.service';
import { AtencionDTO } from '../../application/dto/atencion.dto';

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const hoyLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export class MedicoController {
    private service = new MedicoService();

    // GET /medico/perfil
    perfil = async (req: Request, res: Response) => {
        const r = await this.service.perfil(req.jwt!.id);
        return res.status(r.ok ? 200 : 403).json(r);
    };

    // GET /medico/citas-hoy?fecha=YYYY-MM-DD
    citasDelDia = async (req: Request, res: Response) => {
        const fecha = req.query.fecha ? String(req.query.fecha) : hoyLocal();
        if (!RE_FECHA.test(fecha)) {
            return res.status(400).json({ ok: false, mensaje: 'La fecha no es válida' });
        }
        const r = await this.service.citasDelDia(req.jwt!.id, fecha);
        return res.status(r.ok ? 200 : 403).json(r);
    };

    // POST /medico/citas/:id/atencion
    atender = async (req: Request, res: Response) => {
        const idCita = Number(req.params.id);
        if (!idCita) return res.status(400).json({ ok: false, mensaje: 'ID de cita inválido' });
        const r = await this.service.atenderCita(req.jwt!.id, idCita, req.dto as AtencionDTO);
        const { status, ...body } = r as any;
        return res.status(status ?? 200).json(body);
    };

    // GET /medico/verificar/:codigo  (público)
    verificar = async (req: Request, res: Response) => {
        const codigo = String(req.params.codigo || '').trim().toUpperCase();
        if (!/^[A-F0-9]{16}$/.test(codigo)) {
            if (req.headers.accept?.includes('text/html')) {
                return res.status(400).send(this.renderHtmlVerificacion(false, null, codigo));
            }
            return res.status(400).json({ ok: false, mensaje: 'Código de verificación inválido' });
        }

        const data = await this.service.verificarReceta(codigo);
        if (req.headers.accept?.includes('text/html')) {
            return res.send(this.renderHtmlVerificacion(Boolean(data.valida), data, codigo));
        }
        return res.json(data);
    };

    private renderHtmlVerificacion(valida: boolean, data: any, codigo: string): string {
        const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación de Receta Digital</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F1F5F9; margin: 0; padding: 24px 16px; color: #0F172A; }
    .card { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; padding: 28px; border: 1px solid #CBD5E1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; }
    .valida { background: #DCFCE7; color: #166534; border: 1px solid #86EFAC; }
    .invalida { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }
    .row { margin: 12px 0; font-size: 14px; }
    .label { color: #64748B; font-weight: 600; }
    .val { color: #0F172A; font-weight: 500; }
    .box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; margin-top: 6px; white-space: pre-wrap; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="text-align:center;margin-bottom:20px;">
      <h1 style="font-size:20px;color:#1E3A8A;margin:0 0 10px 0;">Centro de Salud San Genaro</h1>
      <span class="badge ${valida ? 'valida' : 'invalida'}">
        ${valida ? ' Documento Auténtico y Válido' : '❌ Código No Encontrado o Inválido'}
      </span>
    </div>
    <div class="row"><span class="label">Código de Verificación:</span> <strong style="font-family:monospace;letter-spacing:1px;color:#1E3A8A;">${esc(codigo)}</strong></div>
    ${valida && data ? `
      <div class="row"><span class="label">Médico Tratante:</span> <span class="val">Dr(a). ${esc(data.medico || '')}</span></div>
      ${data.cmp ? `<div class="row"><span class="label">Colegiatura:</span> <span class="val">CMP ${esc(data.cmp)}</span></div>` : ''}
      <div class="row"><span class="label">Especialidad:</span> <span class="val">${esc(data.especialidad || '')}</span></div>
      <div class="row"><span class="label">Fecha de Atención:</span> <span class="val">${new Date(data.fecha_atencion).toLocaleString('es-PE')}</span></div>
      ${data.diagnostico ? `<div class="row"><span class="label">Diagnóstico:</span><div class="box">${esc(data.diagnostico)}</div></div>` : ''}
      ${data.receta ? `<div class="row"><span class="label">Receta / Medicamentos:</span><div class="box">${esc(data.receta)}</div></div>` : ''}
      ${data.indicaciones ? `<div class="row"><span class="label">Indicaciones:</span><div class="box">${esc(data.indicaciones)}</div></div>` : ''}
    ` : `
      <p style="font-size:14px;color:#64748B;margin-top:16px;">
        El código consultado no corresponde a ninguna receta o atención médica registrada en nuestros sistemas oficiales.
      </p>
    `}
  </div>
</body>
</html>`;
    }
}
