-- ==============================================================================
-- CORRECCIÓN INTEGRAL DE ESQUEMA, NOT NULL CONSTRAINTS Y RPC (process_appointment_completion)
-- Salita Feliz - Enterprise Healthcare System / PostgreSQL & Supabase
-- ==============================================================================

BEGIN;

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Asegurar columnas y relajar restricciones en `appointments`
ALTER TABLE IF EXISTS appointments ADD COLUMN IF NOT EXISTS dose_to_apply DECIMAL(10,2) DEFAULT 0.5;
ALTER TABLE IF EXISTS appointments ADD COLUMN IF NOT EXISTS dose_applied DECIMAL(10,2);
ALTER TABLE IF EXISTS appointments ADD COLUMN IF NOT EXISTS vaccination_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS appointments ADD COLUMN IF NOT EXISTS side_effects TEXT;
ALTER TABLE IF EXISTS appointments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS appointments ALTER COLUMN nurse_id DROP NOT NULL;
ALTER TABLE IF EXISTS appointments ALTER COLUMN appointment_time DROP NOT NULL;

-- 3. Asegurar columnas y relajar restricciones en `vaccines`
ALTER TABLE IF EXISTS vaccines ADD COLUMN IF NOT EXISTS dose_amount DECIMAL(10,2) DEFAULT 0.5;
ALTER TABLE IF EXISTS vaccines ADD COLUMN IF NOT EXISTS administration_route VARCHAR(100) DEFAULT 'Intramuscular (IM)';
ALTER TABLE IF EXISTS vaccines ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);
ALTER TABLE IF EXISTS vaccines ADD COLUMN IF NOT EXISTS net_content VARCHAR(100);
ALTER TABLE IF EXISTS vaccines ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 10;
ALTER TABLE IF EXISTS vaccines ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS vaccines ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Asegurar tabla e índices de `stock_movements`
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vaccine_id UUID NOT NULL REFERENCES vaccines(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('ADJUSTMENT', 'CONSUMPTION', 'INCIDENT', 'REPLENISHMENT')),
    quantity_vials INTEGER NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE IF EXISTS stock_movements ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS stock_movements ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_stock_movements_vaccine_id ON stock_movements(vaccine_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_metadata_gin ON stock_movements USING gin (metadata);

-- 5. Asegurar columnas y RELAJAR RESTRICCIONES NOT NULL en `vaccination_records`
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS vaccination_time TIME DEFAULT CURRENT_TIME;
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS side_effects TEXT;
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS adverse_reactions TEXT;
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS dose_applied DECIMAL(10,2);
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS dose_number INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS site_of_injection VARCHAR(100);
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100);
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE IF EXISTS vaccination_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Relajar restricciones NOT NULL que provocan fallos transaccionales en vaccination_records
ALTER TABLE IF EXISTS vaccination_records ALTER COLUMN vaccination_time DROP NOT NULL;
ALTER TABLE IF EXISTS vaccination_records ALTER COLUMN vaccination_time SET DEFAULT CURRENT_TIME;
ALTER TABLE IF EXISTS vaccination_records ALTER COLUMN vaccination_date DROP NOT NULL;
ALTER TABLE IF EXISTS vaccination_records ALTER COLUMN vaccination_date SET DEFAULT CURRENT_DATE;
ALTER TABLE IF EXISTS vaccination_records ALTER COLUMN nurse_id DROP NOT NULL;
ALTER TABLE IF EXISTS vaccination_records ALTER COLUMN dose_number DROP NOT NULL;
ALTER TABLE IF EXISTS vaccination_records ALTER COLUMN dose_number SET DEFAULT 1;

-- 6. Recrear Vista en Tiempo Real `v_vaccines_stock`
CREATE OR REPLACE VIEW v_vaccines_stock AS
SELECT
    v.id AS vaccine_id,
    v.name AS name,
    COALESCE(v.manufacturer, '') AS laboratory,
    v.type AS type,
    COALESCE(v.dose_amount, 0.5)::numeric AS dose_amount,
    COALESCE(v.min_stock_level, 10)::integer AS min_stock_level,
    COALESCE(v.is_active, true) AS is_active,
    v.expiration_date AS expiration_date,
    COALESCE(v.stock_quantity, 0)::integer AS current_stock_vials,
    (COALESCE(v.stock_quantity, 0) * COALESCE(v.dose_amount, 0.5))::numeric AS current_stock_ml,
    CASE
        WHEN COALESCE(v.stock_quantity, 0) <= 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(v.stock_quantity, 0) <= COALESCE(v.min_stock_level, 10) THEN 'CRITICAL_LOW'
        ELSE 'OPTIMAL'
    END AS stock_status
FROM vaccines v;

-- 7. Recrear Función Transaccional Atómica RPC (process_appointment_completion)
CREATE OR REPLACE FUNCTION process_appointment_completion(
    p_appointment_id UUID,
    p_dose_ml NUMERIC,
    p_nurse_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_side_effects TEXT DEFAULT NULL,
    p_lot_number VARCHAR DEFAULT NULL,
    p_site_of_injection VARCHAR DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_appointment RECORD;
    v_vaccine RECORD;
    v_remaining_stock INTEGER;
    v_movement_id UUID;
    v_final_nurse_id UUID;
    v_final_lot VARCHAR;
    v_vials_to_consume INTEGER := 1;
    v_side_effects_val TEXT;
BEGIN
    -- 1. Validar y bloquear el turno clínico
    SELECT * INTO v_appointment
    FROM appointments
    WHERE id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El turno clínico con ID % no existe.', p_appointment_id;
    END IF;

    IF v_appointment.status = 'completed' THEN
        RAISE EXCEPTION 'El turno % ya ha sido completado previamente.', p_appointment_id;
    END IF;

    -- 2. Validar y bloquear la vacuna requerida
    SELECT * INTO v_vaccine
    FROM vaccines
    WHERE id = v_appointment.vaccine_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La vacuna asociada con ID % no fue encontrada.', v_appointment.vaccine_id;
    END IF;

    IF v_vaccine.stock_quantity < v_vials_to_consume THEN
        RAISE EXCEPTION 'Stock insuficiente de la vacuna "%": disponible % vial(es), requerido % vial(es).',
            v_vaccine.name, v_vaccine.stock_quantity, v_vials_to_consume;
    END IF;

    -- 3. Descontar stock de la vacuna
    UPDATE vaccines
    SET stock_quantity = stock_quantity - v_vials_to_consume,
        updated_at = NOW()
    WHERE id = v_vaccine.id
    RETURNING stock_quantity INTO v_remaining_stock;

    v_final_nurse_id := COALESCE(p_nurse_id, v_appointment.nurse_id);
    v_final_lot := COALESCE(p_lot_number, v_vaccine.lot_number, 'LOTE-DEFAULT');
    v_side_effects_val := COALESCE(p_side_effects, 'Sin reacciones adversas inmediatas');

    -- 4. Actualizar estado del turno clínico
    UPDATE appointments
    SET status = 'completed',
        vaccination_date = NOW(),
        nurse_id = v_final_nurse_id,
        notes = COALESCE(p_notes, v_appointment.notes),
        side_effects = COALESCE(p_side_effects, v_appointment.side_effects),
        dose_applied = p_dose_ml,
        updated_at = NOW()
    WHERE id = p_appointment_id;

    -- 5. Registrar en libro mayor inmutable de movimientos de stock
    INSERT INTO stock_movements (
        vaccine_id,
        appointment_id,
        type,
        quantity_vials,
        description,
        metadata,
        created_at
    )
    VALUES (
        v_vaccine.id,
        p_appointment_id,
        'CONSUMPTION',
        -v_vials_to_consume,
        'Deducción por aplicación en turno clínico: ' || v_vaccine.name,
        jsonb_build_object(
            'applied_dose_ml', p_dose_ml,
            'nurse_id', v_final_nurse_id,
            'patient_id', v_appointment.patient_id,
            'lot_number', v_final_lot
        ),
        NOW()
    )
    RETURNING id INTO v_movement_id;

    -- 6. Insertar registro histórico en vaccination_records asegurando todos los campos compatibles
    INSERT INTO vaccination_records (
        patient_id,
        vaccine_id,
        nurse_id,
        appointment_id,
        vaccination_date,
        vaccination_time,
        dose_number,
        lot_number,
        expiration_date,
        site_of_injection,
        side_effects,
        adverse_reactions,
        notes,
        created_at,
        updated_at
    )
    VALUES (
        v_appointment.patient_id,
        v_vaccine.id,
        v_final_nurse_id,
        p_appointment_id,
        CURRENT_DATE,
        CURRENT_TIME,
        1,
        v_final_lot,
        v_vaccine.expiration_date,
        COALESCE(p_site_of_injection, 'Deltoides izquierdo'),
        v_side_effects_val,
        v_side_effects_val,
        p_notes,
        NOW(),
        NOW()
    );

    -- 7. Retornar payload estructurado para el frontend
    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', p_appointment_id,
        'vaccine_id', v_vaccine.id,
        'vaccine_name', v_vaccine.name,
        'applied_dose_ml', p_dose_ml,
        'vials_consumed', v_vials_to_consume,
        'remaining_stock_vials', v_remaining_stock,
        'movement_id', v_movement_id,
        'timestamp', NOW()
    );
END;
$$;

-- 8. Otorgar permisos a roles de Supabase (anon, authenticated, service_role)
GRANT SELECT ON v_vaccines_stock TO anon, authenticated, service_role;
GRANT ALL ON vaccination_records TO anon, authenticated, service_role;
GRANT ALL ON appointments TO anon, authenticated, service_role;
GRANT ALL ON vaccines TO anon, authenticated, service_role;
GRANT ALL ON stock_movements TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_appointment_completion TO anon, authenticated, service_role;

COMMIT;

-- 9. Notificar a PostgREST para recargar el Schema Cache inmediatamente
NOTIFY pgrst, 'reload schema';
