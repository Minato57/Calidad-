describe('Verificación General del Sistema San Genaro', () => {
    it('Debe cargar la página principal o redirigir al login', () => {
        cy.visit('/');
        cy.url().should('include', '/login');
        cy.get('h1').should('exist');
    });
});
