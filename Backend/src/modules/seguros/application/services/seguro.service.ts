// =================================================================
// CAPA: Application / Services
// Verificación del SIS (Seguro Integral de Salud) por DNI.
//
// Estado guardado en `seguros_consultas` (una fila por DNI: titular o familiar):
//   SIN_VERIFICAR → nunca validado: en su primera reserva se le pide validar.
//   CON_SIS       → SIS activo verificado; vale SIS_VIGENCIA_DIAS (90). 7 días
//                   antes se avisa por correo; al vencer pasa a VENCIDO y la
//                   siguiente reserva vuelve a pedir la validación.
//   SIN_SIS       → verificado sin SIS activo; permanente hasta que el paciente
//                   pulse «Recalibrar» (p. ej. si renovó su SIS).
//
// Reglas:
//   - Lo hace cada PACIENTE para sí mismo o sus familiares (no el personal).
//   - Nunca se inventa un resultado: si el portal falla, no se guarda nada.
//   - El nombre devuelto por el portal debe coincidir con el registrado para
//     ese DNI; si no, no se guarda nada ("datos de otra persona").
//   - Máximo 5 intentos fallidos cada 10 min y 1 verificación exitosa por día y DNI.
//   - SEGURO_PROVIDER=simulado habilita un modo DEMO explícito (jamás en producción).
// =================================================================
import { AppDataSource } from '../../../../config/datasource';
import { SisPortalClient, SisPortalError } from '../../infrastructure/sis-portal.client';
import {
    construirTramaConsulta,
    interpretarRespuestaSIS,
    nombreCoincide,
    estadoSeguro,
    EstadoSeguro,
} from '../../domain/sis-protocolo';
import { LimitadorIntentos } from './limitador-intentos';

export type TipoSeguro = 'SIS' | 'NINGUNO' | 'DESCONOCIDO';
export type FuenteSeguro = 'SIS_SCRAPER' | 'SIMULADO';

export interface ResultadoSeguro {
    dni: string;
    estado: EstadoSeguro;
    tipo: TipoSeguro;
    tiene_seguro: boolean;   // true solo si estado = CON_SIS
    verificado: boolean;     // true si estado = CON_SIS o SIN_SIS
    fuente: FuenteSeguro;
    detalle?: string;
    consultado_en: string | null;
    vence_en: string | null; // solo CON_SIS / VENCIDO
    puede_recalibrar: boolean;
    recalibrar_desde: string | null; // si ya se verificó hoy, desde cuándo puede volver
}

export interface SesionVerificacion {
    ok: true;
    simulado: boolean;
    token: string;
    captchaImage: string;
    fechaNacimiento: string | null;   // la registrada en el sistema, para precargar el formulario
}

export interface PersonaSeguro {
    id_usuario: number;
    es_titular: boolean;
    nombres: string;
    apellidos: string;
    parentesco: string | null;
    dni: string | null;
    seguro: ResultadoSeguro | null;   // null si la persona no tiene DNI registrado
}

const DIAS_AVISO_PREVIO = 7;
const HORAS_ENTRE_VERIFICACIONES = 24;

// Límite compartido por todas las instancias del servicio.
const limitador = new LimitadorIntentos(5, 10 * 60_000);

function errorHttp(status: number, mensaje: string, codigo?: string): Error {
    return Object.assign(new Error(mensaje), { status, codigo });
}

function fechaLocalStr(fecha: any): string | null {
    if (!fecha) return null;
    if (fecha instanceof Date) {
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    }
    return String(fecha).slice(0, 10);
}

function fechaLegible(fecha: Date): string {
    return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
}

export class SeguroService {
    private portal = new SisPortalClient();

    private get vigenciaDias(): number {
        return Number(process.env.SIS_VIGENCIA_DIAS) || 90;
    }

    /** Modo DEMO explícito; nunca se activa en producción. */
    private get modoSimulado(): boolean {
        return (process.env.SEGURO_PROVIDER || '').toLowerCase() === 'simulado'
            && process.env.NODE_ENV !== 'production';
    }

    // ------------------------------------------------------------
    // Conversión fila → resultado (aplica la vigencia de 90 días)
    // ------------------------------------------------------------
    private aResultado(dni: string, fila: any | null, ahora = new Date()): ResultadoSeguro {
        const { estado, venceEn } = estadoSeguro(fila, {
            ahora, vigenciaDias: this.vigenciaDias, aceptarSimulado: this.modoSimulado,
        });
        const valida = estado === 'CON_SIS' || estado === 'SIN_SIS';
        const consultado = valida && fila ? new Date(fila.consultado_en) : null;

        // 1 verificación exitosa por día y DNI.
        const desde = consultado ? new Date(consultado.getTime() + HORAS_ENTRE_VERIFICACIONES * 3_600_000) : null;
        const puede = !desde || ahora >= desde;

        const tipo: TipoSeguro = estado === 'CON_SIS' ? 'SIS' : estado === 'SIN_SIS' ? 'NINGUNO' : 'DESCONOCIDO';
        let detalle: string | undefined;
        if (estado === 'SIN_VERIFICAR') detalle = 'Aún no se verifica en el portal del SIS';
        else if (estado === 'VENCIDO') detalle = `La verificación del SIS venció el ${fechaLegible(venceEn!)}`;
        else detalle = fila?.detalle ?? undefined;

        return {
            dni,
            estado,
            tipo,
            tiene_seguro: estado === 'CON_SIS',
            verificado: valida,
            fuente: fila?.fuente === 'SIMULADO' || (!fila && this.modoSimulado) ? 'SIMULADO' : 'SIS_SCRAPER',
            detalle,
            consultado_en: fila && estado !== 'SIN_VERIFICAR' ? new Date(fila.consultado_en).toISOString() : null,
            vence_en: venceEn ? venceEn.toISOString() : null,
            puede_recalibrar: puede,
            recalibrar_desde: puede || !desde ? null : desde.toISOString(),
        };
    }

    private async filasPorDni(dnis: string[]): Promise<Map<string, any>> {
        const mapa = new Map<string, any>();
        if (dnis.length === 0) return mapa;
        const rows = await AppDataSource.query(
            `SELECT * FROM seguros_consultas WHERE dni IN (${dnis.map(() => '?').join(',')})`,
            dnis,
        );
        rows.forEach((r: any) => mapa.set(String(r.dni).trim(), r));
        return mapa;
    }

    /** Estado del seguro de un DNI. */
    async consultar(dni: string): Promise<ResultadoSeguro> {
        if (!/^\d{8}$/.test(dni)) throw errorHttp(400, 'El DNI debe tener 8 dígitos');
        const filas = await this.filasPorDni([dni]);
        return this.aResultado(dni, filas.get(dni) ?? null);
    }

    /** Estado (solo verificaciones válidas) de varios DNI: panel del médico. */
    async obtenerCache(dnis: string[]): Promise<Map<string, ResultadoSeguro>> {
        const filas = await this.filasPorDni(dnis);
        const mapa = new Map<string, ResultadoSeguro>();
        filas.forEach((fila, dni) => {
            const r = this.aResultado(dni, fila);
            if (r.verificado) mapa.set(dni, r);
        });
        return mapa;
    }

    /** Titular + familiares del paciente con el estado del SIS de cada uno (Mi Perfil). */
    async estadosDelPaciente(idUsuario: number): Promise<PersonaSeguro[]> {
        const personas = await AppDataSource.query(
            `SELECT id_usuario, nombres, apellidos, parentesco, dni, (id_usuario = ?) AS es_titular
             FROM usuarios
             WHERE id_usuario = ? OR (id_tutor = ? AND rol = 'FAMILIAR')
             ORDER BY es_titular DESC, id_usuario ASC`,
            [idUsuario, idUsuario, idUsuario],
        );
        const dnis = personas.map((p: any) => String(p.dni ?? '').trim()).filter((d: string) => /^\d{8}$/.test(d));
        const filas = await this.filasPorDni(dnis);
        const ahora = new Date();
        return personas.map((p: any) => {
            const dni = /^\d{8}$/.test(String(p.dni ?? '').trim()) ? String(p.dni).trim() : null;
            return {
                id_usuario: Number(p.id_usuario),
                es_titular: !!Number(p.es_titular),
                nombres: p.nombres ?? '',
                apellidos: p.apellidos ?? '',
                parentesco: p.parentesco ?? null,
                dni,
                seguro: dni ? this.aResultado(dni, filas.get(dni) ?? null, ahora) : null,
            };
        });
    }

    /** Un PACIENTE solo puede operar sobre su DNI o el de sus familiares; el personal, sobre cualquiera. */
    async puedeGestionarDni(usuario: { id: number; rol: string }, dni: string): Promise<boolean> {
        if (usuario.rol !== 'PACIENTE') return true;
        const rows = await AppDataSource.query(
            `SELECT id_usuario FROM usuarios WHERE dni = ? AND (id_usuario = ? OR (id_tutor = ? AND rol = 'FAMILIAR')) LIMIT 1`,
            [dni, usuario.id, usuario.id],
        );
        return rows.length > 0;
    }

    private async personaPorDni(dni: string): Promise<{ nombres: string; apellidos: string; fecha_nacimiento: string | null } | null> {
        const rows = await AppDataSource.query(
            `SELECT nombres, apellidos, fecha_nacimiento FROM usuarios WHERE dni = ? LIMIT 1`, [dni],
        );
        if (rows.length === 0) return null;
        return {
            nombres: rows[0].nombres ?? '',
            apellidos: rows[0].apellidos ?? '',
            fecha_nacimiento: fechaLocalStr(rows[0].fecha_nacimiento),
        };
    }

    // ------------------------------------------------------------
    // Validaciones previas comunes a los dos pasos
    // ------------------------------------------------------------
    private async verificarLimites(idUsuario: number, dni: string): Promise<void> {
        const minutos = limitador.minutosBloqueo(idUsuario);
        if (minutos > 0) {
            throw errorHttp(429, `Demasiados intentos fallidos. Vuelve a intentarlo en ${minutos} minuto(s).`, 'LIMITE_INTENTOS');
        }
        const actual = await this.consultar(dni);
        if (!actual.puede_recalibrar && actual.recalibrar_desde) {
            const desde = new Date(actual.recalibrar_desde);
            throw errorHttp(429,
                `Este DNI ya se verificó hoy. Podrás volver a verificarlo desde el ${fechaLegible(desde)} a las ${String(desde.getHours()).padStart(2, '0')}:${String(desde.getMinutes()).padStart(2, '0')}.`,
                'LIMITE_DIARIO');
        }
    }

    /** Paso 1: abre la sesión con el portal y devuelve el Captcha que debe resolver el usuario. */
    async iniciarVerificacion(dni: string, idUsuario: number): Promise<SesionVerificacion> {
        if (!/^\d{8}$/.test(dni)) throw errorHttp(400, 'El DNI debe tener 8 dígitos');
        await this.verificarLimites(idUsuario, dni);
        const persona = await this.personaPorDni(dni);
        const fechaNacimiento = persona?.fecha_nacimiento ?? null;

        if (this.modoSimulado) {
            return { ok: true, simulado: true, token: '', captchaImage: '', fechaNacimiento };
        }

        try {
            const sesion = await this.portal.iniciarSesion();
            return {
                ok: true,
                simulado: false,
                token: sesion.token,
                captchaImage: `data:image/png;base64,${sesion.captchaPng.toString('base64')}`,
                fechaNacimiento,
            };
        } catch (err: any) {
            console.error('[SIS] No se pudo iniciar la verificación:', err?.message, err?.causa ?? '');
            throw errorHttp(503, 'El portal del SIS no está disponible en este momento. Intenta más tarde; mientras tanto puedes pagar la consulta.', 'PORTAL_NO_DISPONIBLE');
        }
    }

    /** Paso 2: consulta el portal con el Captcha resuelto y guarda el resultado. */
    async verificarConCaptcha(datos: {
        dni: string;
        fechaNacimiento: string;
        codigoCaptcha: string;
        token?: string;
    }, idUsuario: number): Promise<ResultadoSeguro> {
        const { dni, fechaNacimiento } = datos;
        if (!/^\d{8}$/.test(dni)) throw errorHttp(400, 'El DNI debe tener 8 dígitos');
        await this.verificarLimites(idUsuario, dni);

        const fecha = new Date(`${fechaNacimiento}T00:00:00`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento) || Number.isNaN(fecha.getTime())
            || fecha > new Date() || fecha.getFullYear() < 1900) {
            throw errorHttp(400, 'Ingresa una fecha de nacimiento válida', 'FECHA');
        }

        const persona = await this.personaPorDni(dni);
        if (!persona) throw errorHttp(404, 'No hay ninguna persona registrada con ese DNI');

        if (this.modoSimulado) {
            const asegurados = (process.env.SIS_SIMULADO_ASEGURADOS || '').split(',').map(s => s.trim()).filter(Boolean);
            const tiene = asegurados.includes(dni);
            limitador.limpiar(idUsuario);
            return this.guardar(dni, tiene, 'SIMULADO',
                tiene ? 'MODO DEMO: SIS activo (simulado, sin consulta al portal)' : 'MODO DEMO: sin SIS (simulado, sin consulta al portal)');
        }

        const codigoCaptcha = (datos.codigoCaptcha || '').trim();
        if (!/^[A-Za-z0-9]{3,8}$/.test(codigoCaptcha)) {
            throw errorHttp(400, 'Ingresa el código de la imagen (Captcha)', 'CAPTCHA');
        }
        const token = (datos.token || '').trim();
        if (!/^[A-Za-z0-9-]{8,64}$/.test(token)) {
            throw errorHttp(400, 'La sesión de verificación no es válida. Actualiza el código e inténtalo de nuevo.', 'CAPTCHA');
        }

        let descifrada: string;
        try {
            descifrada = await this.portal.consultar(token, construirTramaConsulta({ dni, fechaNacimiento, codigoCaptcha }));
        } catch (err: any) {
            const causa = err instanceof SisPortalError ? err.causa : err?.message;
            console.error('[SIS] Error al consultar el portal:', err?.message, causa ?? '');
            throw errorHttp(503, 'El portal del SIS no está disponible en este momento. Intenta más tarde; mientras tanto puedes pagar la consulta.', 'PORTAL_NO_DISPONIBLE');
        }

        const r = interpretarRespuestaSIS(descifrada);
        const fallo = (status: number, mensaje: string, codigo: string): Error => {
            limitador.registrarFallo(idUsuario);
            return errorHttp(status, mensaje, codigo);
        };
        switch (r.tipo) {
            case 'CAPTCHA_INCORRECTO':
                throw fallo(400, 'El código no coincide con la imagen. Se cargó un código nuevo; tus demás datos se mantienen.', 'CAPTCHA');
            case 'CAPTCHA_EXPIRADO':
                throw fallo(400, 'El código expiró. Se cargó un código nuevo; vuelve a intentarlo.', 'CAPTCHA');
            case 'ERROR_PORTAL':
                throw fallo(400, `El portal del SIS no pudo procesar la consulta (código ${r.codigo}). Vuelve a intentarlo.`, 'ERROR_PORTAL');
            case 'NO_RECONOCIDO':
                // Solo se registran los nombres de columnas (sin datos personales) para ajustar el intérprete.
                console.warn('[SIS] Respuesta con formato no reconocido. Cabeceras:', r.cabeceras ?? '(sin cabeceras)', '| longitud:', descifrada.length);
                throw errorHttp(502, 'No se pudo interpretar la respuesta del portal del SIS. Tu estado no fue modificado.', 'RESPUESTA_NO_RECONOCIDA');
        }

        // Si el portal encontró al asegurado, su nombre debe ser el registrado para este DNI.
        if (r.estado !== null) {
            if (!r.nombre) {
                console.warn('[SIS] Respuesta sin columna de nombres. Cabeceras:', r.cabeceras);
                throw errorHttp(502, 'No se pudo confirmar la identidad con el portal del SIS. Tu estado no fue modificado.', 'RESPUESTA_NO_RECONOCIDA');
            }
            if (!nombreCoincide(persona, r.nombre)) {
                throw fallo(409,
                    'Estás usando datos de otra persona: el DNI no corresponde a los nombres registrados en el sistema. Revisa los datos y vuelve a intentar la verificación.',
                    'DATOS_AJENOS');
            }
        }

        limitador.limpiar(idUsuario);
        let detalle: string;
        if (r.asegurado) {
            detalle = `Afiliación ${r.estado}${r.regimen ? ` · ${r.regimen}` : ''}`;
        } else if (r.estado) {
            detalle = `Afiliación ${r.estado}${r.regimen ? ` · ${r.regimen}` : ''} (sin cobertura vigente)`;
        } else {
            detalle = 'El portal no registra afiliación al SIS para este DNI';
        }
        return this.guardar(dni, r.asegurado, 'SIS_SCRAPER', detalle);
    }

    private async guardar(dni: string, asegurado: boolean, fuente: FuenteSeguro, detalle: string): Promise<ResultadoSeguro> {
        const tipo: TipoSeguro = asegurado ? 'SIS' : 'NINGUNO';
        await AppDataSource.query(
            `INSERT INTO seguros_consultas (dni, tipo, asegurado, fuente, verificado, detalle, consultado_en, aviso_vencimiento_enviado)
             VALUES (?, ?, ?, ?, 1, ?, NOW(), 0)
             ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), asegurado = VALUES(asegurado),
                 fuente = VALUES(fuente), verificado = 1, detalle = VALUES(detalle),
                 consultado_en = NOW(), aviso_vencimiento_enviado = 0`,
            [dni, tipo, asegurado ? 1 : 0, fuente, detalle],
        );
        return this.consultar(dni);
    }

    // ------------------------------------------------------------
    // Cron diario: aviso por correo 7 días antes de que venza un SIS activo.
    // El aviso NO renueva la vigencia; solo una nueva verificación exitosa lo hace.
    // ------------------------------------------------------------
    async avisarVencimientos(): Promise<number> {
        const dias = this.vigenciaDias;
        const rows = await AppDataSource.query(
            `SELECT s.dni, s.consultado_en,
                    u.nombres, u.apellidos, u.rol,
                    CASE WHEN u.rol = 'FAMILIAR' THEN u.id_tutor ELSE u.id_usuario END AS destinatario
             FROM seguros_consultas s
             INNER JOIN usuarios u ON u.dni = s.dni
             WHERE s.verificado = 1 AND s.asegurado = 1 AND s.aviso_vencimiento_enviado = 0
               ${this.modoSimulado ? '' : `AND s.fuente <> 'SIMULADO'`}
               AND s.consultado_en <= NOW() - INTERVAL ? DAY
               AND s.consultado_en >  NOW() - INTERVAL ? DAY`,
            [dias - DIAS_AVISO_PREVIO, dias],
        );

        let avisos = 0;
        for (const r of rows) {
            if (!r.destinatario) continue;
            const vence = new Date(new Date(r.consultado_en).getTime() + dias * 86_400_000);
            const quien = r.rol === 'FAMILIAR' ? `de ${r.nombres} ${r.apellidos}` : 'de tu cuenta';
            const mensaje = `La verificación del SIS ${quien} (DNI ${String(r.dni).slice(0, 2)}****${String(r.dni).slice(-2)}) vence el ${fechaLegible(vence)}. `
                + 'Ingresa a Mi Perfil y pulsa «Recalibrar» para mantener tus citas gratuitas; si no lo haces, se te pedirá verificar en tu próxima reserva.';
            await AppDataSource.query(
                `INSERT INTO notificaciones (id_usuario, tipo, mensaje, enviado, leida, fecha_programada)
                 VALUES (?, 'SEGURO', ?, 1, 0, NOW())`,
                [Number(r.destinatario), mensaje],
            );
            await AppDataSource.query(`UPDATE seguros_consultas SET aviso_vencimiento_enviado = 1 WHERE dni = ?`, [r.dni]);
            avisos++;
        }
        return avisos;
    }
}
