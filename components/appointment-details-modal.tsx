"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react"
import Link from "next/link"
import type { Appointment } from "@/lib/supabase"
import { isTodayInArgentina, formatNominalDate, formatNominalTime } from "@/lib/dateUtils"

interface AppointmentDetailsModalProps {
  appointments: Appointment[]
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  type: "total" | "scheduled" | "completed" | "cancelled" | "today"
}

export function AppointmentDetailsModal({
  appointments,
  isOpen,
  onClose,
  title,
  description,
  type,
}: AppointmentDetailsModalProps) {
  const getStatusInfo = (status?: string) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bg: "bg-green-100",
          border: "border-green-200",
          text: "Completado",
        }
      case "cancelled":
        return {
          icon: XCircle,
          color: "text-red-600",
          bg: "bg-red-100",
          border: "border-red-200",
          text: "Cancelado",
        }
      case "scheduled":
      default:
        return {
          icon: AlertCircle,
          color: "text-blue-600",
          bg: "bg-blue-100",
          border: "border-blue-200",
          text: "Programado",
        }
    }
  }

  const isToday = (fecha: string) => {
    return isTodayInArgentina(fecha)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Calendar className="h-6 w-6" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-base">{description}</DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay turnos en esta categoría</h3>
              <p className="text-gray-500">No se encontraron turnos que coincidan con los criterios seleccionados.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {appointments.map((appointment) => {
                const statusInfo = getStatusInfo(appointment.status)
                const StatusIcon = statusInfo.icon

                return (
                  <Card
                    key={appointment.id}
                    className={`hover:shadow-lg transition-shadow duration-200 ${
                      isToday(appointment.appointment_date) ? "ring-2 ring-blue-500 ring-opacity-50" : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{appointment.patients?.full_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{appointment.vaccines?.name}</p>
                        </div>
                        <Badge className={`${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusInfo.text}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Fecha:</span>
                          <span
                            className={`font-medium ${isToday(appointment.appointment_date) ? "text-blue-600" : ""}`}
                          >
                            {formatNominalDate(appointment.appointment_date)}
                            {isToday(appointment.appointment_date) && (
                              <Badge className="ml-2 text-xs bg-blue-100 text-blue-800">HOY</Badge>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Hora:</span>
                          <span className="font-medium">{formatNominalTime(appointment.appointment_time, true)}</span>
                        </div>

                        {appointment.nurses && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Enfermero:</span>
                            <span className="font-medium text-xs">{appointment.nurses.full_name}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">DNI:</span>
                          <span className="font-mono text-xs">{appointment.patients?.dni}</span>
                        </div>

                        {appointment.notes && (
                          <div className="p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600">
                              <strong>Notas:</strong> {appointment.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t">
                        <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                          <Link href={`/dashboard/turnos/${appointment.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles Completos
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
