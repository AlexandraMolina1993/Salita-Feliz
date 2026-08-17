// ./app/dashboard/configuracion/layout.tsx
'use client'

import * as React from 'react'

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {/* Título y Subtítulo Global */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Administre la configuración del sistema</p>
      </div>

      {/* Contenido directo de la página (General) */}
      <div className="w-full">
        {children}
      </div>
    </div>
  )
}