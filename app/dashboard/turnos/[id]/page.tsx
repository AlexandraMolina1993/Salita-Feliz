"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Edit,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Package,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { getAppointmentById, updateAppointmentStatus, type Appointment } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"

export default function AppointmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadAppointment(params.id as string)
    }
  }, [params.id])

  const loadAppointment = async (id: string) => {
    try {
      const data = await getAppointmentById(id)
      setAppointment(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el turno",
        variant: "destructive",
      })
      router.push("/dashboard/turnos")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!appointment?.id) return

    try {
      await updateAppointmentStatus(appointment.id, newStatus)
      setAppointment({ ...appointment, status: newStatus })
      toast({
        title: "Estado actualizado",
        description: `El turno ha sido marcado como ${newStatus === "completed" ? "completado" : newStatus === "cancelled" ? "cancelado" : newStatus}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del turno",
        variant: "destructive",
      })
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Turno no encontrado</h2>
        <p className="text-muted-foreground mb-6">El turno que busca no existe o ha sido eliminado.</p>
        <Button onClick={() => router.push("/dashboard/turnos")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Turnos
        </Button>
      </div>
    )
  }

  const statusInfo = getStatusInfo(appointment.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/turnos")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detalles del Turno</h1>
            <p className="text-muted-foreground">
              Turno de {appointment.patients?.full_name} - {appointment.appointment_date}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/turnos/${appointment.id}/editar`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          {appointment.status === "scheduled" && (
            <Button onClick={() => handleStatusChange("completed")} className="medical-gradient">
              <CheckCircle className="mr-2 h-4 w-4" />
              Marcar Completado
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Información Principal */}
        <Card className="md:col-span-2 card-hover">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${statusInfo.bg} ${statusInfo.border} border`}>
                  <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
                </div>
                <div>
                  <CardTitle className="text-xl">Turno de Vacunación</CardTitle>
                  <CardDescription>
                    {new Date(appointment.appointment_date).toLocaleDateString("es-AR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardDescription>
                </div>
              </div>
              <Badge className={`${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {statusInfo.text}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Información del Paciente */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <User className="mr-2 h-5 w-5 text-primary" />
                Información del Paciente
              </h3>
              <div className="flex items-center space-x-4 p-4 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={`/placeholder.svg?height=48&width=48`} alt={appointment.patients?.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {appointment.patients?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{appointment.patients?.full_name}</p>
                  <p className="text-sm text-muted-foreground">DNI: {appointment.patients?.dni}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/pacientes/${appointment.patient_id}`}>Ver Perfil</Link>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Información de la Vacuna */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <Package className="mr-2 h-5 w-5 text-green-500" />
                Vacuna a Aplicar
              </h3>
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-800">{appointment.vaccines?.name}</p>
                    <p className="text-sm text-green-600">Vacuna programada para este turno</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/vacunas/${appointment.vaccine_id}`}>Ver Detalles</Link>
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Información del Enfermero */}
            {appointment.nurses && (
              <>
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center">
                    <Stethoscope className="mr-2 h-5 w-5 text-blue-500" />
                    Enfermero Asignado
                  </h3>
                  <div className="flex items-center space-x-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`/placeholder.svg?height=48&width=48`} alt={appointment.nurses.full_name} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {appointment.nurses.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-blue-800">{appointment.nurses.full_name}</p>
                      <p className="text-sm text-blue-600">Enfermero especializado</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/enfermeros/${appointment.nurse_id}`}>Ver Perfil</Link>
                    </Button>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Notas */}
            {appointment.notes && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-purple-500" />
                  Notas del Turno
                </h3>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="text-purple-700">{appointment.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel Lateral */}
        <div className="space-y-6">
          {/* Información de Fecha y Hora */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-primary" />
                Fecha y Hora
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                <Calendar className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="font-bold text-primary">
                  {new Date(appointment.appointment_date).toLocaleDateString("es-AR")}
                </p>
                <p className="text-sm text-muted-foreground">Fecha del turno</p>
              </div>

              <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                <Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <p className="font-bold text-blue-600">{appointment.appointment_time}</p>
                <p className="text-sm text-blue-800">Hora programada</p>
              </div>
            </CardContent>
          </Card>

          {/* Acciones del Turno */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>Acciones del Turno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointment.status === "scheduled" && (
                <>
                  <Button
                    onClick={() => handleStatusChange("completed")}
                    className="w-full justify-start medical-gradient"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Marcar como Completado
                  </Button>
                  <Button
                    onClick={() => handleStatusChange("cancelled")}
                    variant="outline"
                    className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar Turno
                  </Button>
                </>
              )}

              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href={`/dashboard/turnos/${appointment.id}/editar`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Turno
                </Link>
              </Button>

              <Button variant="outline" className="w-full justify-start bg-transparent">
                <FileText className="mr-2 h-4 w-4" />
                Generar Comprobante
              </Button>
            </CardContent>
          </Card>

          {/* Información Adicional */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>Información Adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creado:</span>
                  <span>
                    {appointment.created_at ? new Date(appointment.created_at).toLocaleDateString("es-AR") : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actualizado:</span>
                  <span>
                    {appointment.updated_at ? new Date(appointment.updated_at).toLocaleDateString("es-AR") : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
