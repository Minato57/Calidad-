// =================================================================
// CAPA: Application / Services
// Validación de seguro de salud por DNI (Perú) — foco en el SIS.
//
// Patrón Adapter/Strategy: SeguroService delega en un proveedor
// intercambiable (variable de entorno SEGURO_PROVIDER):
//   - 'simulado' (por defecto): datos de prueba deterministas por DNI.
//   - 'scraper' : consulta HTTP + parseo (best-effort) a una URL
//                 configurable (SIS_CONSULTA_URL).
//
// IMPORTANTE: el portal oficial del SIS usa captcha y ViewState; un
// scraping directo puede fallar o infringir sus términos de uso. Si el
// scraper falla, se usa el modo simulado SOLO si
// SEGURO_FALLBACK_SIMULADO != 'false' (resultado marcado verificado=false).
// =================================================================
import { AppDataSource } from '../../../../config/datasource';

export type TipoSeguro = 'SIS' | 'NINGUNO' | 'DESCONOCIDO';

export interface ResultadoSeguro {
    dni: string;
    tipo: TipoSeguro;
    tiene_seguro: boolean;
    fuente: 'SIS_SCRAPER' | 'SIMULADO';
    verificado: boolean;     // true solo si viene de una consulta real
    detalle?: string;
    consultado_en: string;
    desde_cache: boolean;
}

interface ProveedorSeguro {
    consultar(dni: string): Promise<Pick<ResultadoSeguro, 'tipo' | 'tiene_seguro' | 'fuente' | 'verificado' | 'detalle'>>;
}

// ---------------- Proveedor simulado ----------------
class ProveedorSimulado implements ProveedorSeguro {
    consultar(dni: string) {
        // DNI terminados en 0-5 → SIS activo; 6-9 → sin seguro (solo demostración).
        const ultimo = Number(dni[dni.length - 1]);
        const tiene = ultimo <= 5;
        return Promise.resolve({
            tipo: (tiene ? 'SIS' : 'NINGUNO') as TipoSeguro,
            tiene_seguro: tiene,
            fuente: 'SIMULADO' as const,
            verificado: false,
            detalle: 'Resultado simulado (modo demostración)',
        });
    }
}

// ---------------- Proveedor scraper (best-effort) ----------------
class ProveedorScraper implements ProveedorSeguro {
    async consultar(dni: string) {
        const plantilla = process.env.SIS_CONSULTA_URL;
        if (!plantilla) throw new Error('SIS_CONSULTA_URL no configurada');

        const url = plantilla.replace('{dni}', dni);
        const metodo = (process.env.SIS_METHOD || 'GET').toUpperCase();
        const init: RequestInit = {
            method: metodo,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CareNest/1.0)',
                'Accept': 'text/html,application/json',
                ...(metodo === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
            },
            signal: AbortSignal.timeout(8000),
        };
        if (metodo === 'POST') {
            init.body = (process.env.SIS_POST_BODY || 'dni={dni}').replace('{dni}', dni);
        }

        const resp = await fetch(url, init);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const html = await resp.text();

        // Texto plano (quita etiquetas) para evaluar las expresiones (evita backtracking superlineal S8786).
        const texto = html.replace(/<script\b[^>]*>(?:[^<]|<(?!\/script>))*<\/script>/gi, ' ')
                          .replace(/<style\b[^>]*>(?:[^<]|<(?!\/style>))*<\/style>/gi, ' ')
                          .replace(/<[^>]+>/g, ' ')
                          .replace(/\s+/g, ' ');

        if (/captcha/i.test(texto) && !/ACTIVO/i.test(texto)) {
            throw new Error('El portal solicita captcha');
        }

        const reInactivo = new RegExp(
            process.env.SIS_REGEX_INACTIVO || 'NO\\s+SE\\s+ENCUENTRA|NO\\s+ENCUENTRA|NO\\s+ASEGURADO|INACTIVO|SIN\\s+SEGURO|NO\\s+REGISTRA',
            'i',
        );
        const reActivo = new RegExp(process.env.SIS_REGEX_ACTIVO || 'ACTIVO', 'i');

        if (reInactivo.test(texto)) {
            return { tipo: 'NINGUNO' as TipoSeguro, tiene_seguro: false, fuente: 'SIS_SCRAPER' as const, verificado: true };
        }
        if (reActivo.test(texto)) {
            return { tipo: 'SIS' as TipoSeguro, tiene_seguro: true, fuente: 'SIS_SCRAPER' as const, verificado: true };
        }
        throw new Error('No se pudo interpretar la respuesta del portal');
    }
}

export class SeguroService {
    private horasCache = Number(process.env.SEGURO_CACHE_HORAS) || 24;

    private proveedor(): ProveedorSeguro {
        return (process.env.SEGURO_PROVIDER || 'simulado').toLowerCase() === 'scraper'
            ? new ProveedorScraper()
            : new ProveedorSimulado();
    }

    private fila2Resultado(r: any, desdeCache: boolean): ResultadoSeguro {
        return {
            dni: String(r.dni),
            tipo: r.tipo as TipoSeguro,
            tiene_seguro: !!r.asegurado,
            fuente: r.fuente,
            verificado: !!r.verificado,
            detalle: r.detalle ?? undefined,
            consultado_en: new Date(r.consultado_en).toISOString(),
            desde_cache: desdeCache,
        };
    }

    /** Devuelve el último resultado en caché (sin consultar), si existe. */
    async obtenerCache(dnis: string[]): Promise<Map<string, ResultadoSeguro>> {
        const mapa = new Map<string, ResultadoSeguro>();
        if (dnis.length === 0) return mapa;
        const rows = await AppDataSource.query(
            `SELECT * FROM seguros_consultas WHERE dni IN (${dnis.map(() => '?').join(',')})`,
            dnis,
        );
        rows.forEach((r: any) => mapa.set(String(r.dni).trim(), this.fila2Resultado(r, true)));
        return mapa;
    }

    /** Consulta el seguro de un DNI (usa caché vigente salvo forzar=true). */
    async consultar(dni: string, forzar = false): Promise<ResultadoSeguro> {
        if (!/^\d{8}$/.test(dni)) {
            throw Object.assign(new Error('El DNI debe tener 8 dígitos'), { status: 400 });
        }

        if (!forzar) {
            const rows = await AppDataSource.query(
                `SELECT * FROM seguros_consultas
                 WHERE dni = ? AND consultado_en >= (NOW() - INTERVAL ? HOUR)`,
                [dni, this.horasCache],
            );
            if (rows.length > 0) return this.fila2Resultado(rows[0], true);
        }

        let r: Awaited<ReturnType<ProveedorSeguro['consultar']>>;
        try {
            r = await this.proveedor().consultar(dni);
        } catch (err: any) {
            console.error(`[SEGURO] Falló la consulta real para ${dni}: ${err?.message}`);
            if (process.env.SEGURO_FALLBACK_SIMULADO === 'false') {
                r = {
                    tipo: 'DESCONOCIDO', tiene_seguro: false, fuente: 'SIS_SCRAPER',
                    verificado: false, detalle: `No se pudo verificar: ${err?.message}`,
                };
            } else {
                r = await new ProveedorSimulado().consultar(dni);
                r.detalle = `Consulta real no disponible (${err?.message}); resultado simulado`;
            }
        }

        await AppDataSource.query(
            `INSERT INTO seguros_consultas (dni, tipo, asegurado, fuente, verificado, detalle, consultado_en)
             VALUES (?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), asegurado = VALUES(asegurado),
                 fuente = VALUES(fuente), verificado = VALUES(verificado),
                 detalle = VALUES(detalle), consultado_en = NOW()`,
            [dni, r.tipo, r.tiene_seguro ? 1 : 0, r.fuente, r.verificado ? 1 : 0, r.detalle ?? null],
        );

        return {
            dni, ...r,
            consultado_en: new Date().toISOString(),
            desde_cache: false,
        };
    }
}
