// =================================================================
// Componente raíz de la app.
// Envuelve toda la app con el AuthProvider para que cualquier
// componente pueda acceder al estado de autenticación.
// =================================================================
import { AuthProvider } from './auth/AuthContext';
import { AppRouter } from './routes/AppRouter';
import { AccesibilidadMenu } from './components/common/AccesibilidadMenu';
import { LanguageProvider } from './i18n/LanguageContext';

function App() {
    return (
        <LanguageProvider>
            <AuthProvider>
                <AccesibilidadMenu />
                <AppRouter />
            </AuthProvider>
        </LanguageProvider>
    );
}

export default App;