// =================================================================
// CAPA: Shared / Middlewares
// Manejador de errores GLOBAL (última red de seguridad).
// Express reconoce este middleware como "de errores" por tener
// CUATRO parámetros (err, req, res, next). Cualquier excepción no
// controlada termina aquí y responde JSON limpio, sin filtrar
// stack traces al cliente.
// =================================================================
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
    err: any,
    _req: Request,
    res: Response,
    next: NextFunction,
) {
    // El detalle completo queda en la consola del servidor (para depurar).
    console.error('[ERROR NO CONTROLADO]', err);

    // Si ya se empezó a enviar la respuesta, delega en Express.
    if (res.headersSent) {
        return next(err);
    }

    const status = typeof err?.status === 'number' ? err.status : 500;

    res.status(status).json({
        ok: false,
        mensaje: 'Ocurrió un error inesperado. Intenta nuevamente.',
    });
}