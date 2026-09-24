describe('Módulo de Pacientes - Validación de DNI Único (Principio 6)', () => {

  const dniRepetido = '40555666';

  beforeEach(() => {
    // 1. Interceptar la llamada de autenticación de Supabase (signInWithPassword)
    cy.intercept('POST', '**/auth/v1/token*', {
      statusCode: 200,
      body: {
        access_token: 'token-falso-de-prueba',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh-falso',
        user: { id: 'admin-mock-id', email: 'admin@salitafeliz.com', role: 'authenticated' }
      }
    }).as('loginSupabase');

    // 2. Realizar el flujo de login en la interfaz
    cy.visit('/login');
    cy.get('input[type="email"]').type('admin@salitafeliz.com');
    cy.get('input[type="password"]').type('AdminSeguro123');
    cy.get('button[type="submit"]').click();
  });

  it('Debe permitir registrar un paciente nuevo exitosamente', () => {
    // Interceptar la creación del paciente en la base de datos
    cy.intercept('POST', '**/patients**', {
      statusCode: 200,
      body: { success: true }
    }).as('crearPaciente');

    cy.visit('/dashboard/pacientes/nuevo');

    // Rellenar campos del primer paciente
    cy.get('input[name="name"]', { timeout: 10000 }).type('Juan Pérez Original');
    cy.get('input[name="dni"]').type(dniRepetido);
    cy.get('input[name="birth-date"]').type('1995-08-20');
    
    cy.get('#gender').click();
    cy.get('div[role="option"]').contains('Masculino').click();

    cy.get('input[name="phone"]').type('+543573112233');

    cy.get('button[type="submit"]').contains('Guardar Paciente').click();
  });

  it('Debe rechazar y mostrar un error al intentar registrar otro paciente con el mismo DNI', () => {
    // Interceptar simulando que el backend rechaza por duplicidad de DNI
    cy.intercept('POST', '**/patients**', {
      statusCode: 400,
      body: { success: false, error: 'El DNI ya se encuentra registrado en el sistema' }
    }).as('crearPacienteDuplicado');

    cy.visit('/dashboard/pacientes/nuevo');

    // Rellenar con el mismo DNI
    cy.get('input[name="name"]', { timeout: 10000 }).type('María Duplicada');
    cy.get('input[name="dni"]').type(dniRepetido); // <--- DNI repetido
    cy.get('input[name="birth-date"]').type('1998-12-10');
    
    cy.get('#gender').click();
    cy.get('div[role="option"]').contains('Femenino').click();

    cy.get('input[name="phone"]').type('+543573445566');

    cy.get('button[type="submit"]').contains('Guardar Paciente').click();

    // Validar que aparezca la alerta de error de Sonner en la interfaz
    cy.get('li[data-sonner-toast]', { timeout: 8000 }).should('be.visible');
  });

});