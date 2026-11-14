/// <reference types="cypress" />

type Rol = 'paciente' | 'medico' | 'admision';

const CREDENCIALES: Record<Rol, { correo: string; contrasena: string }> = {
    paciente: { correo: 'juan@gmail.com', contrasena: 'admin123' },
    medico: { correo: 'medico@carenest.pe', contrasena: 'admin123' },
    admision: { correo: 'admision@carenest.pe', contrasena: 'admin123' },
};

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            /** Login por API con sesion cacheada (evita el rate limit de /auth/login). */
            loginApi(rol: Rol): Chainable<void>;
        }
    }
}

Cypress.Commands.add('loginApi', (rol: Rol) => {
    const { correo, contrasena } = CREDENCIALES[rol];
    const api = 'http://localhost:3000';

    cy.session(
        ['login', rol],
        () => {
            cy.request('POST', `${api}/auth/login`, { correo, contrasena }).then(({ body }) => {
                window.localStorage.setItem('carenest_token', body.token);
                window.localStorage.setItem('carenest_user', JSON.stringify(body));
            });
        },
        {
            validate() {
                expect(window.localStorage.getItem('carenest_token')).to.be.a('string');
            },
        },
    );
});

export {};

