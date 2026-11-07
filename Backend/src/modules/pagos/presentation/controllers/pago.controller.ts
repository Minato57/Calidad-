// =================================================================
// CAPA: Presentation / Controllers — Pagos
//   GET  /pagos/requisito?id_dependiente=   → ¿debe pagar? (SIS)
//   POST /pagos/checkout                    → crea preferencia Mercado Pago
//   GET  /pagos/:id/verificar?payment_id=   → estado real del pago
//   POST /pagos/webhook                     → notificación de Mercado Pago
// =================================================================
import { Request, Response } from 'express';
import { PagoService } from '../../application/services/pago.service';

export class PagoController {
    private service = new PagoService();

    requisito = async (req: Request, res: Response) => {
        const idDep = req.query.id_dependiente ? Number(req.query.id_dependiente) : undefined;
        const ev = await this.service.evaluar(req.jwt!.id, idDep);
        return res.json({ ok: true, ...ev });
    };

    checkout = async (req: Request, res: Response) => {
        const { id_dependiente, descripcion } = req.body ?? {};
        const result = await this.service.crearCheckout(req.jwt!.id, {
            id_dependiente: id_dependiente ? Number(id_dependiente) : undefined,
            descripcion: typeof descripcion === 'string' ? descripcion : undefined,
        });
        return res.status(result.ok ? 201 : 502).json(result);
    };

    verificar = async (req: Request, res: Response) => {
        const idPago = Number(req.params.id);
        if (!idPago) return res.status(400).json({ ok: false, mensaje: 'ID de pago inválido' });
        const paymentId = req.query.payment_id ? String(req.query.payment_id) : undefined;
        const result = await this.service.verificar(req.jwt!.id, idPago, paymentId);
        return res.status(result.ok ? 200 : 404).json(result);
    };

    // Mercado Pago espera un 200 rápido; el procesamiento re-consulta la API de MP.
    webhook = (req: Request, res: Response) => {
        const tipo = String(req.query.type || req.query.topic || req.body?.type || '');
        const id = String(req.query['data.id'] || req.body?.data?.id || req.query.id || '');
        res.sendStatus(200);
        if (tipo === 'payment' && id) {
            this.service.procesarWebhook(id).catch(e => console.error('[PAGOS] webhook:', e?.message));
        }
    };
}
