"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Syringe,
  Calendar,
  QrCode,
  BarChart3,
  Bell,
  Settings,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const navigation = [
  { name: "Panel de Control", href: "/dashboard", icon: LayoutDashboard },
  { name: "Perfil", href: "/dashboard/profile", icon: Users },
  { name: "Pacientes", href: "/dashboard/pacientes", icon: Users },
  { name: "Enfermeros", href: "/dashboard/enfermeros", icon: UserCheck },
  { name: "Vacunas", href: "/dashboard/vacunas", icon: Syringe },
  { name: "Turnos", href: "/dashboard/turnos", icon: Calendar },
  { name: "Reportes", href: "/dashboard/reportes", icon: BarChart3 },
  { name: "Notificaciones", href: "/dashboard/notificaciones", icon: Bell },
  { name: "Configuración", href: "/dashboard/configuracion", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">Salita Feliz</h1>
                <p className="text-xs text-gray-600">Sistema de Gestión</p>
              </div>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="p-1.5">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-gray-500")} />
                {!collapsed && <span className="font-medium">{item.name}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {!collapsed && (
          <div className="text-center text-xs text-gray-500">
            <p>&copy; 2025 Salita Feliz</p>
            <p>Versión 2.0</p>
          </div>
        )}
      </div>
    </div>
  )
}
