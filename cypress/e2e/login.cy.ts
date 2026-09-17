describe('Módulo de Autenticación - Login de Administrador', () => {
  
  beforeEach(() => {
    cy.visit('/login');
  });

  it('Debe iniciar sesión exitosamente con credenciales válidas de admin', () => {
    // Interceptar la API de autenticación del backend
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: { token: 'jwt-token-valido', rol: 'ADMIN' }
    }).as('loginApi');

    // Completar el formulario de login usando los id de tus inputs típicos
    cy.get('#email').type('molinaalexandra927@gmail.com');
    cy.get('#password').type('Al15402108*');
    cy.get('button[type="submit"]').click();

    // Validar redirección al panel de gestión
    cy.url().should('include', '/admin');
  });

  it('Debe mostrar un error si la contraseña es incorrecta', () => {
    cy.get('#email').type('admin@salitafeliz.com');
    cy.get('#password').type('clave-incorrecta');
    cy.get('button[type="submit"]').click();

    // Validar que aparezca una alerta de error en la interfaz
    cy.get('[role="alert"]').should('be.visible');
  });

});