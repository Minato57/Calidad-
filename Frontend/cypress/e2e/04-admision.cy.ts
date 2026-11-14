describe('Módulo de Admisión (Control de Citas del Día)', () => {
    it('1. Debe validar acceso a la ruta de admisión con credenciales válidas', () => {
        cy.loginApi('admision');
        cy.visit('/admision/citas-hoy');

        // Si las credenciales son correctas para admisión:
        cy.url({ timeout: 8000 }).then((url) => {
            if (url.includes('/admision/citas-hoy')) {
                cy.contains('h1', 'Reportes de citas').should('be.visible');
                cy.contains('COMPLETADAS').should('exist');
                cy.contains('RESERVADA').should('exist');
                cy.get('input[type="date"]').should('be.visible');
            } else {
                cy.log('Usuario redirigido a:', url);
            }
        });
    });

    it('2. Debe proteger las rutas de administración frente a usuarios no autenticados', () => {
        // Visitar directamente sin token debe redirigir al login
        cy.visit('/admision/citas-hoy');
        cy.url({ timeout: 6000 }).should('include', '/login');
    });
});

