import { ReporteRepository, FiltrosReporte } from '../../infrastructure/repositories/reporte.repository';

export class ReporteService {
    private repo = new ReporteRepository();

    async reporteCitas(filtros: FiltrosReporte) {
        const citas = await this.repo.reporteCitas(filtros);

        const totales = {
            total:       citas.length,
            completadas: citas.filter(c => c.estado === 'COMPLETADA').length,
            canceladas:  citas.filter(c => c.estado === 'CANCELADA').length,
            faltas:      citas.filter(c => c.estado === 'FALTA').length,
            reservadas:  citas.filter(c => ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO'].includes(c.estado)).length,
        };

        return { citas, totales };
    }

    /**
     * ODS 10 (Reducción de las desigualdades) – Reporte de equidad.
     * Mide si todos los grupos poblacionales acceden y cumplen sus citas
     * en proporciones comparables.
     */
    async reporteEquidad(filtros: Pick<FiltrosReporte, 'desde' | 'hasta' | 'id_especialidad'>) {
        const rows = await this.repo.datosEquidad(filtros);

        const hoy = new Date();
        const edadDe = (fn: any): number | null => {
            if (!fn) return null;
            const d = new Date(fn);
            if (Number.isNaN(d.getTime())) return null;
            let e = hoy.getFullYear() - d.getFullYear();
            const m = hoy.getMonth() - d.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < d.getDate())) e--;
            return e;
        };
        const grupoEtario = (e: number | null) =>
            e === null ? 'Sin dato' : e < 18 ? 'Menores (0-17)' : e < 60 ? 'Adultos (18-59)' : 'Adultos mayores (60+)';

        type Acum = { grupo: string; total: number; completadas: number; canceladas: number; faltas: number };
        const nuevo = (grupo: string): Acum => ({ grupo, total: 0, completadas: 0, canceladas: 0, faltas: 0 });
        const acumular = (mapa: Map<string, Acum>, clave: string, estado: string) => {
            const a = mapa.get(clave) ?? nuevo(clave);
            a.total++;
            if (estado === 'COMPLETADA') a.completadas++;
            if (estado === 'CANCELADA')  a.canceladas++;
            if (estado === 'FALTA')      a.faltas++;
            mapa.set(clave, a);
        };

        const porEdad = new Map<string, Acum>();
        const porGenero = new Map<string, Acum>();
        const porReserva = new Map<string, Acum>();
        const porEspecialidad = new Map<string, Acum>();

        for (const r of rows) {
            acumular(porEdad,        grupoEtario(edadDe(r.fecha_nacimiento)), r.estado);
            acumular(porGenero,      r.genero ?? 'Sin dato', r.estado);
            acumular(porReserva,     r.id_dependiente ? 'Reservada para un familiar/dependiente' : 'Reservada para sí mismo', r.estado);
            acumular(porEspecialidad, r.especialidad, r.estado);
        }

        const total = rows.length;
        const formatear = (mapa: Map<string, Acum>) =>
            [...mapa.values()]
                .sort((a, b) => b.total - a.total)
                .map(a => ({
                    ...a,
                    participacion_pct: total ? +((a.total / total) * 100).toFixed(1) : 0,
                    tasa_inasistencia_pct: a.total ? +((a.faltas / a.total) * 100).toFixed(1) : 0,
                    tasa_cancelacion_pct: a.total ? +((a.canceladas / a.total) * 100).toFixed(1) : 0,
                }));

        const grupos = formatear(porEdad);
        // Brecha: diferencia entre la mayor y menor tasa de inasistencia entre grupos con datos.
        const tasas = grupos.filter(g => g.grupo !== 'Sin dato' && g.total > 0).map(g => g.tasa_inasistencia_pct);
        const brecha_inasistencia_pp = tasas.length > 1 ? +(Math.max(...tasas) - Math.min(...tasas)).toFixed(1) : 0;

        return {
            total,
            brecha_inasistencia_pp,
            por_grupo_etario: grupos,
            por_genero:       formatear(porGenero),
            por_tipo_reserva: formatear(porReserva),
            por_especialidad: formatear(porEspecialidad),
        };
    }
}