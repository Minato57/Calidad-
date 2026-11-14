// Requiere el usuario medico@carenest.pe (Backend/sql/002_usuario_medico.sql).
describe('Módulo de Médico (Panel de Pacientes y Atención)', () => {
    beforeEach(() => {
        // Login con cuenta de médico
        cy.loginApi('medico');
        cy.visit('/medico/pacientes');
        cy.url({ timeout: 10000 }).should('include', '/medico/pacientes');
    });

    it('1. Debe cargar la vista de Mis Pacientes con métricas y fecha de hoy', () => {
        cy.contains('h1', 'Mis pacientes').should('be.visible');
        cy.contains('PENDIENTES').should('exist');
        cy.contains('ATENDIDOS').should('exist');
    });

    it('2. Debe permitir filtrar o cambiar de fecha de atención', () => {
        cy.get('input[type="date"]').should('be.visible');
        cy.contains('button', 'Hoy').should('exist');
    });

    it('3. Debe mostrar la lista de citas programadas y permitir abrir el modal de atención si hay pacientes pendientes', () => {
        cy.get('body').then(($body) => {
            if ($body.find('button:contains("Atender")').length > 0) {
                cy.contains('button', 'Atender').first().click();
                // Verifica que se abra el modal con los campos de receta y diagnóstico
                cy.contains(/diagnóstico|receta/i, { timeout: 5000 }).should('be.visible');
                // Cerrar modal o cancelar
                cy.contains('button', /cancelar|cerrar/i).click();
            } else {
                cy.log('No hay pacientes pendientes para atender hoy');
            }
        });
    });
});

