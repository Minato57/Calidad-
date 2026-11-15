// =================================================================
// CAPA: Domain / Entities
// Entidad pura "Notificación" del dominio.
// =================================================================
// RECORDATORIO:   aviso 24 h antes de la cita (o reapertura de especialidad/médico)
// CANCELACION:    la cita fue cancelada
// SANCION:        se registró una inasistencia o cancelación tardía (o se corrigió)
// BLOQUEO_CUENTA: la cuenta fue suspendida
// SEGURO:         avisos sobre la verificación del SIS (p. ej. vencimiento a los 90 días)
export const TIPOS_NOTIFICACION = ['RECORDATORIO', 'CANCELACION', 'SANCION', 'BLOQUEO_CUENTA', 'SEGURO'] as const;
export type TipoNotificacion = typeof TIPOS_NOTIFICACION[number];

export class Notificacion {
    constructor(
        public id_notificacion: number,
        public id_cita: number | null,
        public id_usuario: number,
        public tipo: TipoNotificacion,
        public mensaje: string,
        public enviado: boolean,
        public leida: boolean,
        public fecha_programada: Date,
    ) {}
}