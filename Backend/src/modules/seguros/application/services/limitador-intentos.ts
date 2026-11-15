// =================================================================
// Límite de intentos fallidos de verificación del SIS por usuario
// (Captcha incorrecto, datos de otra persona, error del portal).
// Evita saturar el portal del Estado. Vive en memoria: se reinicia
// al reiniciar el servidor, lo que es aceptable para este caso.
// =================================================================
export class LimitadorIntentos {
    private fallos = new Map<number, number[]>();

    constructor(
        private readonly maximo = 5,
        private readonly ventanaMs = 10 * 60_000,
        private readonly reloj: () => number = Date.now,
    ) {}

    private recientes(idUsuario: number): number[] {
        const desde = this.reloj() - this.ventanaMs;
        const lista = (this.fallos.get(idUsuario) ?? []).filter(t => t > desde);
        if (lista.length > 0) this.fallos.set(idUsuario, lista);
        else this.fallos.delete(idUsuario);
        return lista;
    }

    registrarFallo(idUsuario: number): void {
        const lista = this.recientes(idUsuario);
        lista.push(this.reloj());
        this.fallos.set(idUsuario, lista);
    }

    limpiar(idUsuario: number): void {
        this.fallos.delete(idUsuario);
    }

    /** Minutos que faltan para poder reintentar (0 = puede intentar). */
    minutosBloqueo(idUsuario: number): number {
        const lista = this.recientes(idUsuario);
        if (lista.length < this.maximo) return 0;
        const liberaEn = lista[lista.length - this.maximo] + this.ventanaMs;
        return Math.max(1, Math.ceil((liberaEn - this.reloj()) / 60_000));
    }
}
