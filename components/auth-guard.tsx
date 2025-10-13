// app/components/auth-guard.tsx
"use client"

import type React from "react"
import { useEffect, useState } from "react"
// Importar usePathname junto con useRouter
import { useRouter, usePathname } from "next/navigation" 
import { isAuthenticated } from "@/lib/auth"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const router = useRouter()
  // 🚨 CORRECCIÓN: Inicializar pathname aquí
  const pathname = usePathname() 

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      setIsAuth(authenticated)

      if (!authenticated) {
        // Redirigir si no está autenticado
        router.push("/login")
      } else {
        setIsLoading(false)
      }
    }

    // Ejecutar la autenticación solo si no estamos en /login
    // y solo una vez al montar, a menos que el pathname cambie.
    if (pathname !== '/login') {
        checkAuth()
    } else {
        setIsLoading(false)
    }

  }, [pathname]) // Usamos [pathname] para que se re-ejecute si la ruta cambia

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) {
    return null
  }

  return <>{children}</>
}