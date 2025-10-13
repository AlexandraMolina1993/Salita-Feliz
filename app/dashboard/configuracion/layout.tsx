// ./app/dashboard/configuracion/layout.tsx
'use client'

import * as React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter, usePathname } from 'next/navigation'
// Se elimina: import { useThemeSync } from '@/hooks/use-theme-sync'; // No se necesita aquí

// Mapeamos las sub-rutas a los valores de las pestañas
const configTabs = [
  { value: 'general', label: 'General' },
  { value: 'users', label: 'Usuarios' },
  { value: 'notifications', label: 'Notificaciones' },
]

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  
  // 1. Lógica para determinar la pestaña activa
  // Ejemplo: /dashboard/configuracion/users -> ['dashboard', 'configuracion', 'users']
  const pathSegments = pathname.split('/')
  const activeSegment = pathSegments[pathSegments.length - 1] // Esto será 'users'

  // 2. Encuentra la pestaña activa, si no encuentra ninguna (ej. si la ruta es /configuracion), usa 'general'
  const activeTab = configTabs.find(tab => tab.value === activeSegment)?.value || 'general'

  // 3. Maneja el cambio de pestaña usando el Router de Next.js
  const handleTabChange = (value: string) => {
    router.push(`/dashboard/configuracion/${value}`)
  }

  return (
    <div className="space-y-6">
      {/* Título y Subtítulo */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Administre la configuración del sistema</p>
      </div>

      {/* Menú de Pestañas */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          {configTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      
      {/* Contenido de la Sub-ruta */}
      {children}
    </div>
  )
}