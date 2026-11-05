import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslation debe ser usado dentro de un LanguageProvider');
    }
    return context;
};

