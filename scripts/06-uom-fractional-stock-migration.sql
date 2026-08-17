-- ==============================================================================
-- MIGRACIÓN UOM: SEPARACIÓN DE UNIDADES DE MEDIDA Y STOCK FRACCIONAL
-- Salita Feliz - Enterprise Healthcare System / PostgreSQL & Supabase
-- ==============================================================================

BEGIN;

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Estructura y Migración de la Tabla `vaccines`
ALTER TABLE IF EXISTS vaccines ADD COLUMN IF NOT EXISTS dose_amount NUMERIC(10,2) DEFAULT 0.5;
ALTER TABLE IF EXISTS vaccines ALTER COLUMN dose_amount TYPE NUMERIC USING dose_amount::numeric;
ALTER TABLE IF EXISTS vaccines ALTER COLUMN dose_amount SET DEFAULT 0.5;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'vaccines' AND column_name = 'net_content'
    ) THEN
        ALTER TABLE vaccines ADD COLUMN net_content NUMERIC(10,2) DEFAULT 5.0;
    ELSE
        ALTER TABLE vaccines ALTER COLUMN net_content TYPE NUMERIC USING (
            CASE 
                WHEN net_content IS NULL OR TRIM(net_content::text) = '' THEN 5.0
                ELSE NULLIF(regexp_replace(net_content::text, '[^0-9.]', '', 'g'), '')::numeric
            END
        );
        ALTER TABLE vaccines ALTER COLUMN net_content SET DEFAULT 5.0;
    END IF;
END $$;

ALTER TABLE IF EXISTS vaccines ALTER COLUMN stock_quantity TYPE NUMERIC USING stock_quantity::numeric;

-- Sanitizar valores por defecto en vaccines para prevenir divisiones por cero
UPDATE vaccines 
SET net_content = CASE 
    WHEN net_content IS NULL OR net_content <= 0 THEN 
        CASE 
            WHEN dose_amount IS NOT NULL AND dose_amount > 0 THEN dose_amount * 10 
            ELSE 5.0 
        END
    ELSE net_content 
END;

UPDATE vaccines 
SET dose_amount = CASE 
    WHEN dose_amount IS NULL OR dose_amount <= 0 THEN 0.5 
    ELSE dose_amount 
END;

-- 3. Estructura y Migración del Tipo de Dato en `stock_movements` (Soporte Decimal/Fracciones)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vaccine_id UUID NOT NULL REFERENCES vaccines(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('ADJUSTMENT', 'CONSUMPTION', 'INCIDENT', 'REPLENISHMENT')),
    quantity_vials NUMERIC(14,6) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE IF EXISTS stock_movements ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS stock_movements ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS stock_movements ALTER COLUMN quantity_vials TYPE NUMERIC USING quantity_vials::numeric;

CREATE INDEX IF NOT EXISTS idx_stock_movements_vaccine_id ON stock_movements(vaccine_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_metadata_gin ON stock_movements USING gin (metadata);

-- Sincronizar saldos de balance inicial en stock_movements para que SUM(quantity_vials) refleje fielmente el inventario
INSERT INTO stock_movements (vaccine_id, type, quantity_vials, description, metadata, created_at)
SELECT 
    v.id,
    'ADJUSTMENT',
    (v.stock_quantity - COALESCE(sm_sum.total_mov, 0)),
    'Ajuste de balance inicial UOM: ' || v.name,
    jsonb_build_object('migration', '06_uom_fractional_stock', 'source', 'initial_sync'),
    NOW()
FROM vaccines v
LEFT JOIN (
    SELECT vaccine_id, SUM(quantity_vials) AS total_mov 
    FROM stock_movements 
    GROUP BY vaccine_id
) sm_sum ON sm_sum.vaccine_id = v.id
WHERE (v.stock_quantity - COALESCE(sm_sum.total_mov, 0)) <> 0;

-- 4. Reconstrucción de la Vista `v_vaccines_stock` con Separación de Unidades (UOM)
CREATE OR REPLACE VIEW v_vaccines_stock AS
SELECT
    v.id AS vaccine_id,
    v.name AS name,
    COALESCE(v.manufacturer, '') AS laboratory,
    v.type AS type,
    COALESCE(v.dose_amount, 0.5)::numeric AS dose_amount,
    COALESCE(v.net_content, 5.0)::numeric AS net_content,
    COALESCE(v.min_stock_level, 10)::integer AS min_stock_level,
    COALESCE(v.is_active, true) AS is_active,
    v.expiration_date AS expiration_date,
    -- Fracción acumulada exacta de frascos/envases
    COALESCE(SUM(sm.quantity_vials), 0)::numeric AS current_stock_fraction,
    -- a) total_ml: (SUM(movimientos) * net_content)
    (COALESCE(SUM(sm.quantity_vials), 0) * COALESCE(v.net_content, 5.0))::numeric AS total_ml,
    -- b) physical_vials_for_repos: CEIL(SUM(movimientos)) (Frascos físicos en heladera)
    CEIL(COALESCE(SUM(sm.quantity_vials), 0))::integer AS physical_vials_for_repos,
    -- c) available_doses_for_clinic: FLOOR((SUM(movimientos) * net_content) / dose_amount) (Dosis reales a aplicar)
    FLOOR(
        (COALESCE(SUM(sm.quantity_vials), 0) * COALESCE(v.net_content, 5.0)) 
        / NULLIF(COALESCE(v.dose_amount, 0.5), 0)
    )::integer AS available_doses_for_clinic,
    -- Proyecciones de compatibilidad para clientes existentes
    CEIL(COALESCE(SUM(sm.quantity_vials), 0))::integer AS current_stock_vials,
    (COALESCE(SUM(sm.quantity_vials), 0) * COALESCE(v.net_content, 5.0))::numeric AS current_stock_ml,
    CASE
        WHEN COALESCE(SUM(sm.quantity_vials), 0) <= 0 THEN 'OUT_OF_STOCK'
        WHEN CEIL(COALESCE(SUM(sm.quantity_vials), 0)) <= COALESCE(v.min_stock_level, 10) THEN 'CRITICAL_LOW'
        ELSE 'OPTIMAL'
    END AS stock_status
FROM vaccines v
LEFT JOIN stock_movements sm ON sm.vaccine_id = v.id
GROUP BY v.id, v.name, v.manufacturer, v.type, v.dose_amount, v.net_content, v.min_stock_level, v.is_active, v.expiration_date;

-- 5. Refactorización del RPC `process_appointment_completion` con deducción fraccional -(dosis / net_content)
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
    v_net_content NUMERIC;
    v_fraction_consumed NUMERIC;
    v_current_stock_fraction NUMERIC;
    v_remaining_fraction NUMERIC;
    v_movement_id UUID;
    v_final_nurse_id UUID;
    v_final_lot VARCHAR;
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

    -- Determinar net_content en ml
    v_net_content := COALESCE(v_vaccine.net_content, v_vaccine.dose_amount * 10, 5.0)::numeric;
    IF v_net_content <= 0 THEN
        v_net_content := 5.0;
    END IF;

    -- Cálculo de la fracción exacta consumida: (dosis_aplicada / vac.net_content)
    v_fraction_consumed := (p_dose_ml::numeric / v_net_content);

    -- Consultar el balance acumulado en stock_movements
    SELECT COALESCE(SUM(quantity_vials), 0)::numeric 
    INTO v_current_stock_fraction
    FROM stock_movements 
    WHERE vaccine_id = v_vaccine.id;

    -- Validar disponibilidad de mililitros
    IF (v_current_stock_fraction * v_net_content) < p_dose_ml THEN
        RAISE EXCEPTION 'Stock insuficiente de la vacuna "%": disponible % ml (% frasco(s)), requerido % ml (% frasco).',
            v_vaccine.name, 
            ROUND(v_current_stock_fraction * v_net_content, 2), 
            ROUND(v_current_stock_fraction, 4), 
            p_dose_ml, 
            ROUND(v_fraction_consumed, 4);
    END IF;

    -- 3. Actualizar registro maestro de la vacuna
    v_remaining_fraction := v_current_stock_fraction - v_fraction_consumed;
    
    UPDATE vaccines
    SET stock_quantity = v_remaining_fraction,
        updated_at = NOW()
    WHERE id = v_vaccine.id;

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

    -- 5. Registrar en libro mayor inmutable de movimientos con la fracción exacta: -(dosis / net_content)
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
        -v_fraction_consumed,
        'Deducción por aplicación en turno clínico (' || p_dose_ml || ' ml / ' || v_net_content || ' ml envase): ' || v_vaccine.name,
        jsonb_build_object(
            'applied_dose_ml', p_dose_ml,
            'net_content_ml', v_net_content,
            'fraction_consumed', v_fraction_consumed,
            'nurse_id', v_final_nurse_id,
            'patient_id', v_appointment.patient_id,
            'lot_number', v_final_lot
        ),
        NOW()
    )
    RETURNING id INTO v_movement_id;

    -- 6. Registrar en vaccination_records
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
        'fraction_consumed', v_fraction_consumed,
        'vials_consumed', v_fraction_consumed,
        'net_content_ml', v_net_content,
        'remaining_stock_vials', v_remaining_fraction,
        'movement_id', v_movement_id,
        'timestamp', NOW()
    );
END;
$$;

-- 6. Permisos de acceso
GRANT SELECT ON v_vaccines_stock TO anon, authenticated, service_role;
GRANT ALL ON vaccination_records TO anon, authenticated, service_role;
GRANT ALL ON appointments TO anon, authenticated, service_role;
GRANT ALL ON vaccines TO anon, authenticated, service_role;
GRANT ALL ON stock_movements TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_appointment_completion TO anon, authenticated, service_role;

COMMIT;

-- 7. Notificar a PostgREST para recargar el Schema Cache inmediatamente
NOTIFY pgrst, 'reload schema';
