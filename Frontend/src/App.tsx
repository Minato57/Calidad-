// =================================================================
// Componente raíz de la app.
// Envuelve toda la app con el AuthProvider para que cualquier
// componente pueda acceder al estado de autenticación.
// =================================================================
import { AuthProvider } from './auth/AuthContext';
import { AppRouter } from './routes/AppRouter';
import { AccesibilidadMenu } from './components/common/AccesibilidadMenu';

function App() {
    return (
        <AuthProvider>
            <AccesibilidadMenu />
            <AppRouter />
        </AuthProvider>
    );
}

export default App;