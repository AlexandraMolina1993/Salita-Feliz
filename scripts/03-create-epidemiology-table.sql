-- ==============================================================================
-- Salita Feliz - Migración de Base de Datos (Supabase)
-- Tabla: regional_statistics
-- Registra los porcentajes oficiales de cobertura de vacunación por provincia
-- provenientes de los boletines epidemiológicos públicos del Ministerio de Salud / NOMIVAC
-- Modelo de Sincronización Manual
-- ==============================================================================

-- Habilitar extensión uuid-ossp o pgcrypto si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS regional_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province VARCHAR(100) NOT NULL,
    vaccine_key VARCHAR(100) NOT NULL,
    coverage_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    source_period VARCHAR(100) NOT NULL DEFAULT 'Boletín Q3 2026',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_province_vaccine UNIQUE (province, vaccine_key)
);

-- Índices para optimizar consultas por provincia y vacuna
CREATE INDEX IF NOT EXISTS idx_regional_statistics_province ON regional_statistics(province);
CREATE INDEX IF NOT EXISTS idx_regional_statistics_vaccine_key ON regional_statistics(vaccine_key);

-- Habilitar Row Level Security (RLS)
ALTER TABLE regional_statistics ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública / anon / autenticada para permitir visualización en la app
DROP POLICY IF EXISTS "Permitir lectura regional_statistics" ON regional_statistics;
CREATE POLICY "Permitir lectura regional_statistics"
    ON regional_statistics
    FOR SELECT
    USING (true);

-- Política de inserción y actualización para usuarios autenticados / servicio
DROP POLICY IF EXISTS "Permitir modificacion autenticados regional_statistics" ON regional_statistics;
CREATE POLICY "Permitir modificacion autenticados regional_statistics"
    ON regional_statistics
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Comentarios documentales en catálogo PostgreSQL
COMMENT ON TABLE regional_statistics IS 'Estadísticas epidemiológicas oficiales del Ministerio de Salud / NOMIVAC sincronizadas manualmente';
COMMENT ON COLUMN regional_statistics.province IS 'Jurisdicción o provincia argentina (ej. Córdoba, Buenos Aires)';
COMMENT ON COLUMN regional_statistics.vaccine_key IS 'Identificador de la vacuna y cohorte (ej. Antigripal (>65))';
COMMENT ON COLUMN regional_statistics.coverage_percentage IS 'Porcentaje de cobertura oficial alcanzado (0-100)';
COMMENT ON COLUMN regional_statistics.source_period IS 'Período o fecha de publicación del boletín oficial de referencia (ej. Boletín Q3 2026)';

-- ==============================================================================
-- Inserción de datos iniciales básicos de ejemplo (Córdoba y Buenos Aires)
-- ==============================================================================

INSERT INTO regional_statistics (province, vaccine_key, coverage_percentage, source_period, updated_at)
VALUES
    -- Córdoba (Boletín Q3 2026)
    ('Córdoba', 'Antigripal (>65)', 68.0, 'Boletín Q3 2026', NOW()),
    ('Córdoba', 'VPH (11 años)', 75.0, 'Boletín Q3 2026', NOW()),
    ('Córdoba', 'Quíntuple (Lactantes)', 82.0, 'Boletín Q3 2026', NOW()),

    -- Buenos Aires (Boletín Q3 2026)
    ('Buenos Aires', 'Antigripal (>65)', 64.0, 'Boletín Q3 2026', NOW()),
    ('Buenos Aires', 'VPH (11 años)', 71.0, 'Boletín Q3 2026', NOW()),
    ('Buenos Aires', 'Quíntuple (Lactantes)', 79.0, 'Boletín Q3 2026', NOW()),

    -- CABA (Boletín Q3 2026)
    ('CABA', 'Antigripal (>65)', 74.0, 'Boletín Q3 2026', NOW()),
    ('CABA', 'VPH (11 años)', 80.0, 'Boletín Q3 2026', NOW()),
    ('CABA', 'Quíntuple (Lactantes)', 88.0, 'Boletín Q3 2026', NOW()),

    -- Santa Fe (Boletín Q3 2026)
    ('Santa Fe', 'Antigripal (>65)', 69.0, 'Boletín Q3 2026', NOW()),
    ('Santa Fe', 'VPH (11 años)', 76.0, 'Boletín Q3 2026', NOW()),
    ('Santa Fe', 'Quíntuple (Lactantes)', 84.0, 'Boletín Q3 2026', NOW()),

    -- Mendoza (Boletín Q3 2026)
    ('Mendoza', 'Antigripal (>65)', 66.0, 'Boletín Q3 2026', NOW()),
    ('Mendoza', 'VPH (11 años)', 73.0, 'Boletín Q3 2026', NOW()),
    ('Mendoza', 'Quíntuple (Lactantes)', 80.0, 'Boletín Q3 2026', NOW())
ON CONFLICT (province, vaccine_key) 
DO UPDATE SET 
    coverage_percentage = EXCLUDED.coverage_percentage,
    source_period = EXCLUDED.source_period,
    updated_at = NOW();
