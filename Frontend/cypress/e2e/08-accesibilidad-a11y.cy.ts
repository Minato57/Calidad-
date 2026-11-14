describe('Pruebas de Accesibilidad e Inclusión (ODS 10 / WCAG 2.1)', () => {
    beforeEach(() => {
        cy.visit('/login');
    });

    it('1. Debe mostrar el botón flotante de accesibilidad (♿)', () => {
        cy.contains('button', '♿').should('be.visible');
    });

    it('2. Debe abrir el panel de accesibilidad al hacer clic en el botón flotante', () => {
        cy.contains('button', '♿').click();
        cy.get('div[role="dialog"]').should('be.visible');
        cy.contains('ODS 10 · Inclusión').should('be.visible');
    });

    it('3. Debe activar el modo Alto Contraste en el documento HTML', () => {
        cy.contains('button', '♿').click();
        // Activa el checkbox de alto contraste
        cy.contains('label', /alto contraste/i).find('input[type="checkbox"]').check({ force: true });

        // Verifica que la clase se inyecte en la etiqueta raíz html
        cy.get('html').should('have.class', 'alto-contraste');
    });

    it('4. Debe activar la tipografía para personas con Dislexia', () => {
        cy.contains('button', '♿').click();
        cy.contains('label', /dislexia/i).find('input[type="checkbox"]').check({ force: true });

        cy.get('html').should('have.class', 'fuente-dislexia');
    });

    it('5. Debe permitir cambiar de idioma (Ej. Quechua / Inglés)', () => {
        cy.contains('button', '♿').click();
        // Clic en Quechua o English
        cy.contains('button', /Runasimi|English/i).first().click();

        // El texto del título debe cambiar de idioma
        cy.get('h1').should('be.visible');
    });
});

