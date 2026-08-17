//app/dashboard/turnos/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, CheckCircle, XCircle, CalendarClock, ShieldCheck, Trash2 } from "lucide-react"
import Link from "next/link"
import { getAppointments, type Appointment } from "@/lib/database"
import { cancelAppointmentAction, deleteAppointmentAction } from "@/app/actions/appointments"
import { CompleteAppointmentDialog } from "@/components/complete-appointment-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { formatFullSpanishDate, formatNominalTime } from "@/lib/dateUtils"

export default function TurnosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null)
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const data = await getAppointments()
      setAppointments(data || [])
    } catch (error) {
      console.error("Error al cargar turnos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los turnos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCompleteDialog = (appointment: any) => {
    setSelectedAppointment(appointment)
    setIsCompleteDialogOpen(true)
  }

  const handleOpenDeleteDialog = (appointment: Appointment) => {
    setAppointmentToDelete(appointment)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!appointmentToDelete || !appointmentToDelete.id) return

    const idAEliminar = appointmentToDelete.id

    try {
      const res = await deleteAppointmentAction(idAEliminar)
      if (!res.success) {
        throw new Error(res.error || "No se pudo eliminar el turno")
      }

      setAppointments((prev) => prev.filter((turno) => turno.id !== idAEliminar))
      toast({
        title: "Turno Eliminado",
        description: "El turno ha sido eliminado correctamente del sistema.",
      })
    } catch (err) {
      console.error("Error al eliminar turno:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo eliminar el turno.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setAppointmentToDelete(null)
    }
  }

  const handleCancelAppointment = async (appointment: any) => {
    if (!appointment || !appointment.id) return

    if (confirm(`¿Estás seguro de que deseas cancelar el turno de ${appointment.patients?.full_name || 'este paciente'}?`)) {
      try {
        const res = await cancelAppointmentAction(appointment.id)
        if (!res.success) {
          throw new Error(res.error || 'Error al cancelar el turno.')
        }

        await loadAppointments()
        toast({ 
          title: "Turno Cancelado", 
          description: "El turno ha sido cancelado correctamente en el sistema." 
        })
      } catch (error) {
        console.error("Error en handleCancelAppointment:", error)
        toast({ 
          title: "Error", 
          description: error instanceof Error ? error.message : "No se pudo cancelar el turno.", 
          variant: "destructive" 
        })
      }
    }
  }

  const filteredAppointments = appointments.filter(
    (appointment) =>
      appointment.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.nurses?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.vaccines?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-medium">Programado</Badge>
      case 'completed':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Completado</Badge>
      case 'cancelled':
        return <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-medium">Cancelado</Badge>
      default:
        return <Badge variant="secondary">Desconocido</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600 animate-pulse">Cargando turnos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-slide-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
            <CalendarClock className="h-10 w-10 text-blue-600" />
            Turnos
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Gestiona los turnos de vacunación y registro de dosis aplicadas
          </p>
        </div>
        <Link href="/dashboard/turnos/nuevo">
          <Button className="modern-button flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Turno
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="modern-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Buscar por paciente, enfermero o vacuna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg border-2 focus:border-blue-500 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Appointments Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAppointments.map((appointment, index) => (
          <Card
            key={appointment.id}
            className="modern-card hover:shadow-2xl transition-all duration-300"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardHeader className="pb-3 flex-row justify-between items-start">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-xl font-bold text-gray-800">
                  {appointment.patients?.full_name || 'Paciente Desconocido'}
                </CardTitle>
                <CardDescription className="text-sm font-medium text-gray-600">
                  <span className="font-semibold text-gray-700">Vacuna:</span> {appointment.vaccines?.name || 'Vacuna Desconocida'}
                </CardDescription>
              </div>
              {getStatusBadge(appointment.status)}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarClock className="h-4 w-4 text-gray-500" />
                  <span>
                    {formatFullSpanishDate(appointment.appointment_date)} a las {formatNominalTime(appointment.appointment_time, true)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>
                    <span className="font-semibold">Aplicador:</span> {appointment.nurses?.full_name || 'Enfermero Desconocido'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {appointment.status === 'scheduled' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCompleteDialog(appointment)} 
                      className="flex-1 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-600 font-semibold"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Completar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelAppointment(appointment)}
                      className="flex-1 hover:bg-rose-50 hover:border-rose-300 text-rose-600"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </>
                )}
                <Link href={`/dashboard/turnos/${appointment.id}/editar`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full hover:bg-yellow-50 hover:border-yellow-300 text-yellow-600 bg-transparent"
                  >
                    Editar
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDeleteDialog(appointment)}
                  className="hover:bg-red-50 hover:border-red-300 text-red-600 hover:text-red-700 px-3"
                  title="Eliminar turno"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:inline-block sm:ml-1">Eliminar</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAppointments.length === 0 && (
        <Card className="modern-card">
          <CardContent className="text-center py-12">
            <CalendarClock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron turnos</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? "Intenta con otros términos de búsqueda" : "Comienza a programar tu primer turno"}
            </p>
            <Link href="/dashboard/turnos/nuevo">
              <Button className="modern-button">
                <Plus className="h-5 w-5 mr-2" />
                Agregar Turno
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Modal de Finalización y Descuento Atómico de Stock */}
      <CompleteAppointmentDialog
        open={isCompleteDialogOpen}
        onOpenChange={setIsCompleteDialogOpen}
        appointment={selectedAppointment}
        onSuccess={loadAppointments}
      />

      {/* Modal de Confirmación de Borrado Lógico */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 text-xl font-bold">
              <Trash2 className="h-5 w-5" />
              ¿Eliminar este turno?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 space-y-2 pt-2 text-sm text-left">
              <span>
                Esta acción realizará un <strong className="text-gray-800">borrado lógico</strong> del turno del paciente{" "}
                <span className="font-semibold text-gray-900">
                  {appointmentToDelete?.patients?.full_name || "Paciente"}
                </span>.
              </span>
              <span className="block mt-2 text-xs text-muted-foreground bg-muted p-2 rounded-md border">
                El turno se ocultará del panel clínico y del historial visual, manteniendo la integridad referencial en la base de datos.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDelete()
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Sí, Ocultar Turno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}