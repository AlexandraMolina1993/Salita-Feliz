"use client" //app>dashboard>pacientes>{id}>editar>page.tsx

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { getPatientById, updatePatient, type Patient } from "@/lib/database"

function formatLocalDate(dateStr: string) {
  const date = new Date(dateStr)
  const offsetMs = date.getTimezoneOffset() * 60000
  const localDate = new Date(date.getTime() + offsetMs)
  return localDate.toISOString().split("T")[0]
}

export default function EditPatientPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<Patient | null>(null)

  useEffect(() => {
    if (params.id) {
      loadPatient(params.id as string)
    }
  }, [params.id])

  const loadPatient = async (id: string) => {
    try {
      const data = await getPatientById(id)
      setPatient(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el paciente",
        variant: "destructive",
      })
      router.push("/dashboard/pacientes")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)

    const patientData: Partial<Patient> = {
      full_name: formData.get("name") as string,
      dni: formData.get("dni") as string,
      birth_date: formData.get("birth-date") as string,
      gender: formData.get("gender") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      emergency_contact: formData.get("emergency-contact") as string,
      emergency_phone: formData.get("emergency-phone") as string,
      blood_type: formData.get("blood-type") as string,
      allergies: formData.get("allergies") as string,
      medical_conditions: formData.get("medical-conditions") as string,
      health_insurance: formData.get("health-insurance") as string,
      insurance_number: formData.get("insurance-number") as string,
      notes: formData.get("notes") as string,
    }

    try {
      await updatePatient(params.id as string, patientData)
      toast({
        title: "Paciente actualizado",
        description: "Los datos del paciente han sido actualizados correctamente",
      })
      router.push("/dashboard/pacientes")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el paciente",
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

  if (!patient) {
    return (
      <div className="text-center">
        <p>Paciente no encontrado</p>
        <Button onClick={() => router.push("/dashboard/pacientes")}>Volver a Pacientes</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/pacientes")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editar Paciente</h1>
            <p className="text-muted-foreground">Modificar los datos de {patient.full_name}</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Datos Personales</CardTitle>
              <CardDescription>Información básica del paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" name="name" defaultValue={patient.full_name} required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI</Label>
                  <Input id="dni" name="dni" defaultValue={patient.dni} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth-date">Fecha de Nacimiento</Label>
                  <Input id="birth-date" name="birth-date" type="date" defaultValue={formatLocalDate(patient.birth_date)}required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Género</Label>
                <Select name="gender" defaultValue={patient.gender || ""}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Seleccione el género" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Textarea id="address" name="address" defaultValue={patient.address || ""} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
              <CardDescription>Datos de contacto del paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" defaultValue={patient.phone || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={patient.email || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency-contact">Contacto de Emergencia</Label>
                <Input id="emergency-contact" name="emergency-contact" defaultValue={patient.emergency_contact || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency-phone">Teléfono de Emergencia</Label>
                <Input id="emergency-phone" name="emergency-phone" defaultValue={patient.emergency_phone || ""} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Información Médica</CardTitle>
              <CardDescription>Datos médicos relevantes del paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blood-type">Grupo Sanguíneo</Label>
                <Select name="blood-type" defaultValue={patient.blood_type || ""}>
                  <SelectTrigger id="blood-type">
                    <SelectValue placeholder="Seleccione el grupo sanguíneo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a+">A+</SelectItem>
                    <SelectItem value="a-">A-</SelectItem>
                    <SelectItem value="b+">B+</SelectItem>
                    <SelectItem value="b-">B-</SelectItem>
                    <SelectItem value="ab+">AB+</SelectItem>
                    <SelectItem value="ab-">AB-</SelectItem>
                    <SelectItem value="o+">O+</SelectItem>
                    <SelectItem value="o-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">Alergias</Label>
                <Textarea id="allergies" name="allergies" defaultValue={patient.allergies || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medical-conditions">Condiciones Médicas</Label>
                <Textarea
                  id="medical-conditions"
                  name="medical-conditions"
                  defaultValue={patient.medical_conditions || ""}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Información Adicional</CardTitle>
              <CardDescription>Otros datos relevantes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="health-insurance">Obra Social</Label>
                <Input id="health-insurance" name="health-insurance" defaultValue={patient.health_insurance || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance-number">Número de Afiliado</Label>
                <Input id="insurance-number" name="insurance-number" defaultValue={patient.insurance_number || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea id="notes" name="notes" defaultValue={patient.notes || ""} className="min-h-[120px]" />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/pacientes")} disabled={isLoading}>
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
