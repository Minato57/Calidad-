describe('Módulo de Paciente (Dashboard, Citas, Reserva y Perfil)', () => {
    beforeEach(() => {
        // Login con cuenta de paciente
        cy.loginApi('paciente');
        cy.visit('/paciente/inicio');
        cy.url({ timeout: 10000 }).should('include', '/paciente/inicio');
    });

    it('1. Debe mostrar el Dashboard del paciente con opciones de navegación', () => {
        cy.get('body').should('be.visible');
        cy.contains(/reservar|citas|perfil/i).should('exist');
    });

    it('2. Debe permitir navegar a la sección de Mis Citas', () => {
        cy.visit('/paciente/mis-citas');
        cy.url().should('include', '/paciente/mis-citas');
        cy.contains(/citas|historial|mis citas/i).should('exist');
    });

    it('3. Debe permitir navegar a la sección de Perfil del paciente', () => {
        cy.visit('/paciente/perfil');
        cy.url().should('include', '/paciente/perfil');
        cy.contains('juan@gmail.com').should('exist');
    });

    it('4. Debe cargar el flujo de Reserva de Citas (Wizard Paso 1: Especialidades)', () => {
        cy.visit('/paciente/reservar');
        cy.url().should('include', '/paciente/reservar');
        // Debe mostrar la selección de especialidad
        cy.contains(/especialidad|selecciona/i, { timeout: 8000 }).should('be.visible');
    });
});

