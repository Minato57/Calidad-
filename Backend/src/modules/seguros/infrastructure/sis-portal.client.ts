// =================================================================
// CAPA: Infrastructure
// Cliente HTTP del portal "Consulta en Línea" del SIS.
//
// El portal no usa cookies: entrega un token por carga de página
// (input #hdfToken) y liga el Captcha a ese token. El flujo es:
//   1. GET  /                       → token
//   2. GET  /Consulta/crearCaptcha  → imagen (cabecera "token")
//   3. POST /Consulta/siguiente     → trama cifrada (cabecera "token")
//
// TLS: cel.sis.gob.pe no envía su certificado intermedio, por eso Node
// lo rechaza con UNABLE_TO_VERIFY_LEAF_SIGNATURE. En vez de desactivar la
// verificación (NODE_TLS_REJECT_UNAUTHORIZED=0 afecta a TODO el proceso:
// Mercado Pago, SMTP...), se agrega el intermedio público de Sectigo a la
// lista de CA SOLO para las conexiones de este cliente.
// =================================================================
import https from 'https';
import tls from 'tls';
import fs from 'fs';
import path from 'path';

import { cifrarSIS, descifrarSIS } from '../domain/sis-protocolo';

const URL_POR_DEFECTO = 'https://cel.sis.gob.pe/SisConsultaEnLinea';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12000;

export class SisPortalError extends Error {
    constructor(mensaje: string, public readonly causa?: string) {
        super(mensaje);
        this.name = 'SisPortalError';
    }
}

interface RespuestaHttp {
    status: number;
    cuerpo: Buffer;
}

export class SisPortalClient {
    private agente: https.Agent | null = null;

    private get base(): string {
        return (process.env.SIS_CONSULTA_URL || URL_POR_DEFECTO).replace(/\/+$/, '');
    }

    // Agente con las CA raíz de Node + el intermedio del portal (validación estricta).
    private obtenerAgente(): https.Agent {
        if (this.agente) return this.agente;
        const ca: string[] = [...tls.rootCertificates];
        const archivo = process.env.SIS_CA_FILE
            || path.resolve(__dirname, '..', '..', '..', '..', 'certs', 'sis-intermedio.pem');
        try {
            ca.push(fs.readFileSync(archivo, 'utf8'));
        } catch {
            console.warn(`[SIS] No se encontró el certificado intermedio (${archivo}); la conexión TLS puede fallar.`);
        }
        this.agente = new https.Agent({ ca, keepAlive: false });
        return this.agente;
    }

    private solicitar(
        metodo: 'GET' | 'POST',
        ruta: string,
        opciones: { token?: string; cuerpo?: Buffer; contentType?: string } = {},
    ): Promise<RespuestaHttp> {
        const url = new URL(this.base + ruta);
        const headers: Record<string, string | number> = { 'User-Agent': USER_AGENT };
        if (opciones.token) {
            headers['token'] = opciones.token;
            headers['usuario'] = 'null'; // el portal envía literalmente "null" (sessionStorage vacío)
        }
        if (opciones.cuerpo) {
            headers['Content-Type'] = opciones.contentType || 'text/plain;charset=UTF-8';
            headers['Content-Length'] = opciones.cuerpo.length;
        }

        return new Promise<RespuestaHttp>((resolve, reject) => {
            const req = https.request(url, { method: metodo, headers, agent: this.obtenerAgente(), timeout: TIMEOUT_MS }, (res) => {
                const trozos: Buffer[] = [];
                res.on('data', (d: Buffer) => trozos.push(d));
                res.on('end', () => resolve({ status: res.statusCode ?? 0, cuerpo: Buffer.concat(trozos) }));
                res.on('error', reject);
            });
            req.on('timeout', () => req.destroy(new Error('Tiempo de espera agotado')));
            req.on('error', reject);
            if (opciones.cuerpo) req.write(opciones.cuerpo);
            req.end();
        }).catch((err: any) => {
            const codigo = err?.code ? `${err.code}: ` : '';
            throw new SisPortalError('No se pudo conectar con el portal del SIS', `${codigo}${err?.message ?? err}`);
        });
    }

    /** Abre una sesión de consulta: token + imagen del Captcha ligada a ese token. */
    async iniciarSesion(): Promise<{ token: string; captchaPng: Buffer }> {
        const pagina = await this.solicitar('GET', '');
        if (pagina.status !== 200) throw new SisPortalError('El portal del SIS no respondió correctamente', `HTTP ${pagina.status}`);

        const html = pagina.cuerpo.toString('utf8');
        const m = html.match(/id=["']hdfToken["'][^>]*value=["']([^"']+)["']/i)
            || html.match(/value=["']([^"']+)["'][^>]*id=["']hdfToken["']/i);
        const token = m?.[1]?.trim();
        if (!token) throw new SisPortalError('El portal del SIS no entregó el token de consulta', 'hdfToken ausente');

        const captcha = await this.solicitar('GET', '/Consulta/crearCaptcha', { token });
        if (captcha.status !== 200 || captcha.cuerpo.length === 0) {
            throw new SisPortalError('El portal del SIS no entregó el Captcha', `HTTP ${captcha.status}`);
        }
        return { token, captchaPng: captcha.cuerpo };
    }

    /** Envía la trama de consulta (en claro) y devuelve la respuesta ya descifrada. */
    async consultar(token: string, trama: string): Promise<string> {
        const resp = await this.solicitar('POST', '/Consulta/siguiente', {
            token,
            cuerpo: Buffer.from(cifrarSIS(trama), 'utf8'),
        });
        if (resp.status !== 200) throw new SisPortalError('El portal del SIS rechazó la consulta', `HTTP ${resp.status}`);
        return descifrarSIS(resp.cuerpo.toString('utf8'));
    }
}
