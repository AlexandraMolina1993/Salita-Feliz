-- ============================================================================
-- Migración: Soft Delete para Turnos Clínicos (appointments)
-- Salita Feliz - Enterprise Healthcare System
-- ============================================================================

-- 1. Añadir columna deleted_at a la tabla appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Crear índice para optimizar consultas con filtro deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at ON appointments (deleted_at);

-- 3. Notificar a PostgREST para recargar la caché del esquema
NOTIFY pgrst, 'reload schema';
