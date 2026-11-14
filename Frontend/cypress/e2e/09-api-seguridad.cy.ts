const api = () => 'http://localhost:3000';

describe('API: Seguridad, Seguros y Pagos', () => {
    const get = (path: string, token?: string) =>
        cy.request({
            url: `${api()}${path}`,
            failOnStatusCode: false,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

    it('1. Healthcheck responde OK', () => {
        get('/').its('status').should('eq', 200);
    });

    it('2. Endpoints protegidos rechazan peticiones sin JWT', () => {
        ['/citas/especialidades', '/citas/mis-citas', '/seguros/consulta', '/pagos/requisito'].forEach((p) => {
            get(p).its('status').should('eq', 401);
        });
    });

    it('3. Login con body inválido responde 400', () => {
        cy.request({
            method: 'POST',
            url: `${api()}/auth/login`,
            body: {},
            failOnStatusCode: false,
        }).its('status').should('eq', 400);
    });

    it('4. Paciente autenticado accede a citas, seguros y pagos; no a rutas ADMIN', () => {
        cy.loginApi('paciente');
        cy.visit('/paciente/inicio');
        cy.window().then((win) => {
            const token = win.localStorage.getItem('carenest_token') as string;
            get('/citas/especialidades', token).its('status').should('eq', 200);
            get('/citas/mis-citas', token).its('status').should('eq', 200);
            get('/pagos/requisito', token).its('status').should('be.oneOf', [200, 400]);
            get('/citas/todas', token).its('status').should('be.oneOf', [401, 403]);
        });
    });

    it('5. Un médico no puede reservar citas (solo PACIENTE)', () => {
        cy.loginApi('medico');
        cy.visit('/medico/pacientes');
        cy.window().then((win) => {
            const token = win.localStorage.getItem('carenest_token') as string;
            get('/citas/mis-citas', token).its('status').should('be.oneOf', [401, 403]);
        });
    });
});

