export type Idioma = 'es' | 'en' | 'qu' | 'ay';

export interface IdiomaInfo {
    codigo: Idioma;
    nombre: string;
    nombreNativo: string;
    icono: string;
}

export interface TraduccionEsquema {
    // Accesibilidad & Global
    accesibilidad: string;
    saltarContenido: string;
    tamanoTexto: string;
    altoContraste: string;
    restablecer: string;
    idioma: string;
    idiomasDisponibles: string;

    // Navegación & Header
    inicio: string;
    reservarCita: string;
    misCitas: string;
    miPerfil: string;
    cerrarSesion: string;
    notificaciones: string;
    tituloCentro: string;

    // Login & Auth
    iniciarSesion: string;
    bienvenido: string;
    correoElectronico: string;
    contrasena: string;
    ingresar: string;
    ingresando: string;
    noTienesCuenta: string;
    registrateAqui: string;
    yaTienesCuenta: string;
    registroTitulo: string;

    // Citas & Reserva
    seleccionarEspecialidad: string;
    seleccionarMedico: string;
    seleccionarFecha: string;
    seleccionarHora: string;
    motivoConsulta: string;
    confirmarReserva: string;
    cancelarCita: string;
    volver: string;

    // Estados de Cita
    estadoReservada: string;
    estadoConfirmada: string;
    estadoRecordatorio: string;
    estadoCompletada: string;
    estadoCancelada: string;
    estadoFalta: string;

    // ODS 10 & Equidad
    ods10Titulo: string;
    ods10Descripcion: string;
    generarReporteEquidad: string;
    brechaInasistencia: string;

    // Administración
    gestionSistema: string;
    especialidades: string;
    sanciones: string;
    cancelaciones: string;
    cancelacionMasiva: string;
    cuentasAdmision: string;
    correos: string;
    reportes: string;
}
