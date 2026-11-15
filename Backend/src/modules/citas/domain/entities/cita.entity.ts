// =================================================================
// CAPA: Domain / Entities
// Entidad PURA del dominio "Cita".
// Representa la reserva de un paciente sobre un horario específico.
//
// Estados posibles:  RESERVADA → COMPLETADA | FALTA | CANCELADA
//   RESERVADA  -> creada por el paciente, pendiente de atención
//   COMPLETADA -> asistió (lo marca admisión, o el médico al registrar la atención)
//   FALTA      -> no asistió (lo marca admisión o el cierre automático nocturno)
//   CANCELADA  -> cancelada por el paciente o por el administrador
// El recordatorio de 24 h es solo una NOTIFICACIÓN, no un estado.
// =================================================================
export const ESTADOS_CITA = ['RESERVADA', 'COMPLETADA', 'CANCELADA', 'FALTA'] as const;
export type EstadoCita = typeof ESTADOS_CITA[number];

export class Cita {
    constructor(
        public id_cita: number,
        public id_usuario: number,        // paciente (FK -> usuarios)
        public id_horario: number,        // FK -> horarios
        public id_dependiente: number | null,
        public motivo: string | null,
        public notas: string | null,
        public estado: EstadoCita,
        public fecha_registro: Date,
    ) {}
}