// ./contexts/ThemeContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getConfigByCategory } from '@/lib/database';

const DARK_MODE_KEY = 'modo_oscuro_activo';

interface ThemeContextType {
  isDarkMode: boolean;
  setDarkMode: (value: boolean) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sincronización directa y limpia con el DOM
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const htmlElement = document.documentElement;
      if (isDarkMode) {
        htmlElement.classList.add('dark');
        htmlElement.style.colorScheme = 'dark';
      } else {
        htmlElement.classList.remove('dark');
        htmlElement.style.colorScheme = 'light';
      }
    }
  }, [isDarkMode]);

  // Carga inicial desde la base de datos
  useEffect(() => {
    const fetchAndApplyTheme = async () => {
      try {
        const data = await getConfigByCategory('General');
        const darkModeConfig = data.find(item => item.key === DARK_MODE_KEY);
        
        const initialDark = darkModeConfig 
          ? (darkModeConfig.value === 'dark' || darkModeConfig.value === 'true') 
          : false;
        
        setIsDarkMode(initialDark);
      } catch (error) {
        console.error("❌ Error al cargar tema desde el proveedor:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndApplyTheme();
  }, []);

  const setDarkMode = (value: boolean) => {
    setIsDarkMode(value);
  };

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