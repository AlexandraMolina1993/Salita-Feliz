describe('Módulo de Registro de Administrador (Principio 6 - Contexto de Roles y Permisos)', () => {

  beforeEach(() => {
    // 1. Visitar la ruta real del formulario de registro de admin
    cy.visit('/register/admin');
  });

  it('Debe completar el formulario completo de administrador y registrarse exitosamente', () => {
    // 2. Interceptar la función de la API / servicio de registro
    cy.intercept('POST', '/api/...', { // O la ruta que use tu backend/lib/auth
      statusCode: 200,
      body: { success: true }
    }).as('registroAdmin');

    // 3. Rellenar los campos usando los 'id' exactos de tu código
    cy.get('#email').type('molinaalexandra927@gmail.com');
    cy.get('#password').type('Al15402108*');
    cy.get('#name').type('Alexandra Molina');
    cy.get('#idNumber').type('36886619');
    cy.get('#phone').type('+543573694930');
    cy.get('#birthDate').type('1993-02-03');

    // Manejar el componente Select de shadcn para el género
    cy.get('#gender').click();
    cy.get('div[role="option"]').contains('Femenino').click();

    cy.get('#address').type('San Jose 996');
    cy.get('#hireDate').type('2026-01-10');
    cy.get('#emergencyContactName').type('Adriana Molina');
    cy.get('#emergencyContactPhone').type('+543516136304');

    // 4. Enviar el formulario haciendo clic en el botón de submit
    cy.get('button[type="submit"]').click();

    // 5. Validar que la interfaz muestre el mensaje de éxito del componente
    cy.contains('Registro Exitoso').should('be.visible');
    cy.contains('Tu cuenta de administrador ha sido creada').should('be.visible');
  });

});