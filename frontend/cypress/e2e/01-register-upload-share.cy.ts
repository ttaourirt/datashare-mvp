describe('Inscription + upload + partage', () => {
  it('un utilisateur crée un compte, envoie un fichier et le lien public fonctionne', () => {
    const email = `e2e-${Date.now()}@datashare.test`;
    const password = 'password1234';

    // Inscription via l'UI (US03)
    cy.visit('/register');
    cy.get('#register-email').type(email);
    cy.get('#register-password').type(password, { log: false });
    cy.get('#register-confirm').type(password, { log: false });
    cy.contains('button', 'Créer mon compte').click();
    cy.location('pathname').should('eq', '/login');
    cy.contains('Compte créé');

    // Connexion (US04)
    cy.get('#login-email').type(email);
    cy.get('#login-password').type(password, { log: false });
    cy.contains('button', 'Connexion').click();
    cy.location('pathname').should('eq', '/files');

    // Upload avec un tag (US01 + US08)
    cy.get('.topbar-actions').contains('button', 'Ajouter des fichiers').click();
    cy.get('.modal input[type="file"]').selectFile('cypress/fixtures/sample.txt', { force: true });
    cy.get('#upload-tags').type('projet{enter}');
    cy.get('.modal').contains('button', 'Téléverser').click();
    cy.get('.modal').contains('Félicitations');
    cy.get('.modal-close').click();
    cy.contains('.file-row', 'sample.txt').should('be.visible').find('.tag-chip').should('contain', 'projet');

    // Ouverture du lien public sans session (équivalent navigation privée) — US02
    cy.contains('.file-row', 'sample.txt')
      .contains('a', 'Accéder')
      .invoke('attr', 'href')
      .then(href => {
        cy.clearLocalStorage();
        cy.intercept('POST', '**/public/files/*/download').as('download');
        cy.visit(href as string);
        cy.contains('sample.txt');
        cy.contains('Ce fichier expirera dans 7 jours.');
        cy.contains('button', 'Télécharger').click();
        cy.wait('@download').its('response.statusCode').should('eq', 200);
      });
  });
});
