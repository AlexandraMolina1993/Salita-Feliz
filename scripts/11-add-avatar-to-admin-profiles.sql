-- scripts/11-add-avatar-to-admin-profiles.sql
-- ==============================================================================
-- Migración: Soporte para Foto de Perfil de Administradores
-- Salita Feliz - Enterprise Healthcare System
-- ==============================================================================

-- 1. Agregar columna avatar_url si no existe
ALTER TABLE admin_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Asegurar que las políticas de RLS permitan la lectura y actualización
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Permitir que usuarios autenticados lean los perfiles de administradores
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_profiles' AND policyname = 'Allow authenticated users to read admin_profiles'
    ) THEN
        CREATE POLICY "Allow authenticated users to read admin_profiles" 
        ON admin_profiles FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- Permitir que el propio administrador actualice su perfil (incluyendo avatar_url)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_profiles' AND policyname = 'Allow admin to update own profile'
    ) THEN
        CREATE POLICY "Allow admin to update own profile" 
        ON admin_profiles FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- 3. Notificar a PostgREST para recargar el Schema Cache inmediatamente
NOTIFY pgrst, 'reload schema';
