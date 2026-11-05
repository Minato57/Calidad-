// =================================================================
// Sidebar de navegación del panel ADMIN.
// =================================================================
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../i18n';

export const Sidebar = () => {
    const { t } = useTranslation();

    const opciones = [
        { to: '/admin/especialidades',   icono: '📋', label: t.especialidades },
        { to: '/admin/sanciones',        icono: '⚖️', label: t.sanciones },
        { to: '/admin/cancelaciones',    icono: '🚫', label: t.cancelaciones },
        { to: '/admin/cancelacion',      icono: '✕',  label: t.cancelacionMasiva },
        { to: '/admin/cuentas-admision', icono: '👥', label: t.cuentasAdmision },
        { to: '/admin/correos',          icono: '📧', label: t.correos },
        { to: '/admin/reportes',         icono: '📊', label: t.reportes },
    ];

    return (
        <aside className="w-60 bg-white border-r border-gray-100 min-h-[calc(100vh-60px)] p-4">
            <p className="text-[10px] font-bold text-mute-soft tracking-widest mb-3 px-2">
                {t.gestionSistema}
            </p>
            <nav className="space-y-1">
                {opciones.map(op => (
                    <NavLink
                        key={op.to}
                        to={op.to}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors
                            ${isActive
                                ? 'bg-sky-soft text-sky-deep border-l-[3px] border-sky-main'
                                : 'text-mute hover:bg-smoke hover:text-ink-soft'}
                        `}
                    >
                        <span>{op.icono}</span>
                        <span>{op.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};
