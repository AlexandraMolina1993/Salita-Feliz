//app/turnos/nuevo/page.tsx
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
import { formatDateToISO, getArgentinaTodayDateString } from "@/lib/dateUtils"
import { cn } from "@/lib/utils"
import {
  getPatients,
  getNurses,
  type Patient,
  type Nurse,
  type Appointment,
} from "@/lib/database"
import { getVaccinesStockAction, type ExtendedVaccineItem } from "@/app/actions/vaccines"
import { createAppointmentAction } from "@/app/actions/appointments"

export default function NewAppointmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientIdFromUrl = searchParams.get("patientId")
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [date, setDate] = useState<Date>()
  const [patients, setPatients] = useState<Patient[]>([])
  const [nurses, setNurses] = useState<Nurse[]>([])
  const [vaccines, setVaccines] = useState<ExtendedVaccineItem[]>([])
  const [selectedPatient, setSelectedPatient] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [doseToApply, setDoseToApply] = useState<number>(0.5); // Valor inicial predeterminado

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [patientsData, nursesData, allVaccinesData] = await Promise.all([
          getPatients(),
          getNurses(),
          getVaccinesStockAction(),
        ])
        setPatients(patientsData)
        setNurses(nursesData.filter((n) => n.is_active))
        
        // Filtrar exclusivamente vacunas activas, con stock real disponible en clínica Y no vencidas
        const todayISO = getArgentinaTodayDateString();
        const clinicallyAvailable = allVaccinesData.filter(
          (v) => (v.available_doses_for_clinic ?? 0) > 0 &&
                 v.is_active !== false &&
                 (!v.expiration_date || v.expiration_date >= todayISO)
        );
        setVaccines(clinicallyAvailable)

        if (patientIdFromUrl) {
          setSelectedPatient(patientIdFromUrl)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del inventario y turnos",
          variant: "destructive",
        })
      }
    }
    loadInitialData()
  }, [patientIdFromUrl, toast])

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
    
    // Normalización de fecha sin desfasaje horario
    const localDateString = formatDateToISO(date);

    try {
      const result = await createAppointmentAction({
        patient_id: formData.get("patient") as string,
        nurse_id: (formData.get("nurse") as string) || undefined,
        vaccine_id: formData.get("vaccine") as string,
        appointment_date: localDateString,
        appointment_time: formData.get("time") as string,
        dose_to_apply: parseFloat(formData.get("dose") as string) || doseToApply,
        status: "scheduled",
        notes: (formData.get("notes") as string) || "",
      });

      if (!result.success) {
        throw new Error(result.error || "No se pudo programar el turno");
      }

      toast({
        title: "Turno programado",
        description: "El turno ha sido programado correctamente",
      })
      router.push("/dashboard/turnos")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo programar el turno",
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
                    <SelectItem value="08:00">08:00</SelectItem>
                    <SelectItem value="08:30">08:30</SelectItem>
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
                <Select 
                  name="vaccine" 
                  required
                  onValueChange={(val) => {
                    const sel = vaccines.find((v) => (v.id === val || v.vaccine_id === val));
                    if (sel?.dose_amount) {
                      setDoseToApply(Number(sel.dose_amount));
                    }
                  }}
                >
                  <SelectTrigger id="vaccine">
                    <SelectValue placeholder="Seleccione una vacuna" />
                  </SelectTrigger>
                  <SelectContent>
                    {vaccines.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No hay vacunas con stock disponible
                      </SelectItem>
                    ) : (
                      vaccines.map((vaccine) => {
                        const vId = (vaccine.id || vaccine.vaccine_id)!;
                        return (
                          <SelectItem key={vId} value={vId}>
                            {vaccine.name} ({vaccine.available_doses_for_clinic} dosis disp. • {vaccine.physical_vials} viales)
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
  <Label htmlFor="dose">Dosis a aplicar (ml)</Label>
  <Input
    id="dose"
    name="dose"
    type="number"
    step="0.1"
    min="0.1"
    value={doseToApply}
    onChange={(e) => setDoseToApply(parseFloat(e.target.value))}
    required
  />
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
          <Button variant="outline" type="button" onClick={() => router.push("/dashboard/turnos")} disabled={isLoading}>
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