'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link' // Importamos Link para la navegación
import { LogOut, User, Settings } from 'lucide-react'

// Importaciones de tus componentes de UI
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useState, useEffect } from 'react'
import { logout, getCurrentUser } from '@/lib/auth'

export function UserNav() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string>('admin@salitafeliz.com')

  useEffect(() => {
    let isMounted = true
    getCurrentUser().then((u) => {
      if (isMounted && u?.email) {
        setUserEmail(u.email)
      }
    }).catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  const userRole = userEmail === "admin@salitafeliz.com" ? "Administrador" : "Usuario"
  const userInitial = userRole.charAt(0)

  // Cierre de sesión (Funcional)
  const handleLogout = async () => {
    await logout()
    router.push('/login') 
  }

  // Configuración (Inactivo)
  const handleInactiveClick = (item: string) => {
    alert(`La funcionalidad de "${item}" está en desarrollo.`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* El círculo que activa el menú */}
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
            <Avatar className="h-8 w-8 bg-primary/10">
                <AvatarFallback className="text-primary text-sm font-semibold">
                    {userInitial}
                </AvatarFallback>
            </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        {/* Identidad del Administrador */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userRole}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          
          {/* PERFIL - ¡NAVEGACIÓN COMPLETAMENTE FUNCIONAL! */}
          <DropdownMenuItem 
            asChild // Usa Link como el elemento hijo
          >
            <Link href="/dashboard/profile" className="flex items-center cursor-pointer"> 
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </Link>
          </DropdownMenuItem>
          
          {/* CONFIGURACIÓN - Inactivo */}
          <DropdownMenuItem 
            onClick={() => handleInactiveClick('Configuración')}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Configuración</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        {/* CERRAR SESIÓN - Funcional */}
        <DropdownMenuItem 
          onClick={handleLogout} 
          className="cursor-pointer text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}