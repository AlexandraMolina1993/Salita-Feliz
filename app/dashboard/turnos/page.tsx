'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, CheckCircle, XCircle, CalendarClock } from "lucide-react"
import Link from "next/link"
import { getAppointments, updateAppointmentStatus, type Appointment } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function TurnosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const data = await getAppointments()
      setAppointments(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los turnos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const action = newStatus === 'completed' ? 'completar' : 'cancelar';
    if (confirm(`¿Estás seguro de que quieres ${action} este turno?`)) {
      try {
        await updateAppointmentStatus(id, newStatus)
        await loadAppointments()
        toast({
          title: `Turno ${newStatus === 'completed' ? 'Completado' : 'Cancelado'}`,
          description: `El turno ha sido ${newStatus === 'completed' ? 'completado' : 'cancelado'} correctamente.`,
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado del turno",
          variant: "destructive",
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
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Programado</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Completado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600 animate-pulse">Cargando turnos...</p>
      </div>
    );
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
            Gestiona los turnos de vacunación
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
                    {format(new Date(appointment.appointment_date), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es })} a las {appointment.appointment_time?.substring(0, 5)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>
                    <span className="font-semibold">Aplicador:</span> {appointment.nurses?.full_name || 'Enfermero Desconocido'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {appointment.status === 'scheduled' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusUpdate(appointment.id!, 'completed')}
                      className="flex-1 hover:bg-green-50 hover:border-green-300 text-green-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Completar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusUpdate(appointment.id!, 'cancelled')}
                      className="flex-1 hover:bg-red-50 hover:border-red-300 text-red-600"
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
    </div>
  )
}