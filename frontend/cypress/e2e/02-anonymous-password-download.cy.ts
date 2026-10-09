describe('Upload anonyme + téléchargement protégé par mot de passe', () => {
  it('refuse un mauvais mot de passe puis accepte le bon', () => {
    const filePassword = 'secret123';

    // Visiteur anonyme
    cy.visit('/');
    cy.get('button[aria-label="Envoyer un fichier"]').click();
    cy.contains('Envoi anonyme');
    cy.uploadSample(filePassword);
    cy.contains('h2', 'Envoyé !');

    cy.get('.link-box input')
      .invoke('val')
      .then(url => {
        // Destinataire
        cy.intercept('POST', '**/public/files/*/download').as('download');
        cy.visit(url as string);
        cy.contains('sample.txt');
        cy.contains('Mot de passe requis');

        cy.get('input[formcontrolname="password"]').type('mauvais-mdp');
        cy.contains('button', 'Télécharger').click();
        cy.wait('@download').its('response.statusCode').should('eq', 403);
        cy.contains('Mot de passe invalide.');

        cy.get('input[formcontrolname="password"]').clear().type(filePassword, { log: false });
        cy.contains('button', 'Télécharger').click();
        cy.wait('@download').its('response.statusCode').should('eq', 200);
      });
  });
});
