/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /** Crée un compte via l'API puis se connecte via l'UI. */
      registerAndLogin(email: string, password: string): Chainable<void>;
      /** Envoie le fichier de fixture depuis la modale d'upload ouverte. */
      uploadSample(password?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('registerAndLogin', (email: string, password: string) => {
  cy.request('POST', `${Cypress.expose('apiUrl')}/auth/register`, { email, password });
  cy.visit('/login');
  cy.get('input[formcontrolname="email"]').type(email);
  cy.get('input[formcontrolname="password"]').type(password, { log: false });
  cy.contains('button', 'Se connecter').click();
  cy.location('pathname').should('eq', '/files');
});

Cypress.Commands.add('uploadSample', (password?: string) => {
  cy.get('.modal input[type="file"]').selectFile('cypress/fixtures/sample.txt');
  if (password) {
    cy.get('.modal input[formcontrolname="password"]').type(password, { log: false });
  }
  cy.get('.modal').contains('button', 'Envoyer').click();
});

export {};
