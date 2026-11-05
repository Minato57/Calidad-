// =================================================================
// ODS 10 – Reducción de las desigualdades
// Panel de equidad: compara participación e inasistencia entre
// grupos etarios, género, tipo de reserva y especialidad.
// =================================================================
import { useState } from 'react';

import { Card } from '../common/Card';
import { Boton } from '../common/Boton';
import { adminApi } from '../../api/adminApi';
import { GrupoEquidad, ReporteEquidad } from '../../types';
import { useTranslation } from '../../i18n';

interface Props {
    desde?: string;
    hasta?: string;
    idEspecialidad?: number;
}

const Tabla = ({ titulo, filas }: { titulo: string; filas: GrupoEquidad[] }) => (
    <Card className="p-0 overflow-hidden mb-4">
        <h3 className="px-4 py-3 text-sm font-extrabold text-ink bg-smoke">{titulo}</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <caption className="sr-only">{titulo}</caption>
                <thead>
                    <tr className="text-left text-xs text-mute uppercase tracking-wider">
                        <th scope="col" className="px-4 py-2 font-bold">Grupo</th>
                        <th scope="col" className="px-4 py-2 font-bold">Citas</th>
                        <th scope="col" className="px-4 py-2 font-bold">Participación</th>
                        <th scope="col" className="px-4 py-2 font-bold">Inasistencia</th>
                        <th scope="col" className="px-4 py-2 font-bold">Cancelación</th>
                    </tr>
                </thead>
                <tbody>
                    {filas.map(f => (
                        <tr key={f.grupo} className="border-t border-gray-100">
                            <th scope="row" className="px-4 py-2 text-left font-semibold text-ink-soft">{f.grupo}</th>
                            <td className="px-4 py-2">{f.total}</td>
                            <td className="px-4 py-2">{f.participacion_pct}%</td>
                            <td className="px-4 py-2">{f.tasa_inasistencia_pct}%</td>
                            <td className="px-4 py-2">{f.tasa_cancelacion_pct}%</td>
                        </tr>
                    ))}
                    {filas.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-4 text-center text-mute">Sin datos</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </Card>
);

export const EquidadPanel = ({ desde, hasta, idEspecialidad }: Props) => {
    const { t } = useTranslation();
    const [data, setData] = useState<ReporteEquidad | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');

    const generar = async () => {
        setError('');
        setCargando(true);
        try {
            setData(await adminApi.reporteEquidad({ desde, hasta, id_especialidad: idEspecialidad }));
        } catch {
            setError('No se pudo generar el reporte de equidad.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <section aria-labelledby="titulo-equidad" className="mt-10">
            <h2 id="titulo-equidad" className="text-2xl font-extrabold text-ink mb-1">
                {t.ods10Titulo}
            </h2>
            <p className="text-sm text-mute mb-4">
                {t.ods10Descripcion}
            </p>

            <Boton onClick={generar} disabled={cargando}>
                {cargando ? 'Generando...' : t.generarReporteEquidad}
            </Boton>
            {error && <p role="alert" className="text-xs text-danger font-semibold mt-3">{error}</p>}

            {data && (
                <div className="mt-5" aria-live="polite">
                    <Card className="px-4 py-3 mb-4">
                        <p className="text-sm text-ink-soft">
                            Citas analizadas: <strong>{data.total}</strong>. Brecha de inasistencia entre grupos etarios:{' '}
                            <strong>{data.brecha_inasistencia_pp} pp</strong>
                            {data.brecha_inasistencia_pp >= 10 && ' — brecha alta: conviene reforzar recordatorios o canales asistidos en el grupo más afectado.'}
                        </p>
                    </Card>
                    <Tabla titulo="Por grupo etario" filas={data.por_grupo_etario} />
                    <Tabla titulo="Por género" filas={data.por_genero} />
                    <Tabla titulo="Por tipo de reserva (propia / para familiar)" filas={data.por_tipo_reserva} />
                    <Tabla titulo="Por especialidad" filas={data.por_especialidad} />
                </div>
            )}
        </section>
    );
};
