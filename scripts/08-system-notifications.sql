-- ==============================================================================
-- 08-system-notifications.sql
-- Sistema de Notificaciones In-App para el Personal Clínico - Salita Feliz
-- ==============================================================================

-- 1. Crear tabla de notificaciones del sistema
CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO', -- 'INFO', 'WARNING', 'CRITICAL'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Índices para optimizar consultas de campana de notificaciones
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at
    ON public.system_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_notifications_is_read_created_at
    ON public.system_notifications (is_read, created_at DESC);

-- 3. Habilitar RLS
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad (Permitir lectura y escritura a personal autenticado, anon y service_role)
DROP POLICY IF EXISTS "Allow all access to system_notifications" ON public.system_notifications;
CREATE POLICY "Allow all access to system_notifications"
    ON public.system_notifications
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Otorgar permisos
GRANT ALL ON public.system_notifications TO anon, authenticated, service_role;
