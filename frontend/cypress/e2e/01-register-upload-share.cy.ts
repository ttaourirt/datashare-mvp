describe('Inscription + upload + partage', () => {
  it('un utilisateur crée un compte, envoie un fichier et le lien public fonctionne', () => {
    const email = `e2e-${Date.now()}@datashare.test`;
    const password = 'password1234';

    // Inscription via l'UI
    cy.visit('/register');
    cy.get('input[formcontrolname="email"]').type(email);
    cy.get('input[formcontrolname="password"]').type(password, { log: false });
    cy.contains('button', "S'inscrire").click();
    cy.location('pathname').should('eq', '/login');
    cy.contains('Compte créé avec succès');

    // Connexion
    cy.get('input[formcontrolname="email"]').type(email);
    cy.get('input[formcontrolname="password"]').type(password, { log: false });
    cy.contains('button', 'Se connecter').click();
    cy.location('pathname').should('eq', '/files');

    // Upload
    cy.contains('button', 'Ajouter des fichiers').click();
    cy.uploadSample();
    cy.contains('.file-row', 'sample.txt').should('be.visible');

    // Ouverture du lien public sans session (équivalent navigation privée)
    cy.contains('.file-row', 'sample.txt')
      .contains('a', 'Accéder')
      .invoke('attr', 'href')
      .then(href => {
        cy.clearLocalStorage();
        cy.intercept('POST', '**/public/files/*/download').as('download');
        cy.visit(href as string);
        cy.contains('sample.txt');
        cy.contains('button', 'Télécharger').click();
        cy.wait('@download').its('response.statusCode').should('eq', 200);
      });
  });
});
