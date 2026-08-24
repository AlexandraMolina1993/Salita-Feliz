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
    let isMounted = true

    const checkAuth = async () => {
      try {
        // Rutas públicas que no requieren verificación
        if (pathname === '/login' || pathname.startsWith('/register') || pathname.startsWith('/auth')) {
          if (isMounted) {
            setIsAuth(true)
            setIsLoading(false)
          }
          return
        }

        const authenticated = await isAuthenticated()
        if (isMounted) {
          setIsAuth(authenticated)
          if (!authenticated) {
            router.push("/login")
          }
        }
      } catch (err) {
        console.error("[AuthGuard] Error al verificar autenticación:", err)
        if (isMounted) {
          setIsAuth(false)
          router.push("/login")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [pathname, router])

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