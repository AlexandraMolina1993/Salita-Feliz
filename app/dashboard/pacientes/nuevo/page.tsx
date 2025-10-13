"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save } from "lucide-react"
import { createPatient, type Patient } from "@/lib/database"

export default function NewPatientPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Estados para los selects controlados
  const [gender, setGender] = useState<string | undefined>(undefined)
  const [bloodType, setBloodType] = useState<string | undefined>(undefined)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)

    const patientData: Omit<Patient, "id" | "created_at" | "updated_at"> = {
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
console.log("Obra social ingresada:", formData.get("health-insurance"))
console.log("Paciente que se va a guardar:", patientData)

    try {
      await createPatient(patientData)
      toast({
        title: "Paciente registrado",
        description: "El paciente ha sido registrado correctamente",
      })
      router.push("/dashboard/pacientes")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el paciente",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard/pacientes")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nuevo Paciente</h1>
            <p className="text-muted-foreground">
              Registre un nuevo paciente en el sistema
            </p>
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
                <Input
                  id="name"
                  name="name"
                  placeholder="Ingrese el nombre completo"
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI</Label>
                  <Input id="dni" name="dni" placeholder="Ingrese el DNI" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth-date">Fecha de Nacimiento</Label>
                  <Input id="birth-date" name="birth-date" type="date" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Género</Label>
                <Select
                  name="gender"
                  onValueChange={(value) => setGender(value)}
                  value={gender}
                >
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
                <Textarea
                  id="address"
                  name="address"
                  placeholder="Ingrese la dirección completa"
                />
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
                <Input
                  id="phone"
                  name="phone"
                  placeholder="Ingrese el número de teléfono"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Ingrese el email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency-contact">Contacto de Emergencia</Label>
                <Input
                  id="emergency-contact"
                  name="emergency-contact"
                  placeholder="Nombre del contacto de emergencia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency-phone">Teléfono de Emergencia</Label>
                <Input
                  id="emergency-phone"
                  name="emergency-phone"
                  placeholder="Teléfono del contacto de emergencia"
                />
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
                <Select
                  name="blood-type"
                  onValueChange={(value) => setBloodType(value)}
                  value={bloodType}
                >
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
                <Textarea
                  id="allergies"
                  name="allergies"
                  placeholder="Ingrese las alergias conocidas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medical-conditions">Condiciones Médicas</Label>
                <Textarea
                  id="medical-conditions"
                  name="medical-conditions"
                  placeholder="Ingrese condiciones médicas relevantes"
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
                <Input
                  id="health-insurance"
                  name="health-insurance"
                  placeholder="Ingrese la obra social"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurance-number">Número de Afiliado</Label>
                <Input
                  id="insurance-number"
                  name="insurance-number"
                  placeholder="Ingrese el número de afiliado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Ingrese notas adicionales"
                  className="min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/pacientes")}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Guardando..." : "Guardar Paciente"}
          </Button>
        </div>
      </form>
    </div>
  )
}
