"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, CalendarIcon, Save } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
  getPatients,
  getNurses,
  getVaccines,
  createAppointment,
  type Patient,
  type Nurse,
  type Vaccine,
  type Appointment,
} from "@/lib/database"

export default function NewAppointmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientIdFromUrl = searchParams.get("patientId")
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [date, setDate] = useState<Date>()
  const [patients, setPatients] = useState<Patient[]>([])
  const [nurses, setNurses] = useState<Nurse[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [selectedPatient, setSelectedPatient] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [patientsData, nursesData, vaccinesData] = await Promise.all([
          getPatients(),
          getNurses(),
          getVaccines(),
        ])
        setPatients(patientsData)
        setNurses(nursesData.filter((n) => n.is_active))
        setVaccines(vaccinesData.filter((v) => v.stock_quantity > 0))

        if (patientIdFromUrl) {
          setSelectedPatient(patientIdFromUrl)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          variant: "destructive",
        })
      }
    }
    loadInitialData()
  }, [patientIdFromUrl])

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
    
    // --- LÍNEA CORREGIDA ---
    // Usamos `format` para obtener la fecha local en formato "yyyy-MM-dd"
    const localDateString = format(date, "yyyy-MM-dd");
    // ------------------------

    const appointmentData: Omit<Appointment, "id" | "created_at" | "updated_at"> = {
      patient_id: formData.get("patient") as string,
      nurse_id: (formData.get("nurse") as string) || undefined,
      vaccine_id: formData.get("vaccine") as string,
      appointment_date: localDateString, // Usamos la fecha local corregida
      appointment_time: formData.get("time") as string,
      status: "scheduled",
      notes: formData.get("notes") as string,
    }

    try {
      await createAppointment(appointmentData)
      toast({
        title: "Turno programado",
        description: "El turno ha sido programado correctamente",
      })
      router.push("/dashboard/turnos")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo programar el turno",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPatients = patients.filter(
    (patient) => patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || patient.dni.includes(searchTerm),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/turnos")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nuevo Turno</h1>
            <p className="text-muted-foreground">Programe un nuevo turno de vacunación</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información del Paciente</CardTitle>
              <CardDescription>Seleccione el paciente para el turno</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient-search">Buscar Paciente</Label>
                <Input
                  id="patient-search"
                  placeholder="Buscar por nombre o DNI"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient">Paciente Seleccionado</Label>
                <Select name="patient" value={selectedPatient} onValueChange={setSelectedPatient} required>
                  <SelectTrigger id="patient">
                    <SelectValue placeholder="Seleccione un paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPatients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id!}>
                        {patient.full_name} - DNI: {patient.dni}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPatient && (
                <div className="rounded-md border p-3 bg-muted/50">
                  <p className="text-sm">
                    <strong>Paciente:</strong> {patients.find((p) => p.id === selectedPatient)?.full_name}
                  </p>
                  <p className="text-sm">
                    <strong>Teléfono:</strong>{" "}
                    {patients.find((p) => p.id === selectedPatient)?.phone || "No registrado"}
                  </p>
                </div>
              )}
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
                <Select name="time" required>
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
                <Select name="vaccine" required>
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
                <Label htmlFor="nurse">Enfermero (Opcional)</Label>
                <Select name="nurse">
                  <SelectTrigger id="nurse">
                    <SelectValue placeholder="Seleccione un enfermero" />
                  </SelectTrigger>
                  <SelectContent>
                    {nurses.map((nurse) => (
                      <SelectItem key={nurse.id} value={nurse.id!}>
                        {nurse.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea id="notes" name="notes" placeholder="Ingrese notas adicionales" />
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
            {isLoading ? "Guardando..." : "Programar Turno"}
          </Button>
        </div>
      </form>
    </div>
  )
}