-- Insert sample patients
INSERT INTO patients (full_name, dni, birth_date, gender, address, phone, email, emergency_contact, emergency_phone, blood_type, health_insurance, insurance_number) VALUES
('Juan Carlos Pérez', '12345678', '1990-05-15', 'male', 'Av. Corrientes 1234, CABA', '11-1234-5678', 'juan.perez@email.com', 'María Pérez', '11-8765-4321', 'O+', 'OSDE', '123456789'),
('Ana María García', '87654321', '1985-08-22', 'female', 'Calle Falsa 123, CABA', '11-2345-6789', 'ana.garcia@email.com', 'Carlos García', '11-9876-5432', 'A+', 'Swiss Medical', '987654321'),
('Pedro López Martínez', '11223344', '1975-12-10', 'male', 'San Martín 567, CABA', '11-3456-7890', 'pedro.lopez@email.com', 'Laura López', '11-5432-1098', 'B+', 'Galeno', '456789123'),
('María Elena Rodríguez', '44332211', '1992-03-18', 'female', 'Rivadavia 890, CABA', '11-4567-8901', 'maria.rodriguez@email.com', 'José Rodríguez', '11-2109-8765', 'AB+', 'OSDE', '789123456'),
('Carlos Alberto Fernández', '55667788', '1988-07-25', 'male', 'Belgrano 456, CABA', '11-5678-9012', 'carlos.fernandez@email.com', 'Silvia Fernández', '11-3210-9876', 'O-', 'Medicus', '321654987');

-- Insert sample nurses
INSERT INTO nurses (full_name, license_number, specialty, phone, email, hire_date) VALUES
('Dra. María Rodríguez', 'ENF-001', 'Pediatría', '11-4567-8901', 'maria.rodriguez@salitafeliz.com', '2020-01-15'),
('Enf. Carlos Martínez', 'ENF-002', 'Adultos', '11-5678-9012', 'carlos.martinez@salitafeliz.com', '2019-03-20'),
('Enf. Laura Fernández', 'ENF-003', 'Geriatría', '11-6789-0123', 'laura.fernandez@salitafeliz.com', '2021-06-10'),
('Enf. Ana Gómez', 'ENF-004', 'Vacunación', '11-7890-1234', 'ana.gomez@salitafeliz.com', '2020-09-05'),
('Dr. Roberto Silva', 'ENF-005', 'General', '11-8901-2345', 'roberto.silva@salitafeliz.com', '2018-11-12');

-- Insert sample vaccines
INSERT INTO vaccines (name, type, manufacturer, lot_number, expiration_date, stock_quantity, min_stock_level, storage_temperature, price) VALUES
('COVID-19 Pfizer', 'ARNm', 'Pfizer-BioNTech', 'PF001', '2025-12-31', 50, 20, '2-8c', 25.00),
('Gripe Trivalente', 'Inactivada', 'Sanofi', 'SF002', '2025-06-30', 15, 25, '2-8c', 18.50),
('Hepatitis B', 'Recombinante', 'GSK', 'GSK003', '2026-03-15', 30, 15, '2-8c', 32.00),
('Vacuna Vencida Test', 'Test', 'Test Lab', 'TEST001', '2024-12-01', 10, 5, '2-8c', 15.00),
('Vacuna Por Vencer', 'Test', 'Test Lab', 'TEST002', '2025-02-15', 8, 10, '2-8c', 20.00),
('Neumococo', 'Conjugada', 'Pfizer', 'PF004', '2025-09-20', 25, 15, '2-8c', 45.00),
('Meningococo', 'Conjugada', 'GSK', 'GSK005', '2025-11-10', 20, 10, '2-8c', 55.00);

-- Insert sample appointments
INSERT INTO appointments (patient_id, vaccine_id, nurse_id, appointment_date, appointment_time, status, notes) 
SELECT 
    p.id, 
    v.id, 
    n.id, 
    '2025-01-15', 
    '10:00', 
    'scheduled', 
    'Primera dosis COVID-19'
FROM patients p, vaccines v, nurses n 
WHERE p.dni = '12345678' AND v.name = 'COVID-19 Pfizer' AND n.license_number = 'ENF-001'
LIMIT 1;

INSERT INTO appointments (patient_id, vaccine_id, nurse_id, appointment_date, appointment_time, status, notes) 
SELECT 
    p.id, 
    v.id, 
    n.id, 
    '2025-01-15', 
    '11:00', 
    'completed', 
    'Vacuna anual de gripe'
FROM patients p, vaccines v, nurses n 
WHERE p.dni = '87654321' AND v.name = 'Gripe Trivalente' AND n.license_number = 'ENF-002'
LIMIT 1;

-- Insert sample vaccination records
INSERT INTO vaccination_records (patient_id, vaccine_id, nurse_id, vaccination_date, dose_number, lot_number, site_of_injection, notes)
SELECT 
    p.id, 
    v.id, 
    n.id, 
    '2024-12-15 10:30:00', 
    1, 
    'SF002', 
    'Brazo izquierdo', 
    'Sin reacciones adversas'
FROM patients p, vaccines v, nurses n 
WHERE p.dni = '87654321' AND v.name = 'Gripe Trivalente' AND n.license_number = 'ENF-002'
LIMIT 1;

-- Insert sample notifications
INSERT INTO notifications (title, message, type, recipient_type) VALUES
('Bienvenido al Sistema', 'Bienvenido al sistema de gestión de vacunación Salita Feliz', 'info', 'all'),
('Stock Bajo', 'La vacuna Gripe Trivalente tiene stock bajo', 'warning', 'staff'),
('Recordatorio de Turno', 'Recordatorio: Tiene un turno programado para mañana', 'reminder', 'patient');

-- Insert system configuration
INSERT INTO system_config (key, value, description, category) VALUES
('center_name', 'Salita Feliz', 'Nombre del centro de vacunación', 'general'),
('center_address', 'Av. Ejemplo 123, Ciudad', 'Dirección del centro', 'general'),
('center_phone', '(123) 456-7890', 'Teléfono del centro', 'general'),
('center_email', 'info@salitafeliz.com', 'Email del centro', 'general'),
('working_hours', '08:00-18:00', 'Horario de atención', 'general'),
('appointment_duration', '30', 'Duración de turnos en minutos', 'appointments'),
('stock_alert_threshold', '10', 'Umbral de alerta de stock bajo', 'inventory'),
('expiration_alert_days', '30', 'Días antes del vencimiento para alertar', 'inventory');
