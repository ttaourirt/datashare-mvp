/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /** Crée un compte via l'API puis se connecte via l'UI. */
      registerAndLogin(email: string, password: string): Chainable<void>;
      /** Sélectionne le fichier de fixture dans la modale « Ajouter un fichier » et l'envoie. */
      uploadSample(password?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('registerAndLogin', (email: string, password: string) => {
  cy.request('POST', `${Cypress.expose('apiUrl')}/auth/register`, { email, password });
  cy.visit('/login');
  cy.get('#login-email').type(email);
  cy.get('#login-password').type(password, { log: false });
  cy.contains('button', 'Connexion').click();
  cy.location('pathname').should('eq', '/files');
});

Cypress.Commands.add('uploadSample', (password?: string) => {
  // L'input fichier est visuellement masqué (sr-only) derrière « Choisir un fichier » / « Changer »
  cy.get('.modal input[type="file"]').selectFile('cypress/fixtures/sample.txt', { force: true });
  if (password) {
    cy.get('#upload-password').type(password, { log: false });
  }
  cy.get('.modal').contains('button', 'Téléverser').click();
  cy.get('.modal').contains('Félicitations');
});

export {};
