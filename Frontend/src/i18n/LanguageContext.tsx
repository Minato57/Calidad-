/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useMemo, useCallback, ReactNode } from 'react';
import { Idioma, IdiomaInfo, TraduccionEsquema } from './types';
import { traducciones, IDIOMAS_DISPONIBLES } from './translations';

export interface LanguageContextType {
    idioma: Idioma;
    setIdioma: (nuevo: Idioma) => void;
    t: TraduccionEsquema;
    idiomas: IdiomaInfo[];
}

const KEY_IDIOMA = 'app_idioma_seleccionado';

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [idioma, setIdiomaState] = useState<Idioma>(() => {
        const guardado = localStorage.getItem(KEY_IDIOMA) as Idioma;
        if (guardado && traducciones[guardado]) {
            return guardado;
        }
        return 'es';
    });

    const setIdioma = useCallback((nuevo: Idioma) => {
        setIdiomaState(nuevo);
        localStorage.setItem(KEY_IDIOMA, nuevo);
        document.documentElement.lang = nuevo;
    }, []);

    useEffect(() => {
        document.documentElement.lang = idioma;
    }, [idioma]);

    const value: LanguageContextType = useMemo(() => ({
        idioma,
        setIdioma,
        t: traducciones[idioma],
        idiomas: IDIOMAS_DISPONIBLES,
    }), [idioma, setIdioma]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};
