-- ==============================================================================
-- MIGRACIÓN 10: Corrección y Blindaje del Trigger de Vencimiento de Vacunas en Turnos
-- Salita Feliz - Enterprise Healthcare System
-- ==============================================================================

BEGIN;

-- 1. Redefinir la función disparadora con normalización LOWER / TRIM en el status
CREATE OR REPLACE FUNCTION check_vaccine_expiration_on_appointment()
RETURNS TRIGGER AS $$
DECLARE
    v_exp DATE;
    v_name TEXT;
    v_today DATE := CURRENT_DATE;
    v_status_clean TEXT;
BEGIN
    v_status_clean := LOWER(TRIM(COALESCE(NEW.status, '')));

    -- Regla A: Si se establece deleted_at (Soft Delete), PERMITIR SIEMPRE
    IF (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL) THEN
        RETURN NEW;
    END IF;

    -- Regla B: Si la operación es Cancelación (status = 'cancelled' o 'cancelado'), PERMITIR SIEMPRE
    IF (TG_OP = 'UPDATE' AND (v_status_clean = 'cancelled' OR v_status_clean = 'cancelado')) THEN
        RETURN NEW;
    END IF;

    -- Regla C: Si es un UPDATE donde NO se cambia la vacuna (OLD.vaccine_id = NEW.vaccine_id)
    -- y el estado no es 'completed': permitir modificaciones secundarias (notas, enfermero, etc.)
    IF (TG_OP = 'UPDATE' AND OLD.vaccine_id = NEW.vaccine_id AND v_status_clean != 'completed') THEN
        RETURN NEW;
    END IF;

    -- Regla D: Si es un INSERT (nuevo turno) o un UPDATE donde se REASIGNA la vacuna
    -- o si se intenta completar: validar que la vacuna no esté vencida
    IF (NEW.vaccine_id IS NOT NULL) THEN
        SELECT expiration_date, name INTO v_exp, v_name 
        FROM vaccines 
        WHERE id = NEW.vaccine_id;

        IF v_exp IS NOT NULL AND v_exp < v_today THEN
            RAISE EXCEPTION 'ALERTA DE SISTEMA: No se puede programar este turno. La vacuna "%" está VENCIDA desde %.', v_name, v_exp;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Eliminar variantes previas del trigger en la tabla appointments
DROP TRIGGER IF EXISTS trg_check_vaccine_expiration ON appointments;
DROP TRIGGER IF EXISTS check_vaccine_expiration_on_appointment_trigger ON appointments;
DROP TRIGGER IF EXISTS trg_check_appointment_vaccine_expiration ON appointments;
DROP TRIGGER IF EXISTS check_vaccine_expiration_trigger ON appointments;
DROP TRIGGER IF EXISTS check_vaccine_expiration ON appointments;
DROP TRIGGER IF EXISTS validate_vaccine_expiration_trigger ON appointments;

-- 3. Crear el nuevo trigger unificado
CREATE TRIGGER trg_check_vaccine_expiration
BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION check_vaccine_expiration_on_appointment();

-- 4. Notificar a PostgREST para recargar la caché del esquema
NOTIFY pgrst, 'reload schema';

COMMIT;
