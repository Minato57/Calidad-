// =================================================================
// Tipos TypeScript globales del frontend
// =================================================================

export type Rol = 'PACIENTE' | 'ADMISION' | 'ADMIN' | 'MEDICO';

// ----- Auth -----
export interface JwtPayload {
    id: number;
    rol: Rol;
    iat?: number;
    exp?: number;
}

export interface LoginResponse {
    token: string;
    id_usuario: number;
    correo: string;
    nombres: string;
    apellidos: string;
    rol: Rol;
}

export interface Usuario {
    id_usuario: number;
    correo: string;
    nombres: string;
    apellidos: string;
    rol: Rol;
    dni?: string;
    telefono?: string;
}

// ----- Citas -----
export type EstadoCita = 'RESERVADA' | 'CONFIRMADA' | 'RECORDATORIO' | 'COMPLETADA' | 'FALTA' | 'CANCELADA';

export interface Especialidad {
    id_especialidad: number;
    nombre: string;
    descripcion?: string;
    estado?: 'ACTIVA' | 'INACTIVA';
    fecha_inhabilitacion?: string | null;
    fecha_habilitacion?: string | null;
    requiere_datos_menor?: boolean;
}

export interface Horario {
    hora: string;              // "08:00:00"
    id_medico: number;
    medico_nombres: string;
    medico_apellidos: string;
    disponible: boolean;
}

export interface DiaCalendario {
    fecha: string;             // "2026-06-16"
    total: number;
    libres: number;
    reservable: boolean;
}

export interface Cita {
    id_cita: number;
    id_usuario: number;
    id_horario: number;
    id_dependiente: number | null;
    motivo: string | null;
    notas: string | null;
    estado: EstadoCita;
    fecha_registro: string;
}

export interface CitaConDetalles extends Cita {
    fecha?: string;
    hora?: string;
    especialidad?: string;
    medico_nombres?: string;
    medico_apellidos?: string;
    // Datos del menor/dependiente (null si la cita es para el titular)
    dependiente_nombres?: string | null;
    dependiente_apellidos?: string | null;
    dependiente_parentesco?: string | null;
    es_para_menor?: boolean;
}

export interface ContadoresPaciente {
    total: number;
    completadas: number;
    proximas: number;
    canceladas: number;
    faltas: number;
}

// ----- Notificaciones -----
export type TipoNotificacion = 'CANCELACION' | 'RECORDATORIO';

export interface Notificacion {
    id_notificacion: number;
    id_cita: number | null;
    id_usuario: number;
    tipo: TipoNotificacion;
    mensaje: string;
    enviado: boolean;
    leida: boolean;
    fecha_programada: string;
}

// ----- Respuestas API -----
export interface ApiResponse<T = unknown> {
    ok: boolean;
    mensaje?: string;
    [key: string]: T | unknown;
    
}
// ----- Admisión -----
export interface CitaDelDia {
    cita: {
        id_cita: number;
        id_usuario: number;
        id_horario: number;
        estado: EstadoCita;
        motivo: string | null;
    };
    paciente_nombres: string;
    paciente_apellidos: string;
    paciente_dni: string;
    fecha: string;
    hora: string;
    id_medico: number;
    medico_nombres: string;
    medico_apellidos: string;
    especialidad: string;
}

// ----- Admin -----
export interface Medico {
    id_medico: number;
    nombres: string;
    apellidos: string;
    id_especialidad: number;
    especialidad: string;
    estado?: 'ACTIVO' | 'INACTIVO';
    tiene_cuenta?: boolean;
    cmp?: string | null;
    fecha_inhabilitacion?: string | null;
    fecha_habilitacion?: string | null;
}

export interface MedicoReserva {
    id_medico: number;
    nombres: string;
    apellidos: string;
}

export interface UsuarioAdmision {
    id_usuario: number;
    correo: string;
    nombres: string;
    apellidos: string;
    dni: string;
    activo: boolean;
}

export interface Sanciones {
    limite_inasistencias: number;
    dias_suspension: number;
}

// ----- Correos remitentes (envío de notificaciones) -----
export interface Remitente {
    id_remitente: number;
    correo: string;
    nombre_remitente: string | null;
    host: string | null;
    puerto: number | null;
    activo: boolean;
    prioridad: number;
    tiene_password: boolean;
}

// ----- Reporte de citas (administración) -----
export interface ReporteCita {
    id_cita: number;
    fecha: string;
    hora: string;
    especialidad: string;
    medico: string;
    paciente: string;
    parentesco: string | null;
    reservado_por: string;
    reservado_por_dni: string;
    es_menor: boolean;
    estado: EstadoCita;
    motivo: string | null;
}

export interface ReporteTotales {
    total: number;
    completadas: number;
    canceladas: number;
    faltas: number;
    reservadas: number;
}

export interface Dependiente {
    id_dependiente: number;
    nombres: string;
    apellidos: string;
    dni: string | null;
    fecha_nacimiento: string | null;
    parentesco: string | null;
}
// ----- ODS 10: reporte de equidad -----
export interface GrupoEquidad {
    grupo: string;
    total: number;
    completadas: number;
    canceladas: number;
    faltas: number;
    participacion_pct: number;
    tasa_inasistencia_pct: number;
    tasa_cancelacion_pct: number;
}

export interface ReporteEquidad {
    total: number;
    brecha_inasistencia_pp: number;
    por_grupo_etario: GrupoEquidad[];
    por_genero: GrupoEquidad[];
    por_tipo_reserva: GrupoEquidad[];
    por_especialidad: GrupoEquidad[];
}

// ----- Panel del medico / seguro / pagos -----
export interface SeguroInfo {
    dni: string;
    tipo: 'SIS' | 'NINGUNO' | 'DESCONOCIDO';
    tiene_seguro: boolean;
    fuente: 'SIS_SCRAPER' | 'SIMULADO';
    verificado: boolean;
    detalle?: string;
    consultado_en: string;
    desde_cache: boolean;
}

export interface RequisitoPago {
    ok: boolean;
    dni: string;
    seguro: SeguroInfo;
    requiere_pago: boolean;
    monto: number;
    moneda: 'PEN';
}

export interface CheckoutPago {
    ok: boolean;
    mensaje?: string;
    requiere_pago?: boolean;
    simulado?: boolean;
    id_pago?: number;
    monto?: number;
    moneda?: string;
    init_point?: string;
}

export interface PerfilMedico {
    id_medico: number;
    cmp: string | null;
    nombres: string;
    apellidos: string;
    especialidad: string;
}

export interface CitaMedico {
    id_cita: number;
    estado: EstadoCita;
    motivo: string | null;
    notas: string | null;
    fecha: string;
    hora: string;
    es_familiar: boolean;
    parentesco: string | null;
    paciente_nombres: string;
    paciente_apellidos: string;
    paciente_dni: string;
    fecha_nacimiento: string | null;
    titular_nombre: string;
    tiene_correo: boolean;
    atendida: boolean;
    correo_enviado: boolean;
    codigo_verificacion: string | null;
    seguro: { tipo: string; tiene_seguro: boolean; verificado: boolean } | null;
}