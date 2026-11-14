import { RequestHandler } from 'express';

const WINDOW_MS = 15 * 60 * 1000;
// Configurable por entorno (LOGIN_RATE_LIMIT_MAX) para pruebas E2E / de carga.
// En produccion se mantiene el valor por defecto de 5 intentos.
const getMaxAttempts = (): number => {
    const configured = Number(process.env.LOGIN_RATE_LIMIT_MAX);
    return configured > 0 ? configured : 5;
};
const MAX_TRACKED_CLIENTS = 10_000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

interface AttemptWindow {
    attempts: number;
    resetAt: number;
}

// Limite por IP en memoria. No se confia en X-Forwarded-For; si la API se
// despliega detras de un proxy, Express debe configurarse con proxies confiables.
const attemptsByIp = new Map<string, AttemptWindow>();
let lastCleanupAt = 0;

function removeExpiredWindows(now: number): void {
    for (const [ip, window] of attemptsByIp) {
        if (window.resetAt <= now) attemptsByIp.delete(ip);
    }
}

export const loginRateLimit: RequestHandler = (req, res, next) => {
    const now = Date.now();

    if (now - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
        removeExpiredWindows(now);
        lastCleanupAt = now;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    let window = attemptsByIp.get(ip);

    if (window && window.resetAt <= now) {
        attemptsByIp.delete(ip);
        window = undefined;
    }

    if (!window) {
        if (attemptsByIp.size >= MAX_TRACKED_CLIENTS) {
            removeExpiredWindows(now);
            if (attemptsByIp.size >= MAX_TRACKED_CLIENTS) {
                res.setHeader('Retry-After', String(Math.ceil(WINDOW_MS / 1000)));
                return res.status(503).json({
                    ok: false,
                    mensaje: 'El servicio de inicio de sesion esta temporalmente ocupado. Intenta mas tarde.',
                });
            }
        }

        window = { attempts: 0, resetAt: now + WINDOW_MS };
        attemptsByIp.set(ip, window);
    }

    if (window.attempts >= getMaxAttempts()) {
        const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
            ok: false,
            mensaje: 'Demasiados intentos de inicio de sesion. Intenta nuevamente cuando termine el tiempo de espera.',
        });
    }

    // Se cuentan todas las solicitudes al endpoint, tambien las invalidas.
    window.attempts += 1;
    return next();
};
