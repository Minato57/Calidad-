// =================================================================
// CAPA: Application / Services
// Pagos de consulta con Mercado Pago (Checkout Pro) vía API REST.
//
// Regla de negocio:
//   - Paciente (o familiar) con SIS  → cita gratuita (pago EXONERADO).
//   - Sin SIS                         → debe existir un pago APROBADO
//                                       antes de confirmar la reserva.
//
// Variables de entorno:
//   MP_ACCESS_TOKEN        token de Mercado Pago (TEST-... en pruebas).
//                          Si falta: modo SIMULADO (solo fuera de producción).
//   FRONTEND_URL           URL pública del frontend (default http://localhost:5173)
//   BACKEND_PUBLIC_URL     URL pública del backend para el webhook (opcional)
//   TARIFA_CONSULTA_PEN    monto de la consulta (default 20)
//   PAGOS_HABILITADOS      'false' desactiva el cobro
// =================================================================
import { AppDataSource } from '../../../../config/datasource';
import { SeguroService, ResultadoSeguro } from '../../../seguros/application/services/seguro.service';

const MP_API = 'https://api.mercadopago.com';

export interface EvaluacionCobro {
    dni: string;
    seguro: ResultadoSeguro;
    requiere_pago: boolean;
    monto: number;
    moneda: 'PEN';
}

export interface ResultadoValidacionCobro {
    ok: boolean;
    mensaje?: string;
    requiere_pago?: boolean;
    exonerado?: boolean;
    id_pago?: number;
    dni?: string;
}

export class PagoService {
    private seguroService = new SeguroService();

    private get habilitado(): boolean {
        return process.env.PAGOS_HABILITADOS !== 'false';
    }
    private get tarifa(): number {
        return Number(process.env.TARIFA_CONSULTA_PEN) || 20;
    }
    private get frontendUrl(): string {
        return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    }
    private get tokenMP(): string | null {
        return process.env.MP_ACCESS_TOKEN || null;
    }
    private get simulado(): boolean {
        return !this.tokenMP && process.env.NODE_ENV !== 'production';
    }

    // ------------------------------------------------------------
    // DNI del paciente efectivo (titular o su familiar).
    // ------------------------------------------------------------
    private async dniPaciente(idUsuario: number, idDependiente?: number): Promise<string | null> {
        if (idDependiente) {
            const rows = await AppDataSource.query(
                `SELECT dni FROM usuarios WHERE id_usuario = ? AND id_tutor = ? LIMIT 1`,
                [idDependiente, idUsuario],
            );
            return rows[0]?.dni ? String(rows[0].dni) : null;
        }
        const rows = await AppDataSource.query(`SELECT dni FROM usuarios WHERE id_usuario = ? LIMIT 1`, [idUsuario]);
        return rows[0]?.dni ? String(rows[0].dni) : null;
    }

    // ------------------------------------------------------------
    // ¿Debe pagar? (consulta/valida el seguro del paciente efectivo)
    // ------------------------------------------------------------
    async evaluar(idUsuario: number, idDependiente?: number): Promise<EvaluacionCobro> {
        const dni = await this.dniPaciente(idUsuario, idDependiente);
        if (!dni) {
            throw Object.assign(new Error('No se encontró el DNI del paciente'), { status: 400 });
        }
        const seguro = await this.seguroService.consultar(dni);
        const requiere = this.habilitado && !seguro.tiene_seguro;
        return { dni, seguro, requiere_pago: requiere, monto: this.tarifa, moneda: 'PEN' };
    }

    // ------------------------------------------------------------
    // Crea el pago PENDIENTE y la preferencia de Mercado Pago.
    // ------------------------------------------------------------
    async crearCheckout(idUsuario: number, data: { id_dependiente?: number; descripcion?: string }) {
        const ev = await this.evaluar(idUsuario, data.id_dependiente);
        if (!ev.requiere_pago) {
            return { ok: true, requiere_pago: false, mensaje: 'Esta cita no requiere pago', evaluacion: ev };
        }

        const descripcion = (data.descripcion || 'Consulta médica').slice(0, 200);
        const ins = await AppDataSource.query(
            `INSERT INTO pagos (id_usuario, dni_paciente, monto, moneda, estado, descripcion)
             VALUES (?, ?, ?, 'PEN', 'PENDIENTE', ?)`,
            [idUsuario, ev.dni, ev.monto, descripcion],
        );
        const idPago: number = Number(ins.insertId);

        // ----- Modo simulado (sin token de Mercado Pago, solo desarrollo) -----
        if (this.simulado) {
            await AppDataSource.query(`UPDATE pagos SET mp_preference_id = 'SIMULADO' WHERE id_pago = ?`, [idPago]);
            return {
                ok: true, requiere_pago: true, simulado: true, id_pago: idPago,
                monto: ev.monto, moneda: ev.moneda,
                init_point: `${this.frontendUrl}/paciente/reservar?pago=ok&id_pago=${idPago}`,
            };
        }
        if (!this.tokenMP) {
            return { ok: false, mensaje: 'Pasarela de pagos no configurada (MP_ACCESS_TOKEN)' };
        }

        // ----- Mercado Pago: Checkout Pro -----
        const back = (estado: string) => `${this.frontendUrl}/paciente/reservar?pago=${estado}&id_pago=${idPago}`;
        const body: any = {
            items: [{
                id: `consulta-${idPago}`,
                title: descripcion,
                quantity: 1,
                unit_price: ev.monto,
                currency_id: 'PEN',
            }],
            external_reference: String(idPago),
            back_urls: { success: back('ok'), failure: back('error'), pending: back('pendiente') },
            statement_descriptor: 'CENTRO SAN GENARO',
        };
        // auto_return exige back_urls públicas (https); en localhost se omite.
        if (this.frontendUrl.startsWith('https://')) body.auto_return = 'approved';
        if (process.env.BACKEND_PUBLIC_URL) {
            body.notification_url = `${process.env.BACKEND_PUBLIC_URL.replace(/\/$/, '')}/pagos/webhook`;
        }

        const resp = await fetch(`${MP_API}/checkout/preferences`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.tokenMP}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        });
        const pref: any = await resp.json().catch(() => ({}));
        if (!resp.ok || !pref.init_point) {
            const sanitizedPref = JSON.stringify(pref).replace(/[\r\n]/g, '');
            console.error('[PAGOS] Error al crear preferencia MP:', resp.status, sanitizedPref);
            await AppDataSource.query(`UPDATE pagos SET estado = 'RECHAZADO' WHERE id_pago = ?`, [idPago]);
            return { ok: false, mensaje: 'No se pudo iniciar el pago con Mercado Pago' };
        }

        await AppDataSource.query(`UPDATE pagos SET mp_preference_id = ? WHERE id_pago = ?`, [pref.id, idPago]);
        const esPrueba = this.tokenMP.startsWith('TEST-');
        return {
            ok: true, requiere_pago: true, simulado: false, id_pago: idPago,
            monto: ev.monto, moneda: ev.moneda,
            init_point: esPrueba && pref.sandbox_init_point ? pref.sandbox_init_point : pref.init_point,
        };
    }

    // ------------------------------------------------------------
    // Consulta el estado real del pago (al volver de Mercado Pago).
    // ------------------------------------------------------------
    async verificar(idUsuario: number, idPago: number, paymentId?: string) {
        const rows = await AppDataSource.query(
            `SELECT * FROM pagos WHERE id_pago = ? AND id_usuario = ? LIMIT 1`,
            [idPago, idUsuario],
        );
        const pago = rows[0];
        if (!pago) return { ok: false, mensaje: 'Pago no encontrado' };
        if (pago.estado === 'APROBADO' || pago.estado === 'EXONERADO') {
            return { ok: true, estado: pago.estado, usado: !!pago.id_cita };
        }

        if (this.simulado && pago.mp_preference_id === 'SIMULADO') {
            await AppDataSource.query(`UPDATE pagos SET estado = 'APROBADO', mp_payment_id = 'SIMULADO' WHERE id_pago = ?`, [idPago]);
            return { ok: true, estado: 'APROBADO', usado: false, simulado: true };
        }

        const estado = await this.consultarEstadoMP(idPago, paymentId);
        return { ok: true, estado, usado: false };
    }

    // ------------------------------------------------------------
    // Webhook de Mercado Pago (público; se re-consulta a la API de MP,
    // así que no se confía en el contenido del request).
    // ------------------------------------------------------------
    async procesarWebhook(paymentId: string | undefined) {
        if (!paymentId || !this.tokenMP) return;
        const pago = await this.obtenerPagoMP(paymentId);
        if (!pago) return;
        const idPago = Number(pago.external_reference);
        if (!idPago) return;
        await this.actualizarDesdeMP(idPago, pago);
    }

    private async obtenerPagoMP(paymentId: string): Promise<any | null> {
        const resp = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
            headers: { 'Authorization': `Bearer ${this.tokenMP}` },
            signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) return null;
        return resp.json();
    }

    private async consultarEstadoMP(idPago: number, paymentId?: string): Promise<string> {
        if (!this.tokenMP) return 'PENDIENTE';
        let pagoMP: any | null = null;

        if (paymentId) {
            pagoMP = await this.obtenerPagoMP(paymentId);
            // Evita que se use el pago de otra operación.
            if (pagoMP && Number(pagoMP.external_reference) !== idPago) pagoMP = null;
        } else {
            const resp = await fetch(
                `${MP_API}/v1/payments/search?external_reference=${idPago}&sort=date_created&criteria=desc`,
                { headers: { 'Authorization': `Bearer ${this.tokenMP}` }, signal: AbortSignal.timeout(10000) },
            );
            if (resp.ok) {
                const json: any = await resp.json();
                pagoMP = json.results?.[0] ?? null;
            }
        }
        if (!pagoMP) return 'PENDIENTE';
        return this.actualizarDesdeMP(idPago, pagoMP);
    }

    private async actualizarDesdeMP(idPago: number, pagoMP: any): Promise<string> {
        const mapa: Record<string, string> = {
            approved: 'APROBADO', rejected: 'RECHAZADO', cancelled: 'RECHAZADO', refunded: 'RECHAZADO',
        };
        const estado = mapa[pagoMP.status] ?? 'PENDIENTE';
        // Solo se aprueba si el monto cobrado cubre la tarifa registrada.
        if (estado === 'APROBADO') {
            const rows = await AppDataSource.query(`SELECT monto FROM pagos WHERE id_pago = ?`, [idPago]);
            if (rows[0] && Number(pagoMP.transaction_amount) + 0.001 < Number(rows[0].monto)) {
                return 'PENDIENTE';
            }
        }
        await AppDataSource.query(
            `UPDATE pagos SET estado = ?, mp_payment_id = ? WHERE id_pago = ? AND estado <> 'EXONERADO'`,
            [estado, String(pagoMP.id), idPago],
        );
        return estado;
    }

    // ------------------------------------------------------------
    // Usado por CitaService al reservar.
    // ------------------------------------------------------------
    async validarParaReserva(
        idUsuario: number,
        idDependiente: number | undefined,
        idPago: number | undefined,
    ): Promise<ResultadoValidacionCobro> {
        if (!this.habilitado) return { ok: true, requiere_pago: false };

        const ev = await this.evaluar(idUsuario, idDependiente);
        if (ev.seguro.tiene_seguro) {
            return { ok: true, requiere_pago: false, exonerado: true, dni: ev.dni };
        }

        if (!idPago) {
            return {
                ok: false, requiere_pago: true,
                mensaje: `El paciente no cuenta con SIS. Debes pagar S/ ${ev.monto.toFixed(2)} para confirmar la cita.`,
            };
        }
        const rows = await AppDataSource.query(
            `SELECT * FROM pagos WHERE id_pago = ? AND id_usuario = ? LIMIT 1`,
            [idPago, idUsuario],
        );
        const pago = rows[0];
        if (!pago || pago.estado !== 'APROBADO' || pago.id_cita) {
            return { ok: false, requiere_pago: true, mensaje: 'El pago no está aprobado o ya fue utilizado.' };
        }
        return { ok: true, requiere_pago: true, id_pago: idPago, dni: ev.dni };
    }

    /** Vincula el cobro con la cita creada (consume el pago o registra la exoneración). */
    async confirmarCobro(cobro: ResultadoValidacionCobro, idUsuario: number, idCita: number) {
        if (cobro.id_pago) {
            await AppDataSource.query(
                `UPDATE pagos SET id_cita = ? WHERE id_pago = ? AND id_usuario = ? AND id_cita IS NULL`,
                [idCita, cobro.id_pago, idUsuario],
            );
        } else if (cobro.exonerado) {
            await AppDataSource.query(
                `INSERT INTO pagos (id_usuario, id_cita, dni_paciente, monto, moneda, estado, descripcion)
                 VALUES (?, ?, ?, 0, 'PEN', 'EXONERADO', 'Cubierto por SIS')`,
                [idUsuario, idCita, cobro.dni ?? null],
            );
        }
    }
}
