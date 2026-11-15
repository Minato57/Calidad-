// =================================================================
// CAPA: Domain
// Firma (HMAC) de una atención médica / receta.
//
// El código de verificación se calcula con los datos de la atención y
// el instante de emisión. Ese instante se GUARDA en atenciones.fecha_atencion
// (truncado a segundos, porque DATETIME no guarda milisegundos), así la
// firma se puede volver a calcular al verificar y detectar si el registro
// fue alterado después de emitirse.
// =================================================================
import { createHmac } from 'crypto';

export interface DatosFirma {
    id_cita: number;
    id_medico: number;
    diagnostico: string;
    receta: string | null;
    indicaciones: string | null;
    emitido: Date;
}

export function instanteDeEmision(ahora = new Date()): Date {
    return new Date(Math.floor(ahora.getTime() / 1000) * 1000);
}

export function firmarAtencion(secreto: string, d: DatosFirma): string {
    const partes = [d.id_cita, d.id_medico, d.diagnostico, d.receta ?? '', d.indicaciones ?? '', d.emitido.toISOString()];
    return createHmac('sha256', secreto).update(partes.join('|')).digest('hex').slice(0, 16).toUpperCase();
}
