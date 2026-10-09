describe('Suppression', () => {
  it("un utilisateur supprime un fichier et l'ancien lien renvoie 404", () => {
    cy.registerAndLogin(`e2e-del-${Date.now()}@datashare.test`, 'password1234');

    cy.contains('button', 'Ajouter des fichiers').click();
    cy.uploadSample();

    cy.contains('.file-row', 'sample.txt')
      .contains('a', 'Accéder')
      .invoke('attr', 'href')
      .then(href => {
        // Cypress accepte automatiquement le confirm() de suppression
        cy.contains('.file-row', 'sample.txt').contains('button', 'Supprimer').click();
        cy.contains('.file-row', 'sample.txt').should('not.exist');

        cy.visit(href as string);
        cy.contains('Lien invalide ou introuvable.');
      });
  });
});
