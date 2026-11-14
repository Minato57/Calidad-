describe('Pruebas Responsivas y Móviles (Multi-Device Testing)', () => {
    it('1. Debe adaptarse correctamente a pantalla de Smartphone (iPhone X - 375x812)', () => {
        cy.viewport('iphone-x');
        cy.visit('/login');

        // El formulario debe ser visible y centrado sin desbordar la pantalla
        cy.get('input[type="email"]').should('be.visible');
        cy.get('input[type="password"]').should('be.visible');
        cy.get('button[type="submit"]').should('be.visible');

        // Sesión por API (evita el rate limit de login) y vista móvil del dashboard
        cy.loginApi('paciente');
        cy.visit('/paciente/inicio');

        cy.url({ timeout: 10000 }).should('include', '/paciente/inicio');
        cy.get('body').should('be.visible');
    });

    it('2. Debe adaptarse correctamente a pantalla de Tablet (iPad 2 - 768x1024)', () => {
        cy.viewport('ipad-2');
        cy.visit('/login');

        cy.get('h1').should('be.visible');
        cy.get('button[type="submit"]').should('be.visible');
    });

    it('3. Debe renderizar correctamente en monitor de escritorio estándar (1280x720)', () => {
        cy.viewport(1280, 720);
        cy.visit('/login');
        cy.get('h1').should('be.visible');
        cy.get('form').should('be.visible');
    });
});

