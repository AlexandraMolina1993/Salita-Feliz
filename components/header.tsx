"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "@/contexts/ThemeContext" // 🎯 Importamos tu contexto global
import { NotificationBell } from "@/components/notification-bell"
import { LogOut, Moon, Sun } from "lucide-react"
import { logout, getCurrentUser } from "@/lib/auth"

export function Header() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string>('')
  
  // 🎯 Consumimos el estado del tema global
  const { isDarkMode, setDarkMode } = useTheme()

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

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    /* 🎨 CAMBIADO: bg-white por bg-card y colores bordes adaptables a Shadcn */
    <header className="bg-card border-b border-border px-6 py-4 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {/* Se actualiza basado en la página actual */}
          </h1>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* 🔔 CAMPANITA DE NOTIFICACIONES DEL SISTEMA */}
          <NotificationBell />

          {/* 🌗 BOTÓN TOGGLE DE MODO OSCURO (Añadido al lado del perfil) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!isDarkMode)}
            className="text-muted-foreground hover:text-foreground rounded-xl"
            title={isDarkMode ? "Activar Modo Claro" : "Activar Modo Oscuro"}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-amber-500 animate-fade-in" />
            ) : (
              <Moon className="h-5 w-5 text-slate-700 animate-fade-in" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Avatar" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {userEmail?.charAt(0).toUpperCase() || "A"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card border-border text-foreground" align="end" forceMount>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}