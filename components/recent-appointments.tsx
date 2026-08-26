"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getAppointments, type Appointment } from "@/lib/database"
import { formatNominalDate, formatNominalTime } from "@/lib/dateUtils"

export function RecentAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      const data = await getAppointments()
      setAppointments(data.slice(0, 5)) // Solo los últimos 5
    } catch (error) {
      console.error("Error loading appointments:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="status-badge status-active">Completado</Badge>
      case "scheduled":
        return <Badge className="status-badge status-pending">Programado</Badge>
      case "cancelled":
        return <Badge className="status-badge status-inactive">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 animate-pulse">
            <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {appointments.map((appointment) => (
        <div key={appointment.id} className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
              {appointment.patients?.full_name?.charAt(0) || "P"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">{appointment.patients?.full_name || "Paciente"}</p>
            <p suppressHydrationWarning className="text-sm text-muted-foreground">
              {appointment.vaccines?.name || "Vacuna"} - {formatNominalDate(appointment.appointment_date)}
            </p>
          </div>
          <div className="text-right">
            {getStatusBadge(appointment.status)}
            <p suppressHydrationWarning className="text-xs text-muted-foreground mt-1">{formatNominalTime(appointment.appointment_time, true)}</p>
          </div>
        </div>
      ))}
      {appointments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay turnos recientes</p>
        </div>
      )}
    </div>
  )
}
