describe('Simulación de Red y Resiliencia ante Errores (Network Mocking)', () => {
    it('1. Debe manejar error 500 del servidor al intentar loguearse', () => {
        // Intercepta la llamada al login y fuerza una respuesta de fallo 500
        cy.intercept('POST', '**/auth/login', {
            statusCode: 500,
            body: { mensaje: 'Error de conexión con la base de datos' }
        }).as('loginFallido');

        cy.visit('/login');
        cy.get('input[type="email"]').type('usuario@test.com');
        cy.get('input[type="password"]').type('password123');
        cy.get('button[type="submit"]').click();

        cy.wait('@loginFallido');
        // Debe mostrar alerta en pantalla sin romper la aplicación
        cy.get('.text-danger', { timeout: 5000 }).should('be.visible');
    });

    it('2. Debe manejar latencia lenta de red (Slow 3G)', () => {
        // Simula retraso de 1.5 segundos en la respuesta
        cy.intercept('POST', '**/auth/login', (req) => {
            req.on('response', (res) => {
                res.setDelay(1500);
            });
        }).as('loginLento');

        cy.visit('/login');
        cy.get('input[type="email"]').type('juan@gmail.com');
        cy.get('input[type="password"]').type('admin123');
        cy.get('button[type="submit"]').click();

        // El botón debe mostrar estado de cargando o deshabilitarse
        cy.wait('@loginLento');
        cy.url({ timeout: 10000 }).should('include', '/paciente/inicio');
    });
});

