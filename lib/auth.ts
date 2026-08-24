// lib/auth.ts

import { supabase } from './supabase'; 
import type { AdminProfile } from './types'; // Asegúrate de que este tipo exista y sea correcto

// ----------------------------------------------------
// Tipos de datos
// ----------------------------------------------------

interface AdminSignupData {
    email: string;
    password: string;
    name: string;
    phone: string;
    idNumber: string;
    address: string;
    birthDate: string;
    gender: string;
    hireDate: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
}

// ----------------------------------------------------
// Funciones de Lectura de Datos
// ----------------------------------------------------


export async function fetchAdminProfile(): Promise<AdminProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    // 2. Consultar la tabla admin_profiles
    const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', user.id)
        // ❌ ELIMINA .single() TEMPORALMENTE ❌
        // .single(); 

    if (error || !data || data.length === 0) { // Verifica si no hay datos
        console.error("Error al cargar el perfil del administrador:", error || 'Perfil no encontrado');
        return null;
    }

    // Devuelve el primer elemento del array, si existe
    return data[0] as AdminProfile;
}

// ----------------------------------------------------
// Función de Registro de Administrador
// ----------------------------------------------------

/**
 * Registra un nuevo administrador en Auth y crea su perfil en admin_profiles.
 */
export async function signupAdmin({ 
    email, 
    password, 
    name, 
    phone, 
    idNumber, 
    address, 
    birthDate, 
    gender, 
    hireDate, 
    emergencyContactName, 
    emergencyContactPhone 
}: AdminSignupData): Promise<{ success: boolean; error: string | null }> {
    
    // 1. Crear el usuario en Supabase Auth (automáticamente inicia sesión)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        return { success: false, error: authError.message };
    }

    const userId = authData.user?.id;

    if (!userId) {
        // Esto es raro si auth.signUp fue exitoso, pero es buena práctica verificar
        return { success: false, error: "Registro de usuario exitoso, pero el ID de usuario es nulo." };
    }

    // Preparación de datos (Convertir strings vacíos a null para campos de fecha)
    const cleanBirthDate = birthDate || null; 
    const cleanHireDate = hireDate || null; 

    // 2. Insertar el perfil inicial en la tabla 'admin_profiles'
    const { error: profileError } = await supabase
        .from('admin_profiles') 
        .insert({
            // Mapeo de columnas
            id: userId, 
            email: email,
            role: 'Administrador', 
            name: name,
            phone: phone, 
            idNumber: idNumber, 
            address: address,
            birthDate: cleanBirthDate, 
            gender: gender,
            hireDate: cleanHireDate,
            emergencyContactName: emergencyContactName,
            emergencyContactPhone: emergencyContactPhone,
            // Si tienes una columna 'is_active' que no acepta null, puedes descomentar:
            // is_active: true, 
        });

    if (profileError) {
        console.error("Error al crear el perfil de administrador (Supabase detail):", profileError);
        // Si el perfil falla, deberías considerar eliminar el usuario de Auth,
        // pero por ahora, solo devolvemos el error.
        return { 
            success: false, 
            error: profileError.message || "Registro de perfil fallido. Faltan datos obligatorios o hay un error de base de datos." 
        };
    }
    
    // El usuario está registrado y logueado, y los datos de perfil existen.
    return { success: true, error: null };
}

// ----------------------------------------------------
// Función de Actualización de Perfil
// ----------------------------------------------------

/**
 * Actualiza los datos del perfil de un administrador en la tabla admin_profiles.
 */
export async function updateAdminProfile( // <-- Función que faltaba (y tiene export)
    userId: string, 
    data: Partial<AdminProfile>
): Promise<{ success: boolean; error: string | null }> {
    
    // 1. Limpiar los datos para evitar enviar valores indefinidos o nulos si son opcionales
    const updateData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    
    // 2. Ejecutar la actualización en Supabase
    const { error } = await supabase
        .from('admin_profiles')
        .update(updateData) 
        .eq('id', userId); 

    if (error) {
        console.error("Error al actualizar el perfil de administrador:", error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}


// ----------------------------------------------------
// Otras funciones de autenticación
// ----------------------------------------------------

/**
 * Inicia sesión con email y contraseña.
 */
export async function login(
  email: string, 
  password: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("[Auth] Error en signInWithPassword:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error("[Auth] Excepción inesperada en login:", err);
    return { 
      success: false, 
      error: err?.message || "Error al conectar con el servidor de autenticación." 
    };
  }
}

/**
 * Cierra la sesión del usuario.
 */
export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[Auth] Error al cerrar sesión:", err);
  }
}

/**
 * Verifica si hay una sesión activa.
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("[Auth] Error al verificar sesión:", error);
      return false;
    }
    return !!session;
  } catch (err) {
    console.error("[Auth] Excepción al verificar autenticación:", err);
    return false;
  }
}

/**
 * Obtiene el email del usuario actual.
 */
export async function getCurrentUser(): Promise<{ email: string } | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { email: user.email || '' };
  } catch (err) {
    console.error("[Auth] Error al obtener usuario actual:", err);
    return null;
  }
}
/**
 * Solicita el restablecimiento de contraseña para el email proporcionado.
 * Supabase enviará un correo electrónico con un enlace único al usuario.
 */
export async function resetPasswordRequest(email: string): Promise<{ success: boolean; error: string | null }> {
    
    // Opcional: Especifica una URL de redirección a donde el usuario irá después de hacer clic en el enlace del email
    const redirectToUrl = `${window.location.origin}/auth/update-password`; 
    // Asegúrate de que esta ruta exista en tu aplicación.

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectToUrl,
    });

    if (error) {
        console.error("Error al solicitar el restablecimiento de contraseña:", error);
        // Nota: Por seguridad, a menudo se devuelve éxito incluso si el correo no existe, 
        // para no dar pistas sobre qué correos están registrados. 
        // Pero para diagnóstico inicial, devolveremos el error.
        return { success: false, error: error.message };
    }

    return { 
        success: true, 
        error: null 
    };
}