// =================================================================
// CAPA: Domain
// Protocolo del portal "Consulta en Línea" del SIS (cel.sis.gob.pe).
//
// Funciones PURAS (sin red ni BD) derivadas de los scripts públicos del
// portal (Scripts/General.js y Scripts/Consulta.js):
//   - cifrado/descifrado de tramas (_ZyxCD / _XyzDC)
//   - dígito verificador del DNI (validarDigVer)
//   - armado de la trama de consulta (obtenerDatosGrabar)
//   - interpretación de la respuesta (mostrarRpta / crearTabla)
// =================================================================

const SEP = '¬';

// ---------- Cifrado del portal: desplaza cada carácter en +1 / -1 ----------
export function cifrarSIS(data: string): string {
    let out = '';
    for (let k = 0; k < data.length; k++) {
        const x = data.charCodeAt(k);
        out += String.fromCharCode(x < 255 ? x + 1 : 0);
    }
    return out;
}

export function descifrarSIS(rpta: string): string {
    let out = '';
    for (let k = 0; k < rpta.length; k++) {
        const x = rpta.charCodeAt(k);
        out += String.fromCharCode(x === 0 ? 255 : x - 1);
    }
    return out;
}

// ---------- Dígito verificador del DNI (mismo algoritmo que usa el portal) ----------
export function calcularDigitoVerificador(dni: string): string {
    if (!/^\d{8}$/.test(dni)) return '';
    const hash = [3, 2, 7, 6, 5, 4, 3, 2];
    const hashnum = ['6', '7', '8', '9', '0', '1', '1', '2', '3', '4', '5'];
    let suma = 0;
    for (let i = 0; i < 8; i++) suma += Number(dni[i]) * hash[i];
    let res = 11 - (suma % 11);
    if (res === 11) res = 0;
    return hashnum[res];
}

// ---------- Trama de consulta ----------
// El portal concatena, en el orden del formulario, los 9 controles de clase "g":
//   tipoBusqueda ¬ tipoDocumento ¬ documento ¬ dígito ¬ apPaterno ¬ apMaterno ¬ nombres ¬ fechaNac ¬ captcha
// La fecha viaja tal cual la entrega <input type="date">: YYYY-MM-DD
// (el campo NO tiene la clase "Fecha", por eso el portal no la convierte a DD/MM/YYYY).
export function construirTramaConsulta(datos: { dni: string; fechaNacimiento: string; codigoCaptcha: string }): string {
    return [
        '1',                                    // búsqueda por tipo de documento
        '1',                                    // DNI
        datos.dni,
        calcularDigitoVerificador(datos.dni),
        '', '', '',                             // apellidos y nombres (solo en búsqueda por datos personales)
        datos.fechaNacimiento,
        datos.codigoCaptcha.trim(),
    ].join(SEP);
}

// ---------- Interpretación de la respuesta ----------
export type TipoRespuestaSIS =
    | 'RESULTADO'
    | 'CAPTCHA_INCORRECTO'
    | 'CAPTCHA_EXPIRADO'
    | 'ERROR_PORTAL'
    | 'NO_RECONOCIDO';

export interface RespuestaSIS {
    tipo: TipoRespuestaSIS;
    /** true solo si existe al menos una afiliación vigente. */
    asegurado: boolean;
    /** Estado de la afiliación más relevante (ACTIVO, INACTIVO, ANULADO...) o null si no hay registros. */
    estado: string | null;
    /** Tipo de asegurado (TITULAR, DERECHOHABIENTE...) o régimen, si el portal lo informa. */
    regimen: string | null;
    /** "Apellidos y Nombres" del asegurado según el portal (solo para comparar; no se guarda). */
    nombre: string | null;
    /** Código crudo devuelto por el portal cuando es un error (-1, -2, ...). */
    codigo?: string;
    /** Nombres de las columnas recibidas (para diagnóstico; no contiene datos del asegurado). */
    cabeceras?: string[];
}

const ESTADOS_NO_VIGENTES = ['INACTIVO', 'ANULADO', 'CANCELADO', 'SUSPENDIDO', 'FALLECIDO', 'BAJA'];

function normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

// Comparación por celda COMPLETA: 'INACTIVO' jamás coincide con 'ACTIVO'.
function esEstadoVigente(celda: string): boolean {
    return celda === 'ACTIVO' || celda.startsWith('ACTIVO ');
}
function esEstadoNoVigente(celda: string): boolean {
    return ESTADOS_NO_VIGENTES.some(e => celda === e || celda.startsWith(e + ' '));
}

function sinResultado(tipo: TipoRespuestaSIS, extra: Partial<RespuestaSIS> = {}): RespuestaSIS {
    return { tipo, asegurado: false, estado: null, regimen: null, nombre: null, ...extra };
}

export function interpretarRespuestaSIS(descifrada: string): RespuestaSIS {
    const data = (descifrada ?? '').trim();

    if (data === '-1') return sinResultado('CAPTCHA_INCORRECTO', { codigo: data });
    if (data === '-2') return sinResultado('CAPTCHA_EXPIRADO', { codigo: data });
    if (/^-\d+$/.test(data)) return sinResultado('ERROR_PORTAL', { codigo: data });

    // Formato del portal: cabeceras $ restricciones $ estructura $ filas
    const partes = data.split('$');
    if (partes.length < 4 || !partes[0].includes(SEP)) return sinResultado('NO_RECONOCIDO');

    const cabeceras = partes[0].split('|').map(c => c.split(SEP)[0].trim());
    const filas = partes[3]
        .split('|')
        .filter(f => f.trim().length > 0)
        .map(f => f.split(SEP).map(normalizar));

    // Consulta válida sin afiliaciones registradas
    if (filas.length === 0) return sinResultado('RESULTADO', { cabeceras });

    const cabNorm = cabeceras.map(normalizar);
    const idxEstado = cabNorm.findIndex(c => c === 'ESTADO' || c.startsWith('ESTADO '));
    const idxRegimen = cabNorm.findIndex(c => /TIPO DE ASEGURADO|TIPO DE SEGURO|REGIMEN|TIPO SEGURO/.test(c));
    const idxNombre = cabNorm.findIndex(c => c.includes('APELLIDOS') || c.includes('NOMBRES'));

    // Estado de cada fila: se toma de la columna "Estado"; si el portal cambia
    // las cabeceras, se busca una celda que sea EXACTAMENTE un estado conocido.
    const evaluadas = filas.map(cols => {
        const candidatas = idxEstado >= 0 && cols[idxEstado] ? [cols[idxEstado]] : cols;
        const estado = candidatas.find(c => esEstadoVigente(c) || esEstadoNoVigente(c)) ?? null;
        return {
            estado,
            regimen: idxRegimen >= 0 ? cols[idxRegimen] || null : null,
            nombre: idxNombre >= 0 ? cols[idxNombre] || null : null,
        };
    });

    const vigente = evaluadas.find(f => f.estado !== null && esEstadoVigente(f.estado));
    if (vigente) {
        return { tipo: 'RESULTADO', asegurado: true, ...vigente, cabeceras };
    }

    const conEstado = evaluadas.find(f => f.estado !== null);
    if (!conEstado) return sinResultado('NO_RECONOCIDO', { cabeceras });

    return { tipo: 'RESULTADO', asegurado: false, ...conEstado, cabeceras };
}

// ---------- ¿El DNI consultado pertenece a la persona registrada? ----------
// El portal devuelve "APELLIDOS NOMBRES". Se exige que TODAS las palabras
// registradas (nombres y apellidos) aparezcan en el nombre del portal, con al
// menos un nombre y un apellido. Así se toleran tildes, mayúsculas y registros
// parciales ("Juan Perez" vs "PEREZ GARCIA JUAN CARLOS"), pero no otra persona.
const PARTICULAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y']);

function palabras(texto: string): string[] {
    return normalizar(texto ?? '')
        .replace(/[^A-Z\s]/g, ' ')
        .split(' ')
        .filter(p => p.length > 0 && !PARTICULAS.has(p));
}

export function nombreCoincide(registrado: { nombres: string; apellidos: string }, nombrePortal: string): boolean {
    const nombres = palabras(registrado.nombres);
    const apellidos = palabras(registrado.apellidos);
    const portal = new Set(palabras(nombrePortal));
    if (nombres.length === 0 || apellidos.length === 0 || portal.size === 0) return false;
    return [...nombres, ...apellidos].every(p => portal.has(p));
}

// ---------- Vigencia de una verificación guardada ----------
//   SIN_VERIFICAR: nunca se verificó (o solo hay datos de demo fuera del modo demo)
//   CON_SIS:       verificado con SIS activo, dentro de los días de vigencia
//   VENCIDO:       tenía SIS pero pasó la vigencia → debe volver a verificar
//   SIN_SIS:       verificado sin SIS activo → permanente hasta que recalibre
export type EstadoSeguro = 'SIN_VERIFICAR' | 'CON_SIS' | 'VENCIDO' | 'SIN_SIS';

export interface FilaSeguro {
    asegurado: number | boolean;
    verificado: number | boolean;
    fuente: string;
    consultado_en: Date | string;
}

export function estadoSeguro(
    fila: FilaSeguro | null | undefined,
    opciones: { ahora: Date; vigenciaDias: number; aceptarSimulado: boolean },
): { estado: EstadoSeguro; venceEn: Date | null } {
    if (!fila || !fila.verificado) return { estado: 'SIN_VERIFICAR', venceEn: null };
    if (fila.fuente === 'SIMULADO' && !opciones.aceptarSimulado) return { estado: 'SIN_VERIFICAR', venceEn: null };
    if (!fila.asegurado) return { estado: 'SIN_SIS', venceEn: null };

    const venceEn = new Date(new Date(fila.consultado_en).getTime() + opciones.vigenciaDias * 86_400_000);
    return { estado: opciones.ahora < venceEn ? 'CON_SIS' : 'VENCIDO', venceEn };
}

// ---------- Regla de negocio: ¿la consulta queda cubierta por el SIS? ----------
// Solo exonera una afiliación ACTIVA que además fue VERIFICADA; un estado
// provisional o desconocido nunca otorga gratuidad.
export function cubiertoPorSIS(seguro: { tiene_seguro: boolean; verificado: boolean }): boolean {
    return seguro.tiene_seguro === true && seguro.verificado === true;
}
