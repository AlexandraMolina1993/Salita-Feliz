describe('Módulo de Registro de Administrador (Principio 6 - Contexto de Roles y Permisos)', () => {
  
  beforeEach(() => {
    cy.visit('/register/admin');
  });

  it('Debe completar el formulario completo de administrador y registrarse exitosamente', () => {
    // 1. Interceptar el servicio de Auth de Supabase para evitar el error de rate limit
    cy.intercept('POST', '**/auth/v1/signup**', {
      statusCode: 200,
      body: {
        user: { id: 'uuid-mock-123', email: 'nuevo.admin@gmail.com' },
        session: { access_token: 'token-falso' }
      }
    }).as('mockSupabaseAuth');

    // 2. Interceptar la creación del perfil de administrador en la base de datos
    cy.intercept('POST', '**/admin_profiles**', {
      statusCode: 200,
      body: { success: true }
    }).as('mockAdminProfile');

    // 3. Rellenar los campos usando los 'id' de tu código
    cy.get('#email').type('nuevo.admin@gmail.com');
    cy.get('#password').type('AdminSeguro123');
    cy.get('#name').type('Alexandra Molina');
    cy.get('#idNumber').type('36886619');
    cy.get('#phone').type('+543573694930');
    cy.get('#birthDate').type('1990-05-15');

    // Manejar el componente Select de shadcn para el género
    cy.get('#gender').click();
    cy.get('div[role="option"]').contains('Femenino').click();

    cy.get('#address').type('San Jose 996');
    cy.get('#hireDate').type('2026-01-10');
    cy.get('#emergencyContactName').type('María Pérez');
    cy.get('#emergencyContactPhone').type('911');

    // 4. Enviar el formulario
    cy.get('button[type="submit"]').click();

    // 5. Validar que la interfaz muestre el mensaje de éxito
    cy.contains('Registro Exitoso', { timeout: 10000 }).should('be.visible');
    cy.contains('Tu cuenta de administrador ha sido creada').should('be.visible');
  });

});