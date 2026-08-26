"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Heart, Calendar, Phone, Mail, MapPin, Eye, AlertCircle, Plus } from "lucide-react"
import Link from "next/link"
import type { Patient } from "@/lib/supabase"
import { formatNominalDate, parseLocalDate } from "@/lib/dateUtils"

interface PatientDetailsModalProps {
  patients: Patient[]
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  type: "total" | "minors" | "adults" | "seniors"
}

export function PatientDetailsModal({ patients, isOpen, onClose, title, description, type }: PatientDetailsModalProps) {
  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = parseLocalDate(birthDate)
    if (!birth) return 0
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const getAgeGroup = (age: number) => {
    if (age < 18) return { label: "Menor", color: "bg-blue-100 text-blue-800 border-blue-200" }
    if (age < 65) return { label: "Adulto", color: "bg-green-100 text-green-800 border-green-200" }
    return { label: "Mayor", color: "bg-purple-100 text-purple-800 border-purple-200" }
  }

  const getModalHeaderColor = (type: string) => {
    switch (type) {
      case "total":
        return "text-blue-600"
      case "minors":
        return "text-cyan-600"
      case "adults":
        return "text-green-600"
      case "seniors":
        return "text-purple-600"
      default:
        return "text-gray-600"
    }
  }

  const getModalIcon = (type: string) => {
    switch (type) {
      case "minors":
        return <Heart className="h-6 w-6" />
      case "adults":
        return <Users className="h-6 w-6" />
      case "seniors":
        return <Calendar className="h-6 w-6" />
      default:
        return <Users className="h-6 w-6" />
    }
  }

  // Estadísticas adicionales
  const patientsWithInsurance = patients.filter((p) => p.health_insurance).length
  const patientsWithPhone = patients.filter((p) => p.phone).length
  const patientsWithEmail = patients.filter((p) => p.email).length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className={`flex items-center gap-3 text-3xl font-bold ${getModalHeaderColor(type)}`}>
            {getModalIcon(type)}
            {title}
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-600">{description}</DialogDescription>
        </DialogHeader>

        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{patients.length}</div>
            <div className="text-sm text-blue-800">Total</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{patientsWithInsurance}</div>
            <div className="text-sm text-green-800">Con Obra Social</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{patientsWithPhone}</div>
            <div className="text-sm text-purple-800">Con Teléfono</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">{patientsWithEmail}</div>
            <div className="text-sm text-orange-800">Con Email</div>
          </div>
        </div>

        <div className="mt-6">
          {patients.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay pacientes en esta categoría</h3>
              <p className="text-gray-500">
                No se encontraron pacientes que coincidan con los criterios seleccionados.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {patients.map((patient) => {
                const age = calculateAge(patient.birth_date)
                const ageGroup = getAgeGroup(age)

                return (
                  <Card
                    key={patient.id}
                    className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-gray-800">{patient.full_name}</CardTitle>
                          <p className="text-sm text-gray-500 font-medium">DNI: {patient.dni}</p>
                        </div>
                        <Badge className={`${ageGroup.color} border`}>{age} años</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-blue-500" />
                          <span className="text-gray-600">Teléfono:</span>
                          <span className="font-medium text-gray-800">{patient.phone || "No registrado"}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-green-500" />
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium text-gray-800 text-xs">{patient.email || "No registrado"}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span className="text-gray-600">Obra Social:</span>
                          <span className="font-medium text-gray-800">
                            {patient.health_insurance || "No registrada"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-purple-500" />
                          <span className="text-gray-600">Nacimiento:</span>
                          <span suppressHydrationWarning className="font-medium text-gray-800 text-xs">
                            {formatNominalDate(patient.birth_date)}
                          </span>
                        </div>

                        {patient.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-orange-500 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-gray-600">Dirección:</span>
                              <p className="font-medium text-gray-800 text-xs">{patient.address}</p>
                            </div>
                          </div>
                        )}

                        {patient.emergency_contact && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-800">
                              <strong className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Contacto de emergencia:
                              </strong>
                              <span className="mt-1 block">{patient.emergency_contact}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t flex gap-2">
                        <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent hover:bg-blue-50">
                          <Link href={`/dashboard/pacientes/${patient.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Perfil
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="bg-transparent hover:bg-green-50">
                          <Link href={`/dashboard/pacientes/${patient.id}/editar`}>Editar</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="text-sm text-gray-500">
            Mostrando {patients.length} paciente{patients.length !== 1 ? "s" : ""}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/pacientes/nuevo">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Paciente
              </Link>
            </Button>
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
