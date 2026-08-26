"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Calendar, Phone, Mail, MapPin, Heart, User, Shield } from "lucide-react"
import Link from "next/link"
import { getPatientById, activatePatient, deletePatient, getAppointmentsByPatientId } from "@/lib/database"
import type { Patient, Appointment } from "@/lib/database"
import { formatNominalDate } from "@/lib/dateUtils"

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadPatient(params.id as string)
    }
  }, [params.id])

  const loadPatient = async (id: string) => {
    try {
      const [patientData, appointmentsData] = await Promise.all([
        getPatientById(id),
        getAppointmentsByPatientId(id),
      ])
      setPatient(patientData)
      setAppointments(appointmentsData)
    } catch (error) {
      console.error("Error loading patient data:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in-up">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="modern-card loading-shimmer">
            <CardHeader>
              <div className="h-6 bg-gray-300 rounded w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 rounded" />
                <div className="h-4 bg-gray-300 rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-600 mb-4">Paciente no encontrado</h2>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    )
  }

  const age = calculateAge(patient.birth_date)

  return (
    <div className="space-y-8 animate-slide-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold gradient-text">{patient.full_name}</h1>
            <p className="text-muted-foreground">Información detallada del paciente</p>
          </div>
        </div>
        <Link href={`/dashboard/pacientes/${patient.id}/editar`}>
          <Button className="modern-button">
            <Edit className="mr-2 h-4 w-4" />
            Editar Paciente
          </Button>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Información Personal */}
        <Card className="modern-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Nombre Completo</label>
                <p className="text-lg font-semibold">{patient.full_name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">DNI</label>
                <p className="text-lg font-mono">{patient.dni}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Fecha de Nacimiento</label>
                <p suppressHydrationWarning className="text-lg">{formatNominalDate(patient.birth_date)}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">Edad</label>
                <Badge className="text-lg px-3 py-1 bg-gradient-primary text-white">{age} años</Badge>
              </div>
              <div className="space-y-2">
  <label className="text-sm font-medium text-gray-600">Género</label>
  <p className="text-lg">
    {patient.gender === "male"
      ? "Masculino"
      : patient.gender === "female"
      ? "Femenino"
      : "No especificado"}
  </p>
</div>

            </div>
          </CardContent>
        </Card>
        {/* Resumen Rápido */}
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="text-lg">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`text-center p-4 rounded-lg text-white ${
                patient.is_active ? "bg-gradient-primary" : "bg-gray-400"
              }`}
            >
              <User className="h-8 w-8 mx-auto mb-2" />
              <p className="font-semibold">
                {patient.is_active ? "Paciente Activo" : "Paciente Inactivo"}
              </p>
              <p className="text-sm opacity-90">
                {patient.is_active
                  ? "Registrado en el sistema"
                  : "Este paciente está inactivo"}
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Estado:</span>
                <Badge className={patient.is_active ? "status-active" : "status-inactive"}>
                  {patient.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              {/* Botón para eliminar o activar paciente */}
              <div className="flex justify-end">
                {patient.is_active ? (
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await deletePatient(patient.id)
                        await loadPatient(patient.id)
                      } catch (err) {
                        console.error("Error al desactivar paciente", err)
                      }
                    }}
                  >
                    Desactivar Paciente
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={async () => {
                      try {
                        await activatePatient(patient.id)
                        await loadPatient(patient.id)
                      } catch (err) {
                        console.error("Error al activar paciente", err)
                      }
                    }}
                  >
                    Activar Paciente
                  </Button>
                )}
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Registro:</span>
                <span suppressHydrationWarning className="text-sm">
                  {formatNominalDate(patient.created_at)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card className="modern-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Phone className="h-5 w-5 text-green-600" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Teléfono</p>
                  <p className="font-medium">{patient.phone || "No registrado"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{patient.email || "No registrado"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Dirección</p>
                  <p className="font-medium">{patient.address || "No registrada"}</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg mt-4">
              <p className="text-sm text-blue-800">
                <strong>Contacto de Emergencia:</strong>
                <br />
                {patient.emergency_contact || "No registrado"}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Teléfono:</strong>
                <br />
                {patient.emergency_phone || "No registrado"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Médica */}
        <Card className="modern-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Información Médica
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Obra Social</p>
                    <p className="font-medium">{patient.health_insurance || "No registrada"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número de Afiliado</p>
                  <p className="font-medium">{patient.insurance_number || "No registrada"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Heart className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">Grupo Sanguineo</p>
                  <p className="font-medium">{patient.blood_type || "No especificado"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Condiciones Médicas</p>
                <p className="p-3 bg-gray-100 rounded-lg text-sm">{patient.medical_conditions || "No se han registrado condiciones médicas."}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Alergias</p>
                <p className="p-3 bg-gray-100 rounded-lg text-sm">{patient.allergies || "No se han registrado alergias."}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Notas Adicionales</p>
                <p className="p-3 bg-gray-100 rounded-lg text-sm">{patient.notes || "No se han registrado notas."}</p>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Historial de Vacunas */}
<Card className="modern-card">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Calendar className="h-5 w-5 text-orange-600" />
      Historial de Vacunas
    </CardTitle>
  </CardHeader>
  <CardContent>
    {appointments.length > 0 ? (
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="border rounded-lg p-4 bg-gray-50 space-y-2">
            {/* CORREGIDO: Usar el alias 'vacuna' y los campos 'name' y 'manufacturer' */}
            <p className="font-semibold text-lg">
              Vacuna: {appointment.vacuna?.name}
              {appointment.vacuna?.manufacturer && ` - ${appointment.vacuna.manufacturer}`}
            </p>
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span suppressHydrationWarning>
                {formatNominalDate(appointment.appointment_date)}
              </span>
            </div>
            {appointment.notes && (
              <div className="p-3 bg-blue-100 rounded-lg">
                <p className="text-sm font-semibold text-blue-800">Notas:</p>
                <p className="text-sm text-blue-700">{appointment.notes}</p>
              </div>
            )}
          </div>
        ))}
        <Link href={`/dashboard/turnos/nuevo?patientId=${patient.id}`} passHref>
          <Button variant="outline" size="sm" className="w-full mt-4">
            Programar Nuevo Turno
          </Button>
        </Link>
      </div>
    ) : (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">No hay vacunas programadas.</p>
        <Link href={`/dashboard/turnos/nuevo?patientId=${patient.id}`} passHref>
          <Button variant="outline" size="sm">
            Programar Turno
          </Button>
        </Link>
      </div>
    )}
  </CardContent>
</Card>
      </div>
    </div>
  )
}