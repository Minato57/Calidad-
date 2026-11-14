describe('Pruebas de Casos Negativos y Validaciones (Edge Cases)', () => {
    beforeEach(() => {
        cy.visit('/registro');
    });

    const llenarDatosBase = () => {
        cy.get('input[placeholder="Juan Carlos"]').type('Prueba');
        cy.get('input[placeholder="Pérez García"]').type('QA');
        cy.get('input[placeholder="76543210"]').type('78965412');
        cy.get('input[placeholder="999888777"]').type('987654321');
        cy.get('input[placeholder="juan@correo.com"]').type('test_qa@sangenaro.com');
    };

    it('1. Debe rechazar registro cuando las contraseñas no coinciden', () => {
        llenarDatosBase();
        cy.get('input[placeholder="Mínimo 6 caracteres"]').type('ClaveSegura123!');
        cy.get('input[placeholder="Repite tu contraseña"]').type('OtraClaveDiferente!');

        cy.get('button[type="submit"]').click();
        cy.contains('Las contraseñas no coinciden', { timeout: 5000 }).should('be.visible');
    });

    it('2. Debe rechazar registro cuando el DNI no tiene 8 dígitos', () => {
        cy.get('input[placeholder="Juan Carlos"]').type('Prueba');
        cy.get('input[placeholder="Pérez García"]').type('QA');
        cy.get('input[placeholder="76543210"]').type('1234'); // Solo 4 dígitos
        cy.get('input[placeholder="999888777"]').type('987654321');
        cy.get('input[placeholder="juan@correo.com"]').type('test_qa@sangenaro.com');

        cy.get('input[placeholder="Mínimo 6 caracteres"]').type('ClaveSegura123!');
        cy.get('input[placeholder="Repite tu contraseña"]').type('ClaveSegura123!');

        cy.get('button[type="submit"]').click();
        cy.contains('El DNI debe tener 8 dígitos', { timeout: 5000 }).should('be.visible');
    });

    it('3. Debe rechazar contraseñas demasiado cortas (menos de 6 caracteres)', () => {
        llenarDatosBase();
        cy.get('input[placeholder="Mínimo 6 caracteres"]').type('123');
        cy.get('input[placeholder="Repite tu contraseña"]').type('123');

        cy.get('button[type="submit"]').click();
        cy.contains(/al menos 6 caracteres/i, { timeout: 5000 }).should('be.visible');
    });

    it('4. Debe bloquear acceso a rutas de administración a usuarios anónimos', () => {
        cy.visit('/admin/especialidades');
        cy.url().should('include', '/login');

        cy.visit('/admin/reportes');
        cy.url().should('include', '/login');
    });
});
