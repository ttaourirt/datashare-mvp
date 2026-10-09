describe('Upload anonyme + téléchargement protégé par mot de passe', () => {
  it('refuse un mauvais mot de passe puis accepte le bon', () => {
    const filePassword = 'secret123';

    // Visiteur anonyme (US07) : le bouton rond ouvre le sélecteur de fichier
    cy.visit('/');
    cy.get('input[type="file"]').selectFile('cypress/fixtures/sample.txt', { force: true });
    cy.contains('h2', 'Ajouter un fichier');
    cy.get('#upload-tags').should('not.exist');
    cy.get('#upload-password').type(filePassword, { log: false });
    cy.get('.modal').contains('button', 'Téléverser').click();
    cy.contains('Félicitations');

    cy.get('.share-link')
      .invoke('attr', 'href')
      .then(url => {
        // Destinataire (US02 + US09)
        cy.intercept('POST', '**/public/files/*/download').as('download');
        cy.visit(url as string);
        cy.contains('sample.txt');
        cy.get('#dl-password').should('exist');
        cy.contains('button', 'Télécharger').should('be.disabled');

        cy.get('#dl-password').type('mauvais-mdp');
        cy.contains('button', 'Télécharger').click();
        cy.wait('@download').its('response.statusCode').should('eq', 403);
        cy.contains('Mot de passe invalide.');

        cy.get('#dl-password').clear().type(filePassword, { log: false });
        cy.contains('button', 'Télécharger').click();
        cy.wait('@download').its('response.statusCode').should('eq', 200);
      });
  });
});
