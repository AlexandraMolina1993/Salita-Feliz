// En app/dashboard/pacientes/page.tsx
'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2, Eye, Users, Heart, Calendar, Phone } from "lucide-react"
import Link from "next/link"
import { getPatients, deletePatient, type Patient } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"
import { PatientDetailsModal } from "@/components/patient-details-modal" // Importa el modal

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  // Estado del modal para los detalles de pacientes
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    title: string
    description: string
    patients: Patient[]
    type: "total" | "minors" | "adults" | "seniors"
  }>({
    isOpen: false,
    title: '',
    description: '',
    patients: [],
    type: "total",
  })

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      const data = await getPatients()
      setPatients(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los pacientes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Quieres dejar Inactivo este paciente?")) {
      try {
        await deletePatient(id)
        await loadPatients()
        toast({
          title: "Paciente Inactivo",
          description: "El paciente ha quedado Inactivo correctamente",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo dejar el paciente Inactivo",
          variant: "destructive",
        })
      }
    }
  }

  const filteredPatients = patients.filter(
    (patient) =>
      patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.dni.includes(searchTerm) ||
      (patient.health_insurance && patient.health_insurance.toLowerCase().includes(searchTerm.toLowerCase())),
  )

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

  // Función para abrir el modal
  const openModal = (
    title: string,
    description: string,
    patientsList: Patient[],
    type: "total" | "minors" | "adults" | "seniors"
  ) => {
    setModalState({
      isOpen: true,
      title,
      description,
      patients: patientsList,
      type,
    })
  }

  // Función para cerrar el modal
  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }

  // Funciones específicas para abrir cada modal
  const openTotalPatientsModal = () => {
    openModal("Total de Pacientes", `Mostrando todos los ${patients.length} pacientes registrados en el sistema`, patients, "total")
  }

  const openMinorsModal = () => {
    const minorPatients = patients.filter((p) => calculateAge(p.birth_date) < 18)
    openModal("Pacientes Menores", `Mostrando ${minorPatients.length} pacientes menores de 18 años`, minorPatients, "minors")
  }

  const openAdultsModal = () => {
    const adultPatients = patients.filter((p) => {
      const age = calculateAge(p.birth_date)
      return age >= 18 && age < 65
    })
    openModal("Pacientes Adultos", `Mostrando ${adultPatients.length} pacientes adultos (18-64 años)`, adultPatients, "adults")
  }

  const openSeniorsModal = () => {
    const seniorPatients = patients.filter((p) => calculateAge(p.birth_date) >= 65)
    openModal("Adultos Mayores", `Mostrando ${seniorPatients.length} pacientes adultos mayores (65+ años)`, seniorPatients, "seniors")
  }

  const getAgeGroup = (age: number) => {
    if (age < 18) return { label: "Menor", color: "bg-gradient-to-r from-blue-400 to-blue-500" }
    if (age < 65) return { label: "Adulto", color: "bg-gradient-to-r from-green-400 to-green-500" }
    return { label: "Mayor", color: "bg-gradient-to-r from-purple-400 to-purple-500" }
  }

  const minorPatients = patients.filter((p) => calculateAge(p.birth_date) < 18)
  const adultPatients = patients.filter((p) => {
    const age = calculateAge(p.birth_date)
    return age >= 18 && age < 65
  })
  const seniorPatients = patients.filter((p) => calculateAge(p.birth_date) >= 65)

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in-up">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold gradient-text">👥 Pacientes</h1>
            <p className="text-muted-foreground mt-2">Gestiona la información de los pacientes</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="modern-card loading-shimmer">
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-300 rounded"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-slide-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
            <Users className="h-10 w-10 text-blue-600" />
            Pacientes
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Gestiona la información e historial de los pacientes</p>
        </div>
        <Link href="/dashboard/pacientes/nuevo">
          <Button className="modern-button flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Paciente
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="modern-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Buscar pacientes por nombre, DNI u obra social..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg border-2 focus:border-blue-500 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Clickeables */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="modern-card gradient-primary text-white clickable-card" onClick={openTotalPatientsModal}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Pacientes</p>
                <p className="text-3xl font-bold">{patients.length}</p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card gradient-success text-white clickable-card" onClick={openMinorsModal}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Menores</p>
                <p className="text-3xl font-bold">{minorPatients.length}</p>
              </div>
              <Heart className="h-12 w-12 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card gradient-warning text-white clickable-card" onClick={openAdultsModal}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100">Adultos</p>
                <p className="text-3xl font-bold">{adultPatients.length}</p>
              </div>
              <Users className="h-12 w-12 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card bg-gradient-to-r from-red-500 to-red-800 text-white clickable-card" onClick={openSeniorsModal}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Adultos Mayores</p>
                <p className="text-3xl font-bold">{seniorPatients.length}</p>
              </div>
              <Calendar className="h-12 w-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPatients.map((patient, index) => {
          const age = calculateAge(patient.birth_date)
          const ageGroup = getAgeGroup(age)

          return (
            <Card
              key={patient.id}
              className="modern-card hover:shadow-2xl transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-800">{patient.full_name}</CardTitle>
                    <CardDescription className="text-gray-600 font-medium">DNI: {patient.dni}</CardDescription>
                  </div>
                  <Badge className={`${ageGroup.color} text-white`}>
                    {age} años - {ageGroup.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600">{patient.phone || "Sin teléfono"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-700">{patient.health_insurance || "Sin obra social"}</span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>Email:</strong> {patient.email || "Sin email"}
                    </p>
                    <p>
                      <strong>Dirección:</strong> {patient.address || "Sin dirección"}
                    </p>
                  </div>

                  {patient.emergency_contact && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <strong>Contacto de emergencia:</strong>
                      <br />
                      {patient.emergency_contact}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Link href={`/dashboard/pacientes/${patient.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full hover:bg-blue-50 hover:border-blue-300 bg-transparent"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalles
                    </Button>
                  </Link>
                  <Link href={`/dashboard/pacientes/${patient.id}/editar`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-green-50 hover:border-green-300 bg-transparent"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(patient.id!)}
                    className="hover:bg-red-50 hover:border-red-300 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredPatients.length === 0 && (
        <Card className="modern-card">
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron pacientes</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? "Intenta con otros términos de búsqueda" : "Comienza agregando tu primer paciente"}
            </p>
            <Link href="/dashboard/pacientes/nuevo">
              <Button className="modern-button">
                <Plus className="h-5 w-5 mr-2" />
                Agregar Paciente
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Modal de detalles de pacientes */}
      <PatientDetailsModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
        patients={modalState.patients}
        type={modalState.type}
      />
    </div>
  )
}