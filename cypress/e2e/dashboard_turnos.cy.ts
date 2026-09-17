describe('Módulo del Vacunatorio - Asignación de Turnos por Admin', () => {
  
  beforeEach(() => {
    // Simular estado autenticado o loguearse previamente
    cy.visit('/dashboard/turnos'); // O la ruta interna de gestión de turnos
  });

  it('Debe permitir registrar un turno para una vacuna específica', () => {
    // Interceptar la API que crea el turno en el backend
    cy.intercept('POST', '/api/turnos', {
      statusCode: 201,
      body: { id: 501, estado: 'Confirmado' }
    }).as('crearTurno');

    // Hacer clic en botón para abrir modal o formulario de nuevo turno
    cy.get('[data-cy=btn-nuevo-turno]').click();

    // Rellenar datos del paciente y dosis
    cy.get('#dniPaciente').type('38456789');
    cy.get('#selectVacuna').click();
    cy.get('div[role="option"]').contains('Antigripal').click();
    
    cy.get('#fechaTurno').type('2026-06-10T10:00');
    cy.get('button[type="submit"]').click();

    // Comprobar integración Frontend-API y mensaje visual
    cy.wait('@crearTurno');
    cy.contains('Turno registrado correctamente').should('be.visible');
  });

});