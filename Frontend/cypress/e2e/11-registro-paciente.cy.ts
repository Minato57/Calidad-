describe('Registro de paciente: envío correcto al backend (API simulada)', () => {
    beforeEach(() => {
        cy.visit('/registro');
    });

    const llenarFormulario = (correo: string) => {
        cy.get('input[placeholder="Juan Carlos"]').type('Prueba');
        cy.get('input[placeholder="Pérez García"]').type('Automatizada');
        cy.get('input[placeholder="76543210"]').type('71234567');
        cy.get('input[placeholder="999888777"]').type('987654321');
        cy.get('input[placeholder="juan@correo.com"]').type(correo);
        cy.get('input[placeholder="Mínimo 6 caracteres"]').type('ClaveSegura123!');
        cy.get('input[placeholder="Repite tu contraseña"]').type('ClaveSegura123!');
    };

    it('1. Debe enviar los datos del formulario a POST /auth/register', () => {
        // No se crea un usuario real en la base de datos
        cy.intercept('POST', '**/auth/register', {
            statusCode: 201,
            body: { ok: true, mensaje: 'Usuario registrado correctamente' },
        }).as('registro');

        llenarFormulario('qa.registro@sangenaro.com');
        cy.get('button[type="submit"]').click();

        cy.wait('@registro').then(({ request, response }) => {
            expect(response?.statusCode).to.eq(201);
            expect(request.body).to.have.property('correo', 'qa.registro@sangenaro.com');
            expect(request.body).to.have.property('dni', '71234567');
        });
        cy.contains('¡Cuenta creada!', { timeout: 5000 }).should('be.visible');
    });

    it('2. Debe mostrar un error visible cuando el correo ya está registrado (409)', () => {
        cy.intercept('POST', '**/auth/register', {
            statusCode: 409,
            body: { ok: false, mensaje: 'El correo ya está registrado' },
        }).as('registroDuplicado');

        llenarFormulario('duplicado@sangenaro.com');
        cy.get('button[type="submit"]').click();

        cy.wait('@registroDuplicado');
        cy.url().should('include', '/registro'); // el usuario permanece en el formulario
        cy.contains(/ya est[aá] registrado/i, { timeout: 5000 }).should('be.visible');
    });
});
