// app/dashboard/layout.tsx
import type React from "react"
import { AuthGuard } from "@/components/auth-guard"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      {/* 🌌 CAMBIADO: bg-gray-50 por bg-background text-foreground + transición suave */}
      <div className="flex h-screen bg-background text-foreground transition-colors duration-300">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          {/* 🌌 CAMBIADO: bg-background para el panel donde renderizan las páginas */}
          <main className="flex-1 overflow-y-auto p-6 bg-background custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}