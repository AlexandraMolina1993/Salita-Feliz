// ./hooks/use-theme-sync.ts
"use client"

import { useEffect } from 'react';
import { getConfigByCategory } from '@/lib/database'; // Asegúrate de que esta ruta sea correcta

// Clave que usamos en Supabase
const DARK_MODE_KEY = 'modo_oscuro_activo';

export function useThemeSync() {
  useEffect(() => {
    // Esta función se ejecuta solo en el navegador
    const fetchAndApplyTheme = async () => {
      // Usamos document.documentElement para acceder a la etiqueta <html>
      const HTML_ELEMENT = document.documentElement;

      try {
        // 1. Leer la configuración de Supabase
        const data = await getConfigByCategory('General');
        
        const darkModeConfig = data.find(item => item.key === DARK_MODE_KEY);
        
        // 2. Determinar si el modo oscuro está activo
        const isDarkModeActive = darkModeConfig ? darkModeConfig.value === 'true' : false;

        // 3. Aplicar/remover la clase 'dark' de Tailwind
        if (isDarkModeActive) {
          HTML_ELEMENT.classList.add('dark');
        } else {
          HTML_ELEMENT.classList.remove('dark');
        }

      } catch (error) {
        console.error("Error al sincronizar el tema desde Supabase:", error);
        // Si hay un error, dejamos el tema por defecto (light)
        HTML_ELEMENT.classList.remove('dark');
      }
    };

    fetchAndApplyTheme();

    // NOTA: Para que el switch de configuración General funcione inmediatamente al guardar,
    // podrías necesitar guardar el valor en localStorage y escuchar ese cambio aquí.
    // Por ahora, solo se sincroniza al cargar la página.
    
  }, []); // Se ejecuta solo una vez al inicio
}