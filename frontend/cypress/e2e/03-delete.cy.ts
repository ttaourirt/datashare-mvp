describe('Suppression', () => {
  it("un utilisateur supprime un fichier et l'ancien lien n'est plus valide", () => {
    cy.registerAndLogin(`e2e-del-${Date.now()}@datashare.test`, 'password1234');

    cy.get('.topbar-actions').contains('button', 'Ajouter des fichiers').click();
    cy.uploadSample();
    cy.get('.modal-close').click();

    cy.contains('.file-row', 'sample.txt')
      .contains('a', 'Accéder')
      .invoke('attr', 'href')
      .then(href => {
        // Cypress accepte automatiquement le confirm() de suppression (US06)
        cy.contains('.file-row', 'sample.txt').contains('button', 'Supprimer').click();
        cy.contains('.file-row', 'sample.txt').should('not.exist');

        cy.visit(href as string);
        cy.contains('Ce lien est invalide ou le fichier a été supprimé.');
      });
  });
});
