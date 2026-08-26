'use client';

import { useState, useEffect } from 'react';

/**
 * Hook para detectar si el componente ya se montó en el cliente.
 * Útil para evitar Hydration Mismatch en elementos dependientes del navegador o reloj local.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
