// ./contexts/ThemeContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getConfigByCategory } from '@/lib/database';

// Clave usada en Supabase
const DARK_MODE_KEY = 'modo_oscuro_activo';
const HTML_ELEMENT = typeof window !== 'undefined' ? document.documentElement : null;

interface ThemeContextType {
  isDarkMode: boolean;
  setDarkMode: (value: boolean) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Función interna que sincroniza el estado de React con el DOM (la clase 'dark')
  const applyThemeToDOM = (dark: boolean) => {
    if (HTML_ELEMENT) {
      if (dark) {
        HTML_ELEMENT.classList.add('dark');
      } else {
        HTML_ELEMENT.classList.remove('dark');
      }
    }
  };

  // Función para ser llamada desde los componentes (ej. GeneralSettingsPage)
  const setDarkMode = (value: boolean) => {
    setIsDarkMode(value);
    applyThemeToDOM(value);
  };

  // 1. Efecto para cargar el tema inicial de Supabase al montar
  useEffect(() => {
    const fetchAndApplyTheme = async () => {
      try {
        const data = await getConfigByCategory('General');
        const darkModeConfig = data.find(item => item.key === DARK_MODE_KEY);
        const initialDark = darkModeConfig ? darkModeConfig.value === 'true' : false;
        
        setIsDarkMode(initialDark);
        applyThemeToDOM(initialDark);
      } catch (error) {
        console.error("Error al cargar tema:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndApplyTheme();
  }, []); // Solo se ejecuta una vez

  // 2. Efecto para asegurar que la clase 'dark' siempre refleje el estado
  useEffect(() => {
    applyThemeToDOM(isDarkMode);
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, setDarkMode, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};