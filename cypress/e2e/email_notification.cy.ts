describe('Módulo de Notificaciones - Envío por Email (Salita Feliz)', () => {

  beforeEach(() => {
    // 1. Interceptar autenticación de Supabase
    cy.intercept('GET', '**/auth/v1/user**', {
      statusCode: 200,
      body: { id: 'admin-mock-id', email: 'admin@salitafeliz.com', role: 'authenticated' }
    });

    cy.intercept('POST', '**/auth/v1/token*', {
      statusCode: 200,
      body: {
        access_token: 'token-falso-de-prueba',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh-falso',
        user: { id: 'admin-mock-id', email: 'admin@salitafeliz.com', role: 'authenticated' }
      }
    });

    // 2. Interceptar el perfil de administrador para evitar errores de carga
    cy.intercept('GET', '**/admin_profiles**', {
      statusCode: 200,
      body: [{ id: 'admin-mock-id', full_name: 'Administrador General', email: 'admin@salitafeliz.com' }]
    });

    // 3. Interceptar la lista de pacientes con sus correos
    cy.intercept('GET', '**/patients**', {
      statusCode: 200,
      body: [
        {
          id: 'c8e19e47-4846-4112-bd08-997026142df5',
          full_name: 'Alexandra Molina',
          email: 'alexandratejeda78@gmail.com',
          phone: '+543573694930'
        }
      ]
    }).as('getPatients');

    // 4. Interceptar la API de envío de correo electrónico
    cy.intercept('POST', '/api/send-email', {
      statusCode: 200,
      body: { success: true, message: 'Notificación enviada con éxito.' }
    }).as('sendEmailApi');

    // 5. Iniciar sesión y navegar a notificaciones
    cy.visit('/login');
    cy.get('input[type="email"]').type('admin@salitafeliz.com');
    cy.get('input[type="password"]').type('AdminSeguro123');
    cy.get('button[type="submit"]').click();

    cy.visit('/dashboard/notificaciones');
  });

  it('Debe permitir configurar y enviar una notificación exitosa mediante Email', () => {
    // 1. Como el canal por defecto ya es Email, seleccionamos directamente el destinatario
    cy.get('button').contains('Seleccione destinatarios').click({ force: true });
    cy.get('div[role="option"]').contains('Alexandra Molina').click({ force: true });

    // 2. Rellenar fecha y hora del turno
    cy.get('input').eq(0).type('10-06-2026'); // Fecha del Turno
    cy.get('input').eq(1).type('10:30');      // Hora del Turno

    // 3. Rellenar asunto y mensaje adicional
    cy.get('input').eq(2).type('Recordatorio de Vacunación'); // Asunto
    cy.get('textarea').type('Por favor asistir con DNI y libreta sanitaria.'); // Mensaje

    // 4. Hacer clic en el botón de envío exclusivo por Email
    cy.get('button').contains('Enviar por Email').click();

    // 5. Validar que la interfaz muestre el mensaje de éxito verde
    cy.contains('Notificación de Email enviada con éxito', { timeout: 10000 }).should('be.visible');
  });

});