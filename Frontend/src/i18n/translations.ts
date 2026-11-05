import { Idioma, IdiomaInfo, TraduccionEsquema } from './types';

export const IDIOMAS_DISPONIBLES: IdiomaInfo[] = [
    { codigo: 'es', nombre: 'Español', nombreNativo: 'Español', icono: '🇵🇪' },
    { codigo: 'en', nombre: 'Inglés', nombreNativo: 'English', icono: '🇺🇸' },
    { codigo: 'qu', nombre: 'Quechua', nombreNativo: 'Runasimi', icono: '🏔️' },
    { codigo: 'ay', nombre: 'Aimara', nombreNativo: 'Aymar aru', icono: '☀️' },
];

export const traducciones: Record<Idioma, TraduccionEsquema> = {
    es: {
        // Accesibilidad & Global
        accesibilidad: 'Accesibilidad',
        saltarContenido: 'Saltar al contenido',
        tamanoTexto: 'Tamaño de texto',
        altoContraste: 'Alto contraste',
        restablecer: 'Restablecer valores',
        idioma: 'Idioma',
        idiomasDisponibles: 'Seleccionar idioma',

        // Navegación & Header
        inicio: 'Inicio',
        reservarCita: 'Reservar cita',
        misCitas: 'Mis citas',
        miPerfil: 'Mi perfil',
        cerrarSesion: 'Cerrar sesión',
        notificaciones: 'Notificaciones',
        tituloCentro: 'Centro Materno Infantil\nSan Genaro de Villa',

        // Login & Auth
        iniciarSesion: 'Iniciar sesión',
        bienvenido: 'Bienvenido de nuevo',
        correoElectronico: 'Correo electrónico',
        contrasena: 'Contraseña',
        ingresar: 'Ingresar',
        ingresando: 'Ingresando...',
        noTienesCuenta: '¿No tienes una cuenta?',
        registrateAqui: 'Regístrate aquí',
        yaTienesCuenta: '¿Ya tienes una cuenta?',
        registroTitulo: 'Crear cuenta',

        // Citas & Reserva
        seleccionarEspecialidad: 'Seleccionar especialidad',
        seleccionarMedico: 'Seleccionar médico',
        seleccionarFecha: 'Seleccionar fecha',
        seleccionarHora: 'Seleccionar hora',
        motivoConsulta: 'Motivo de consulta',
        confirmarReserva: 'Confirmar reserva',
        cancelarCita: 'Cancelar cita',
        volver: 'Volver',

        // Estados de Cita
        estadoReservada: 'Reservada',
        estadoConfirmada: 'Confirmada',
        estadoRecordatorio: 'Recordatorio',
        estadoCompletada: 'Completada',
        estadoCancelada: 'Cancelada',
        estadoFalta: 'Falta',

        // ODS 10 & Equidad
        ods10Titulo: 'Equidad de acceso (ODS 10)',
        ods10Descripcion: 'Compara el acceso y el cumplimiento de citas entre grupos poblacionales usando los filtros de fecha y especialidad.',
        generarReporteEquidad: 'Generar reporte de equidad',
        brechaInasistencia: 'Brecha de inasistencia',

        // Administración
        gestionSistema: 'GESTIÓN DEL SISTEMA',
        especialidades: 'Especialidades',
        sanciones: 'Sanciones',
        cancelaciones: 'Cancelaciones',
        cancelacionMasiva: 'Cancelación masiva',
        cuentasAdmision: 'Cuentas Admisión',
        correos: 'Correos',
        reportes: 'Reportes',
    },
    en: {
        // Accesibilidad & Global
        accesibilidad: 'Accessibility',
        saltarContenido: 'Skip to content',
        tamanoTexto: 'Text size',
        altoContraste: 'High contrast',
        restablecer: 'Reset settings',
        idioma: 'Language',
        idiomasDisponibles: 'Select language',

        // Navegación & Header
        inicio: 'Home',
        reservarCita: 'Book appointment',
        misCitas: 'My appointments',
        miPerfil: 'My profile',
        cerrarSesion: 'Log out',
        notificaciones: 'Notifications',
        tituloCentro: 'Maternal & Child Center\nSan Genaro de Villa',

        // Login & Auth
        iniciarSesion: 'Log in',
        bienvenido: 'Welcome back',
        correoElectronico: 'Email address',
        contrasena: 'Password',
        ingresar: 'Sign in',
        ingresando: 'Signing in...',
        noTienesCuenta: "Don't have an account?",
        registrateAqui: 'Sign up here',
        yaTienesCuenta: 'Already have an account?',
        registroTitulo: 'Create account',

        // Citas & Reserva
        seleccionarEspecialidad: 'Select specialty',
        seleccionarMedico: 'Select doctor',
        seleccionarFecha: 'Select date',
        seleccionarHora: 'Select time',
        motivoConsulta: 'Reason for visit',
        confirmarReserva: 'Confirm booking',
        cancelarCita: 'Cancel appointment',
        volver: 'Go back',

        // Estados de Cita
        estadoReservada: 'Booked',
        estadoConfirmada: 'Confirmed',
        estadoRecordatorio: 'Reminder sent',
        estadoCompletada: 'Completed',
        estadoCancelada: 'Cancelled',
        estadoFalta: 'No-show',

        // ODS 10 & Equidad
        ods10Titulo: 'Access Equity (SDG 10)',
        ods10Descripcion: 'Compare healthcare access and appointment attendance across demographic groups using date and specialty filters.',
        generarReporteEquidad: 'Generate equity report',
        brechaInasistencia: 'Non-attendance gap',

        // Administración
        gestionSistema: 'SYSTEM MANAGEMENT',
        especialidades: 'Specialties',
        sanciones: 'Sanctions',
        cancelaciones: 'Cancellations',
        cancelacionMasiva: 'Mass cancellation',
        cuentasAdmision: 'Admission accounts',
        correos: 'Emails',
        reportes: 'Reports',
    },
    qu: {
        // Accesibilidad & Global
        accesibilidad: 'Haypana allichay (Accesibilidad)',
        saltarContenido: 'Kurkuman paway',
        tamanoTexto: 'Qillqa hatunyay',
        altoContraste: 'K\'anchay rikuchiy',
        restablecer: 'Kaqmanta allichay',
        idioma: 'Simi (Idioma)',
        idiomasDisponibles: 'Simita akllay',

        // Navegación & Header
        inicio: 'Qallariy',
        reservarCita: 'Tupanata waqaychay',
        misCitas: 'Ñuqapa tupanaykuna',
        miPerfil: 'Kikin kayniy',
        cerrarSesion: 'Lluqsiy',
        notificaciones: 'Willaykuna',
        tituloCentro: 'Mawkay Mama Wawa Hampina Wasi\nSan Genaro de Villa',

        // Login & Auth
        iniciarSesion: 'Yaykuy',
        bienvenido: 'Allin hamusqayki',
        correoElectronico: 'Chaski qillqa (Correo)',
        contrasena: 'Pakasqa simi',
        ingresar: 'Yaykuy',
        ingresando: 'Yaykuchkan...',
        noTienesCuenta: '¿Manachu yupayniyuq kanki?',
        registrateAqui: 'Kaypi qillqakuy',
        yaTienesCuenta: '¿Ñachu yupayniyuq kanki?',
        registroTitulo: 'Musuq yupayta kichay',

        // Citas & Reserva
        seleccionarEspecialidad: 'Hampina kiti akllay',
        seleccionarMedico: 'Hampiqta akllay',
        seleccionarFecha: 'P\'unchawta akllay',
        seleccionarHora: 'Pachata akllay',
        motivoConsulta: 'Hampikuna rayku',
        confirmarReserva: 'Waqaychayta takyachiy',
        cancelarCita: 'Tupanata tatichiy',
        volver: 'Kutiy',

        // Estados de Cita
        estadoReservada: 'Waqaychasqa',
        estadoConfirmada: 'Takyachisqa',
        estadoRecordatorio: 'Yuyarichiypaq',
        estadoCompletada: 'Tukusqa',
        estadoCancelada: 'Tatichisqa',
        estadoFalta: 'Mana chayasqa',

        // ODS 10 & Equidad
        ods10Titulo: 'Llapanchikpaq haypana (ODS 10)',
        ods10Descripcion: 'Llapa runakunapa hampinaman chayasqanta qaway chaymanta tupanata hunt\'asqankuta.',
        generarReporteEquidad: 'Kuskachasqa willakuyta ruray',
        brechaInasistencia: 'Mana chayasqakuna chikan kaynin',

        // Administración
        gestionSistema: 'LLIKACHA KAMACHIY',
        especialidades: 'Hampina kitikuna',
        sanciones: 'Wanachiykuna',
        cancelaciones: 'Tatichiykuna',
        cancelacionMasiva: 'Llapanchik tatichiy',
        cuentasAdmision: 'Yaykuna yupaykuna',
        correos: 'Chaski qillqakuna',
        reportes: 'Willakuykuna',
    },
    ay: {
        // Accesibilidad & Global
        accesibilidad: 'Askichawi (Accesibilidad)',
        saltarContenido: 'Uñacht\'awiru thuquña',
        tamanoTexto: 'Qillqa jach\'aptayaña',
        altoContraste: 'Qhana uñstayawi',
        restablecer: 'Wasitat askichaña',
        idioma: 'Aru (Idioma)',
        idiomasDisponibles: 'Aru ajlliña',

        // Navegación & Header
        inicio: 'Qalltawi',
        reservarCita: 'Tantachawi katuqaña',
        misCitas: 'Nayan tantachawinaka',
        miPerfil: 'Nayan jakawija',
        cerrarSesion: 'Mistsuña',
        notificaciones: 'Yatiyawinaka',
        tituloCentro: 'Tayka Wawa Qullawasi\nSan Genaro de Villa',

        // Login & Auth
        iniciarSesion: 'Mantaniña',
        bienvenido: 'Wali purintatawa',
        correoElectronico: 'Correo chaski',
        contrasena: 'Imantata aru',
        ingresar: 'Mantam',
        ingresando: 'Mantasiskawa...',
        noTienesCuenta: '¿Janiw chitsuwitataxiti?',
        registrateAqui: 'Akan qillqasita',
        yaTienesCuenta: '¿Qillqasitaxitixa?',
        registroTitulo: 'Machaq chitsuw qillqaña',

        // Citas & Reserva
        seleccionarEspecialidad: 'Qullañ kasta ajlliña',
        seleccionarMedico: 'Qulliri ajlliña',
        seleccionarFecha: 'Uru ajlliña',
        seleccionarHora: 'Pacha ajlliña',
        motivoConsulta: 'Kuna layku qullasiñani',
        confirmarReserva: 'Katuqawi iyaw saña',
        cancelarCita: 'Tantachawi jiwt\'ayaña',
        volver: 'Kutt\'aña',

        // Estados de Cita
        estadoReservada: 'Katuqata',
        estadoConfirmada: 'Iyawsata',
        estadoRecordatorio: 'Amtayawi',
        estadoCompletada: 'Tukuyata',
        estadoCancelada: 'Jiskt\'ata',
        estadoFalta: 'Jani jutiri',

        // ODS 10 & Equidad
        ods10Titulo: 'Taqinitaki qullasiwi (ODS 10)',
        ods10Descripcion: 'Uñt\'atawa qhawqhasa jaqinakaxa qullawasi katuqasipxi, urunakaru kasta qullañanakampi.',
        generarReporteEquidad: 'Kusisit yatiyawi lurayaña',
        brechaInasistencia: 'Jani jutirinakan jilampi kankaña',

        // Administración
        gestionSistema: 'SISTEMA UNCH\'UKITA',
        especialidades: 'Qullañ kastanaka',
        sanciones: 'Mutuyawinaka',
        cancelaciones: 'Jiskt\'atanaka',
        cancelacionMasiva: 'Taqinitak jiskt\'awi',
        cuentasAdmision: 'Katuqiri cuenta-naka',
        correos: 'Chaski qillqanaka',
        reportes: 'Yatiyawinaka',
    },
};
