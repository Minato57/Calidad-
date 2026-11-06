// =================================================================
// ODS 10 – Inclusión y Reducción de Desigualdades:
// 5 Opciones para personas con discapacidad + 4 Idiomas
// 1. Tamaño de texto ajustable (Baja visión / Presbicia)
// 2. Alto contraste (Fotofobia / Daltonismo)
// 3. Tipografía para dislexia (Dificultades neurocognitivas / lectura)
// 4. Lector de pantalla / Voz asistida (Discapacidad visual / Ceguera)
// 5. Cursor grande y resaltar enlaces (Discapacidad motriz y visual)
// =================================================================
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n';

const KEY_TAM = 'a11y_tam_texto';
const KEY_CONTRASTE = 'a11y_alto_contraste';
const KEY_DISLEXIA = 'a11y_fuente_dislexia';
const KEY_CURSOR = 'a11y_cursor_grande';
const TAMANOS = [100, 112, 125, 150];

export const AccesibilidadMenu = () => {
    const { idioma, setIdioma, t, idiomas } = useTranslation();
    const [abierto, setAbierto] = useState(false);

    // 5 Opciones de Discapacidad
    const [tam, setTam] = useState<number>(() => Number(localStorage.getItem(KEY_TAM)) || 100);
    const [contraste, setContraste] = useState<boolean>(() => localStorage.getItem(KEY_CONTRASTE) === '1');
    const [dislexia, setDislexia] = useState<boolean>(() => localStorage.getItem(KEY_DISLEXIA) === '1');
    const [cursorGrande, setCursorGrande] = useState<boolean>(() => localStorage.getItem(KEY_CURSOR) === '1');
    const [leyendoVoz, setLeyendoVoz] = useState(false);

    // 1. Tamaño de texto
    useEffect(() => {
        document.documentElement.style.fontSize = `${tam}%`;
        localStorage.setItem(KEY_TAM, String(tam));
    }, [tam]);

    // 2. Alto contraste
    useEffect(() => {
        document.documentElement.classList.toggle('alto-contraste', contraste);
        localStorage.setItem(KEY_CONTRASTE, contraste ? '1' : '0');
    }, [contraste]);

    // 3. Fuente para dislexia
    useEffect(() => {
        document.documentElement.classList.toggle('fuente-dislexia', dislexia);
        localStorage.setItem(KEY_DISLEXIA, dislexia ? '1' : '0');
    }, [dislexia]);

    // 4. Cursor grande y destacar enlaces
    useEffect(() => {
        document.documentElement.classList.toggle('cursor-grande', cursorGrande);
        localStorage.setItem(KEY_CURSOR, cursorGrande ? '1' : '0');
    }, [cursorGrande]);

    // 5. Lector de voz (Text to Speech)
    const toggleLectorVoz = () => {
        if (!('speechSynthesis' in window)) {
            alert('Tu navegador no soporta síntesis de voz.');
            return;
        }

        if (window.speechSynthesis.speaking || leyendoVoz) {
            window.speechSynthesis.cancel();
            setLeyendoVoz(false);
            return;
        }

        // Obtener texto principal de la pantalla
        const el = document.getElementById('contenido-principal') || document.body;
        const texto = el.innerText || '';
        if (!texto.trim()) return;

        // Leer primeros 1200 caracteres de forma fluida
        const fragmento = texto.slice(0, 1200);
        const utterance = new SpeechSynthesisUtterance(fragmento);
        utterance.lang = idioma === 'en' ? 'en-US' : 'es-PE';
        utterance.rate = 0.95;

        utterance.onend = () => setLeyendoVoz(false);
        utterance.onerror = () => setLeyendoVoz(false);

        setLeyendoVoz(true);
        window.speechSynthesis.speak(utterance);
    };

    const cambiarTam = (dir: 1 | -1) => {
        const i = TAMANOS.indexOf(tam);
        const j = Math.min(TAMANOS.length - 1, Math.max(0, (i < 0 ? 0 : i) + dir));
        setTam(TAMANOS[j]);
    };

    const restablecerTodo = () => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setLeyendoVoz(false);
        setTam(100);
        setContraste(false);
        setDislexia(false);
        setCursorGrande(false);
        setIdioma('es');
    };

    return (
        <>
            <a href="#contenido-principal" className="skip-link">{t.saltarContenido}</a>

            <div className="fixed top-1/2 -translate-y-1/2 right-4 z-50 flex items-center gap-3">
                {abierto && (
                    <div
                        role="dialog"
                        aria-label={t.accesibilidad}
                        className="w-84 max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl border border-gray-200"
                    >
                        <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                            <div>
                                <p className="text-base font-extrabold text-ink">{t.accesibilidad}</p>
                                <span className="text-[10px] font-bold text-sky-deep tracking-wider uppercase">ODS 10 · Inclusión</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAbierto(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold text-sm p-1"
                                aria-label="Cerrar"
                            >
                                ✕
                            </button>
                        </div>

                        {/* SELECTOR DE IDIOMAS */}
                        <div className="mb-4 pb-3 border-b border-gray-100">
                            <span className="block text-xs font-bold text-mute uppercase tracking-wider mb-2">
                                🌐 {t.idioma} / Language
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                {idiomas.map((item) => (
                                    <button
                                        key={item.codigo}
                                        type="button"
                                        onClick={() => setIdioma(item.codigo)}
                                        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                            idioma === item.codigo
                                                ? 'bg-sky-soft text-sky-deep border-sky-main shadow-sm'
                                                : 'bg-white text-ink-soft border-gray-200 hover:bg-smoke hover:border-gray-300'
                                        }`}
                                        aria-pressed={idioma === item.codigo}
                                    >
                                        <span className="text-base">{item.icono}</span>
                                        <span className="truncate">{item.nombreNativo}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 5 OPCIONES PARA PERSONAS CON DISCAPACIDAD */}
                        <div className="space-y-3">
                            <span className="block text-[11px] font-bold text-sky-deep tracking-wider uppercase">
                                ♿ {t.opcionesDiscapacidad}
                            </span>

                            {/* 1. Tamaño de texto (Baja visión / Presbicia) */}
                            <div className="flex items-center justify-between p-2 rounded-xl bg-smoke">
                                <div>
                                    <span className="text-xs font-bold text-ink block">1. 🔤 {t.tamanoTexto}</span>
                                    <span className="text-[10px] text-mute">{tam}%</span>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        aria-label="Reducir texto"
                                        onClick={() => cambiarTam(-1)}
                                        disabled={tam === TAMANOS[0]}
                                        className="w-8 h-8 rounded-lg bg-white border border-gray-300 font-bold text-xs hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
                                    >
                                        A-
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Aumentar texto"
                                        onClick={() => cambiarTam(1)}
                                        disabled={tam === TAMANOS[TAMANOS.length - 1]}
                                        className="w-8 h-8 rounded-lg bg-white border border-gray-300 font-bold text-xs hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
                                    >
                                        A+
                                    </button>
                                </div>
                            </div>

                            {/* 2. Alto contraste (Fotofobia / Daltonismo) */}
                            <label className="flex items-center justify-between p-2 rounded-xl bg-smoke text-xs font-bold text-ink cursor-pointer hover:bg-gray-100 transition-colors">
                                <span>2. 🌓 {t.altoContraste}</span>
                                <input
                                    type="checkbox"
                                    checked={contraste}
                                    onChange={(e) => setContraste(e.target.checked)}
                                    className="w-4 h-4 accent-sky-main rounded cursor-pointer"
                                />
                            </label>

                            {/* 3. Tipografía para Dislexia (Dificultades cognitivas) */}
                            <label className="flex items-center justify-between p-2 rounded-xl bg-smoke text-xs font-bold text-ink cursor-pointer hover:bg-gray-100 transition-colors">
                                <span>3. 📖 {t.fuenteDislexia}</span>
                                <input
                                    type="checkbox"
                                    checked={dislexia}
                                    onChange={(e) => setDislexia(e.target.checked)}
                                    className="w-4 h-4 accent-sky-main rounded cursor-pointer"
                                />
                            </label>

                            {/* 4. Lector de pantalla / Voz asistida (Ceguera / Dificultad visual) */}
                            <div className="flex items-center justify-between p-2 rounded-xl bg-smoke">
                                <div>
                                    <span className="text-xs font-bold text-ink block">4. 🔊 {t.lectorVoz}</span>
                                    <span className="text-[10px] text-mute">{leyendoVoz ? t.leyendo : 'Text-to-speech'}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleLectorVoz}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                        leyendoVoz
                                            ? 'bg-danger text-white animate-pulse'
                                            : 'bg-sky-main hover:bg-sky-deep text-white'
                                    }`}
                                >
                                    {leyendoVoz ? '⏹ Detener' : '▶ Escuchar'}
                                </button>
                            </div>

                            {/* 5. Cursor grande y resaltar enlaces (Discapacidad motriz / Visual) */}
                            <label className="flex items-center justify-between p-2 rounded-xl bg-smoke text-xs font-bold text-ink cursor-pointer hover:bg-gray-100 transition-colors">
                                <span>5. 🖱️ {t.cursorGrande}</span>
                                <input
                                    type="checkbox"
                                    checked={cursorGrande}
                                    onChange={(e) => setCursorGrande(e.target.checked)}
                                    className="w-4 h-4 accent-sky-main rounded cursor-pointer"
                                />
                            </label>
                        </div>

                        {/* Restablecer */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={restablecerTodo}
                                className="text-xs font-semibold text-sky-main hover:underline"
                            >
                                {t.restablecer}
                            </button>
                            <span className="text-[10px] text-mute">WCAG 2.1 AA</span>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    aria-label={t.accesibilidad}
                    aria-expanded={abierto}
                    onClick={() => setAbierto(v => !v)}
                    className="w-16 h-16 rounded-full bg-sky-main hover:bg-sky-main/90 text-white text-3xl shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-sky-main/40 cursor-pointer"
                >
                    ♿
                </button>
            </div>
        </>
    );
};
