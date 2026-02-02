// Global hooks and custom commands

Cypress.Commands.add("resetAppState", () => {
  cy.window().then((win) => {
    win.localStorage.clear();
  });
});

Cypress.Commands.add("uploadCSV", (filename) => {
  cy.get('[data-testid="csv-upload-input"]').selectFile(
    `cypress/fixtures/${filename}`,
    { force: true },
  );
});

Cypress.Commands.add("sendChatMessage", (message) => {
  cy.get('[data-testid="chat-input"]').type(message);
  cy.get('[data-testid="chat-send-button"]').click();
});

Cypress.Commands.add("waitForChatResponse", () => {
  cy.get('[data-testid="chat-message-assistant"]', { timeout: 30000 }).should(
    "exist",
  );
});
