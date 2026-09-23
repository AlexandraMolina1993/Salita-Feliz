describe('Módulo de Vacunatorio - Detalles del Paciente (Principio 6)', () => {

  beforeEach(() => {
    // 1. Primero realizamos el inicio de sesión real en la interfaz para obtener la cookie de sesión válida
    cy.visit('/login');
    cy.get('input[type="email"]').type('molinaalexandra927@gmail.com');
    cy.get('input[type="password"]').type('Al15402108*');
    cy.get('button[type="submit"]').click();

    // 2. Interceptar la llamada de la API del paciente para suministrar datos falsos controlados
    cy.intercept('GET', '**/patients/**', {
      statusCode: 200,
      body: {
        id: 'c8e19e47-4846-4112-bd08-997026142df5',
        full_name: 'Alexandra Molina',
        dni: '36886619',
        birth_date: '1993-02-03',
        gender: 'female',
        is_active: true,
        phone: '+543573694930',
        email: 'alexandratejeda78@mail.com',
        address: 'San Jose 996',
        created_at: '2026-01-01'
      }
    });

    cy.intercept('GET', '**/appointments/**', { statusCode: 200, body: [] });
  });

  it('Debe renderizar la información personal, de contacto y el historial del paciente', () => {
    // 3. Navegar a la ruta protegida una vez que ya estamos autenticados
    cy.visit('/dashboard/pacientes/c8e19e47-4846-4112-bd08-997026142df5');

    // 4. Validar que la interfaz muestre los datos del paciente correctamente en pantalla
    cy.contains('Alexandra Molina', { timeout: 10000 }).should('be.visible');
    cy.contains('Información Personal').should('be.visible');
    cy.contains('Contacto').should('be.visible');
    cy.contains('Información Médica').should('be.visible');
    cy.contains('San Jose 996').should('be.visible');
  });

  it('Debe permitir accionar el cambio de estado del paciente (Activo/Inactivo)', () => {
    cy.visit('/dashboard/pacientes/c8e19e47-4846-4112-bd08-997026142df5');

    cy.get('button', { timeout: 10000 }).should('be.visible');

    cy.get('body').then(($body) => {
      if ($body.text().includes('Desactivar Paciente')) {
        cy.contains('button', 'Desactivar Paciente').click();
        cy.contains('button', 'Activar Paciente', { timeout: 8000 }).should('be.visible');
      } else if ($body.text().includes('Activar Paciente')) {
        cy.contains('button', 'Activar Paciente').click();
        cy.contains('button', 'Desactivar Paciente', { timeout: 8000 }).should('be.visible');
      }
    });
  });

});