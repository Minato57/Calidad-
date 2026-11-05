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
    administracionRol: string;
    medicoRol: string;
    admisionRol: string;

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
    cancelandoCita: string;
    volver: string;

    // Wizard Reservar Cita (Completo)
    volverAlInicio: string;
    agendarNuevaCitaSub: string;
    paso1Especialidad: string;
    paso2Medico: string;
    paso3Fecha: string;
    paso4HoraMotivo: string;
    queEspecialidadNecesitas: string;
    seleccionaOpcionContinuar: string;
    eligeTuMedico: string;
    noMedicosDisponibles: string;
    atras: string;
    continuar: string;
    eligeFechaCita: string;
    disponible: string;
    sinCupo: string;
    seleccionado: string;
    eligeHoraMotivo: string;
    horariosDisponibles: string;
    noHorariosFecha: string;
    datosDelMenor: string;
    especialidadParaMenores: string;
    registrarOtroMenor: string;
    motivoConsultaReq: string;
    placeholderMotivo: string;
    notasAdicionalesOpc: string;
    resumenCita: string;
    citaReservadaExito: string;
    teEsperamosSanGenaro: string;
    redirigiendoInicio: string;

    // Dashboard Paciente
    hola: string;
    cuidamosTuSalud: string;
    reservaEnSegundos: string;
    necesitasAtencionMedica: string;
    agendaConEspecialista: string;
    agendarNuevaCita: string;
    enUnMinuto: string;
    multiplesEspecialidades: string;
    proximaCita: string;
    noTienesCitasProximas: string;
    agendarMiPrimeraCita: string;
    cargandoInformacion: string;
    estadoProceso: string;
    verDetalle: string;
    visita: string;

    // Modales de cancelación
    cancelarEstaCita: string;
    avisoCancelacionTardia: string;
    avisoSuspensionCuenta: string;
    noMantener: string;
    siCancelar: string;
    cuentaSuspendida: string;
    citaCancelada: string;
    entendido: string;

    // Perfil Paciente
    pacienteRol: string;
    estadisticasTusCitas: string;
    cargandoEstadisticas: string;
    totalCitas: string;
    datosPersonales: string;
    nombres: string;
    apellidos: string;
    rol: string;
    avisoEditarDatos: string;

    // Mis Citas
    misCitasTitulo: string;
    misCitasSub: string;
    filtroTodas: string;
    filtroProximas: string;
    filtroCompletadas: string;
    filtroFaltas: string;
    filtroCanceladas: string;
    sinCitasRegistradas: string;

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

    // Reportes de citas
    reportesCitas: string;
    reportesCitasSub: string;
    desde: string;
    hasta: string;
    especialidad: string;
    medico: string;
    estado: string;
    todas: string;
    todos: string;
    generarReporte: string;
    generandoReporte: string;
    descargar: string;
    descargarComo: string;
    fecha: string;
    hora: string;
    paciente: string;
    reservadoPor: string;
    motivo: string;
    total: string;
    completadas: string;
    canceladas: string;
    faltas: string;
    reservadas: string;
    noCitasFiltros: string;

    // Días y meses para fechas
    
    // Estados adicionales y botones comunes
    estadoEnCurso: string;
    limpiar: string;
    quitarFiltros: string;

    // Médico
    misPacientes: string;
    pendientes: string;
    atendidos: string;
    atenderPaciente: string;
    diagnostico: string;
    receta: string;
    guardarAtencion: string;
    noPacientesDia: string;

    // Administración
    configurarSanciones: string;
    configurarSancionesSub: string;
    limiteInasistencias: string;
    diasSuspension: string;
    configurarCancelaciones: string;
    configurarCancelacionesSub: string;
    cancelacionMasivaTitulo: string;
    cancelacionMasivaSub: string;
    cuentasAdmisionTitulo: string;
    cuentasAdmisionSub: string;
    correosNotificacionTitulo: string;
    correosNotificacionSub: string;
    especialidadesTitulo: string;
    guardarCambios: string;
    cambiosGuardados: string;
    nuevaEspecialidad: string;
    nuevoMedico: string;
    nombre: string;
    descripcion: string;
    crear: string;
    cancelar: string;
    eliminar: string;
    activo: string;
    inactivo: string;
    acciones: string;

    
    // Insignias (Badges) y etiquetas comunes
    sinSeguro: string;
    familiar: string;
    menor: string;
    conAcceso: string;
    hoy: string;
    manana: string;
    enDias: string;
    haceDias: string;
    dias: string;

    // Sliders Sanciones y Cancelaciones
    limiteCancelaciones: string;
    limiteCancelacionesSub: string;
    limiteInasistenciasSub: string;
    diasSuspensionSub: string;

    // Especialidades traducidas
    especialidadesTraducidas: Record<string, { nombre: string; descripcion: string }>;

    diasSemana: string[];
    meses: string[];
}
