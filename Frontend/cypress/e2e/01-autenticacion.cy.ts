describe('Módulo de Autenticación y Control de Acceso', () => {
    beforeEach(() => {
        cy.visit('/login');
    });

    it('1. Debe cargar la vista de login con todos sus elementos principales', () => {
        cy.get('h1').should('contain.text', 'Centro');
        cy.get('input[type="email"]').should('be.visible');
        cy.get('input[type="password"]').should('be.visible');
        cy.get('button[type="submit"]').should('be.visible').and('contain.text', 'Iniciar sesión');
    });

    it('2. Debe mostrar alerta de error cuando las credenciales son inválidas', () => {
        cy.get('input[type="email"]').type('correo_falso@invalido.com');
        cy.get('input[type="password"]').type('ClaveIncorrecta123');
        cy.get('button[type="submit"]').click();

        // Espera el mensaje de error del backend
        cy.get('.text-danger', { timeout: 8000 }).should('be.visible');
    });

    it('3. Debe permitir iniciar sesión exitosamente como Paciente', () => {
        cy.get('input[type="email"]').type('juan@gmail.com');
        cy.get('input[type="password"]').type('admin123');
        cy.get('button[type="submit"]').click();

        // Debe redirigir al dashboard de paciente
        cy.url({ timeout: 10000 }).should('include', '/paciente/inicio');
    });

    it('4. Debe permitir iniciar sesión exitosamente como Médico', () => {
        cy.get('input[type="email"]').type('medico@carenest.pe');
        cy.get('input[type="password"]').type('admin123');
        cy.get('button[type="submit"]').click();

        // Debe redirigir al panel del médico
        cy.url({ timeout: 10000 }).should('include', '/medico/pacientes');
        cy.contains('Mis pacientes', { timeout: 8000 }).should('be.visible');
    });

    it('5. Debe permitir cerrar sesión correctamente', () => {
        cy.loginApi('paciente');
        cy.visit('/paciente/inicio');

        cy.url({ timeout: 10000 }).should('include', '/paciente/inicio');

        // Abre el menú del avatar del avatar del paciente
        cy.get('header').find('button.group').click();
        // Hace click en Cerrar sesión dentro del dropdown
        cy.contains('button', /Cerrar sesión/i, { timeout: 5000 }).click();
        cy.url({ timeout: 8000 }).should('include', '/login');
    });
});

