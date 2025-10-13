"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, CalendarIcon, Save, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  getAppointmentById,
  updateAppointment,
  getPatients,
  getNurses,
  getVaccines,
  type Appointment,
  type Patient,
  type Nurse,
  type Vaccine,
} from "@/lib/database"

export default function EditAppointmentPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [date, setDate] = useState<Date>()
  const [patients, setPatients] = useState<Patient[]>([])
  const [nurses, setNurses] = useState<Nurse[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])

  useEffect(() => {
    if (params.id) {
      loadData(params.id as string)
    }
  }, [params.id])

  const loadData = async (id: string) => {
    try {
      const [appointmentData, patientsData, nursesData, vaccinesData] = await Promise.all([
        getAppointmentById(id),
        getPatients(),
        getNurses(),
        getVaccines(),
      ])

      setAppointment(appointmentData)
      setPatients(patientsData)
      setNurses(nursesData.filter((n) => n.is_active))
      setVaccines(vaccinesData.filter((v) => v.stock_quantity > 0))

      // Establecer la fecha del turno
      if (appointmentData.appointment_date) {
        setDate(new Date(appointmentData.appointment_date))
      }
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)

    if (!date) {
      toast({
        title: "Error",
        description: "Debe seleccionar una fecha",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    const appointmentData: Partial<Appointment> = {
      patient_id: formData.get("patient") as string,
      nurse_id: (formData.get("nurse") as string) || undefined,
      vaccine_id: formData.get("vaccine") as string,
      appointment_date: date.toISOString().split("T")[0],
      appointment_time: formData.get("time") as string,
      status: formData.get("status") as string,
      notes: formData.get("notes") as string,
    }

    try {
      await updateAppointment(params.id as string, appointmentData)
      toast({
        title: "Turno actualizado",
        description: "El turno ha sido actualizado correctamente",
      })
      router.push("/dashboard/turnos")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el turno",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="text-center">
        <p>Turno no encontrado</p>
        <Button onClick={() => router.push("/dashboard/turnos")}>Volver a Turnos</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/turnos")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editar Turno</h1>
            <p className="text-muted-foreground">Modificar el turno de {appointment.patients?.full_name}</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información del Paciente</CardTitle>
              <CardDescription>Datos del paciente para el turno</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Paciente</Label>
                <Select name="patient" defaultValue={appointment.patient_id} required>
                  <SelectTrigger id="patient">
                    <SelectValue placeholder="Seleccione un paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id!}>
                        {patient.full_name} - DNI: {patient.dni}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Turno</CardTitle>
              <CardDescription>Configure la fecha, hora y tipo de vacuna</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: es }) : "Seleccione una fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Select name="time" defaultValue={appointment.appointment_time} required>
                  <SelectTrigger id="time">
                    <SelectValue placeholder="Seleccione una hora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">09:00</SelectItem>
                    <SelectItem value="09:30">09:30</SelectItem>
                    <SelectItem value="10:00">10:00</SelectItem>
                    <SelectItem value="10:30">10:30</SelectItem>
                    <SelectItem value="11:00">11:00</SelectItem>
                    <SelectItem value="11:30">11:30</SelectItem>
                    <SelectItem value="12:00">12:00</SelectItem>
                    <SelectItem value="12:30">12:30</SelectItem>
                    <SelectItem value="15:00">15:00</SelectItem>
                    <SelectItem value="15:30">15:30</SelectItem>
                    <SelectItem value="16:00">16:00</SelectItem>
                    <SelectItem value="16:30">16:30</SelectItem>
                    <SelectItem value="17:00">17:00</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vaccine">Vacuna</Label>
                <Select name="vaccine" defaultValue={appointment.vaccine_id} required>
                  <SelectTrigger id="vaccine">
                    <SelectValue placeholder="Seleccione una vacuna" />
                  </SelectTrigger>
                  <SelectContent>
                    {vaccines.map((vaccine) => (
                      <SelectItem key={vaccine.id} value={vaccine.id!}>
                        {vaccine.name} (Stock: {vaccine.stock_quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nurse">Enfermero</Label>
                <Select name="nurse" defaultValue={appointment.nurse_id || ""}>
                  <SelectTrigger id="nurse">
                    <SelectValue placeholder="Seleccione un enfermero" />
                  </SelectTrigger>
                  <SelectContent>
                    {nurses.map((nurse) => (
                      <SelectItem key={nurse.id} value={nurse.id!}>
                        {nurse.full_name} - {nurse.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select name="status" defaultValue={appointment.status || "scheduled"}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Seleccione el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Programado</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea id="notes" name="notes" defaultValue={appointment.notes || ""} />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/turnos")} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}
