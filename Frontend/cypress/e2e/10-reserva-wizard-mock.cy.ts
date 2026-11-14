describe('Reserva de cita: wizard Especialidad → Médico → Calendario (API simulada)', () => {
    const especialidad = { id_especialidad: 901, nombre: 'Especialidad QA', descripcion: 'Especialidad de prueba automatizada' };
    const medico = { id_medico: 777, nombres: 'Ana', apellidos: 'QA Pérez' };

    beforeEach(() => {
        cy.loginApi('paciente');

        // Datos controlados: la prueba no depende del contenido de la base de datos
        cy.intercept('GET', '**/citas/especialidades', { statusCode: 200, body: { ok: true, especialidades: [especialidad] } }).as('especialidades');
        cy.intercept('GET', '**/citas/medicos*', { statusCode: 200, body: { ok: true, medicos: [medico] } }).as('medicos');
        cy.intercept('GET', '**/citas/calendario*', { statusCode: 200, body: { ok: true, dias: [] } }).as('calendario');

        cy.visit('/paciente/reservar');
    });

    it('1. Debe listar la especialidad, pedir los médicos de esa especialidad y mostrar al médico', () => {
        cy.wait('@especialidades');
        cy.contains('button', 'Especialidad QA', { timeout: 8000 }).should('be.visible').click();

        // El frontend debe consultar los médicos filtrando por la especialidad elegida
        cy.wait('@medicos').its('request.url').should('include', 'especialidad=901');
        cy.contains('Dr. Ana QA Pérez', { timeout: 8000 }).should('be.visible');
    });

    it('2. Debe avanzar al calendario del médico elegido', () => {
        cy.contains('button', 'Especialidad QA', { timeout: 8000 }).click();
        cy.contains('button', 'Dr. Ana QA Pérez', { timeout: 8000 }).click();

        // Al elegir médico se consulta el calendario de ese médico
        cy.wait('@calendario').its('request.url').should('include', 'medico=777');
        cy.get('body').should('contain.text', 'Dr.');
    });
});

