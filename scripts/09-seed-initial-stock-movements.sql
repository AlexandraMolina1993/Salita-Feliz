-- ==============================================================================
-- INYECCIÓN DE STOCK INICIAL Y CONSOLIDACIÓN DE VISTA v_vaccines_stock
-- Salita Feliz - Enterprise Healthcare System / PostgreSQL & Supabase
-- ==============================================================================

BEGIN;

-- 1. Actualizar Check Constraint en stock_movements para permitir 'INITIAL_STOCK' y 'ENTRY'
ALTER TABLE IF EXISTS stock_movements 
    DROP CONSTRAINT IF EXISTS stock_movements_type_check;

ALTER TABLE IF EXISTS stock_movements 
    ADD CONSTRAINT stock_movements_type_check 
    CHECK (type IN ('INITIAL_STOCK', 'ENTRY', 'ADJUSTMENT', 'CONSUMPTION', 'INCIDENT', 'REPLENISHMENT'));

-- 2. Asegurar vista v_vaccines_stock con cálculo consolidado de physical_vials
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
    -- Fracción acumulada exacta de frascos/envases en el Ledger
    COALESCE(SUM(sm.quantity_vials), 0)::numeric AS current_stock_fraction,
    -- a) total_ml: (SUM(movimientos) * net_content)
    (COALESCE(SUM(sm.quantity_vials), 0) * COALESCE(v.net_content, 5.0))::numeric AS total_ml,
    -- b) physical_vials / physical_vials_for_repos: CEIL(SUM(movimientos)) (Frascos físicos en heladera)
    CEIL(COALESCE(SUM(sm.quantity_vials), 0))::integer AS physical_vials,
    CEIL(COALESCE(SUM(sm.quantity_vials), 0))::integer AS physical_vials_for_repos,
    -- c) available_doses_for_clinic: FLOOR((SUM(movimientos) * net_content) / dose_amount) (Dosis reales a aplicar)
    FLOOR(
        (COALESCE(SUM(sm.quantity_vials), 0) * COALESCE(v.net_content, 5.0)) 
        / NULLIF(COALESCE(v.dose_amount, 0.5), 0)
    )::integer AS available_doses_for_clinic,
    -- Compatibilidad de alias para clientes existentes
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

GRANT SELECT ON v_vaccines_stock TO anon, authenticated, service_role;

-- 3. Inserción de Stock Inicial / Reabastecimiento inicial en stock_movements
-- Inyectar movimientos iniciales para cada vacuna existente (50 viales cada una)
INSERT INTO stock_movements (vaccine_id, type, quantity_vials, description, metadata, created_at)
SELECT
    v.id,
    'INITIAL_STOCK',
    50.0,
    'Ingreso de inventario inicial consolidado: ' || v.name || ' (50 viales)',
    jsonb_build_object(
        'source', 'initial_seed',
        'batch', 'INITIAL-2026',
        'operator', 'System DB Architect',
        'notes', 'Carga inicial para activación operativa del centro de salud'
    ),
    NOW()
FROM vaccines v
WHERE NOT EXISTS (
    SELECT 1 FROM stock_movements sm2 
    WHERE sm2.vaccine_id = v.id AND sm2.type = 'INITIAL_STOCK'
);

-- 4. Sincronizar columna referencial stock_quantity en vaccines para consistencia histórica
UPDATE vaccines v
SET stock_quantity = COALESCE(
    (SELECT SUM(sm.quantity_vials) FROM stock_movements sm WHERE sm.vaccine_id = v.id),
    0
);

COMMIT;
