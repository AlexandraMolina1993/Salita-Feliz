// En app/dashboard/enfermeros/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Search, Edit, Trash2, Eye, UserCheck, Award, Calendar } from 'lucide-react'
import Link from 'next/link'
import { getNurses, deleteNurse } from '@/lib/database'
import { type Nurse } from '@/lib/supabase'
import { NursesDetailsModal } from '@/components/nurses-details-modal'

export default function EnfermerosPage() {
  const [nurses, setNurses] = useState<Nurse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    title: string
    description: string
    nurses: Nurse[]
    type: 'total' | 'activos' | 'inactivos'
  }>({
    isOpen: false,
    title: '',
    description: '',
    nurses: [],
    type: 'total',
  })

  useEffect(() => {
    loadNurses()
  }, [])

  const loadNurses = async () => {
    try {
      const data = await getNurses()
      setNurses(data)
    } catch (error) {
      console.error('Error loading nurses:', error)
    } finally {
      setLoading(false)
    }
  }

  // Se corrige el tipo del parámetro 'id' a 'string', que es el tipo del ID de Supabase.
  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres dejar Inactivo este enfermero?')) {
      try {
        await deleteNurse(id)
        await loadNurses()
      } catch (error) {
        console.error('Error deleting nurse:', error)
      }
    }
  }

  // Se corrigen los nombres de las propiedades para que coincidan con la interfaz Nurse.
  const filteredNurses = nurses.filter(nurse => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const nurseFullName = nurse.full_name ?? '';
    const nurseLicenseNumber = nurse.license_number ?? '';
    const nurseSpecialty = nurse.specialty ?? '';

    return (
      nurseFullName.toLowerCase().includes(lowerCaseSearchTerm) ||
      nurseLicenseNumber.includes(searchTerm) ||
      nurseSpecialty.toLowerCase().includes(lowerCaseSearchTerm)
    );
  });

  // La función ahora recibe un booleano, ya que 'is_active' es de tipo boolean.
  const getStatusBadge = (is_active: boolean | undefined) => {
    if (is_active === undefined) {
      return <Badge variant="secondary">N/A</Badge>;
    }
    return is_active ? (
      <Badge className="status-badge status-active">Activo</Badge>
    ) : (
      <Badge className="status-badge status-inactive">Inactivo</Badge>
    );
  };

  const getTurnoBadge = (turno: string | null | undefined) => {
    if (!turno || typeof turno !== 'string' || turno.length === 0) {
      return <Badge variant="secondary" className="bg-gray-500 text-white">N/A</Badge>; 
    }

    const colors = {
      'mañana': 'bg-gradient-to-r from-yellow-400 to-orange-500',
      'tarde': 'bg-gradient-to-r from-orange-400 to-red-500',
      'noche': 'bg-gradient-to-r from-purple-400 to-indigo-500'
    };

    const lowerCaseTurno = turno.toLowerCase();

    return (
      <Badge className={`${colors[lowerCaseTurno as keyof typeof colors] || 'bg-gray-500'} text-white`}>
        {lowerCaseTurno.charAt(0).toUpperCase() + lowerCaseTurno.slice(1)}
      </Badge>
    );
  };

  const openModal = (
    title: string,
    description: string,
    nursesList: Nurse[],
    type: 'total' | 'activos' | 'inactivos'
  ) => {
    setModalState({ isOpen: true, title, description, nurses: nursesList, type })
  }

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }

  const openTotalNursesModal = () => {
    openModal("Total de Enfermeros", `Mostrando ${nurses.length} enfermeros registrados`, nurses, "total")
  }

  const openActiveNursesModal = () => {
    const activeNurses = nurses.filter(n => n.is_active === true)
    openModal("Enfermeros Activos", `Mostrando ${activeNurses.length} enfermeros con estado 'activo'`, activeNurses, "activos")
  }

  const openInactiveNursesModal = () => {
    const inactiveNurses = nurses.filter(n => n.is_active === false)
    openModal("Enfermeros Inactivos", `Mostrando ${inactiveNurses.length} enfermeros con estado 'inactivo'`, inactiveNurses, "inactivos")
  }

const openSpecialtiesModal = () => {
    // Correctly filters nurses with a specialty
    const nursesWithSpecialty = nurses.filter(n => n.specialty !== null)
}

  const activeNurses = nurses.filter(n => n.is_active === true)
  const inactiveNurses = nurses.filter(n => n.is_active === false)
  const uniqueSpecialtiesCount = new Set(nurses.map(n => n.specialty)).size

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in-up">
        {/* Código del estado de carga... */}
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-slide-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
            <UserCheck className="h-10 w-10 text-blue-600" />
            Enfermeros
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Gestiona el personal de enfermería del centro
          </p>
        </div>
        <Link href="/dashboard/enfermeros/nuevo">
          <Button className="modern-button flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Enfermero
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="modern-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Buscar enfermeros por nombre, matricula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg border-2 focus:border-blue-500 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Clickeables */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card
          className="modern-card gradient-primary text-white clickable-card"
          onClick={openTotalNursesModal}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Enfermeros</p>
                <p className="text-3xl font-bold">{nurses.length}</p>
              </div>
              <UserCheck className="h-12 w-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="modern-card gradient-success text-white clickable-card"
          onClick={openActiveNursesModal}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Activos</p>
                <p className="text-3xl font-bold">
                  {activeNurses.length}
                </p>
              </div>
              <Award className="h-12 w-12 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="modern-card gradient-warning text-white clickable-card"
          onClick={openInactiveNursesModal}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100">Inactivos</p>
                <p className="text-3xl font-bold">
                  {inactiveNurses.length}
                </p>
              </div>
              <Award className="h-12 w-12 text-yellow-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nurses Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredNurses.map((nurse, index) => (
          <Card key={nurse.id} className="modern-card hover:shadow-2xl transition-all duration-300"
            style={{ animationDelay: `${index * 0.1}s` }}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-800">
                    {nurse.full_name}
                  </CardTitle>
                  <CardDescription className="text-gray-600 font-medium">
                    Matrícula: {nurse.license_number}
                  </CardDescription>
                </div>
                {getStatusBadge(nurse.is_active)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                </div>
                {/* Asumiendo que 'phone' existe en tu interfaz */}
                <div className="text-sm text-gray-600">
                  <p><strong>Email:</strong> {nurse.email}</p>
                  <p><strong>Teléfono:</strong> {nurse.phone}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Link href={`/dashboard/enfermeros/${nurse.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full hover:bg-blue-50 hover:border-blue-300">
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalles
                  </Button>
                </Link>
                <Link href={`/dashboard/enfermeros/${nurse.id}/editar`}>
                  <Button variant="outline" size="sm" className="hover:bg-green-50 hover:border-green-300">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(nurse.id as string)}
                  className="hover:bg-red-50 hover:border-red-300 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No se encontraron enfermeros */}
      {filteredNurses.length === 0 && (
        <Card className="modern-card">
          <CardContent className="text-center py-12">
            <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron enfermeros</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primer enfermero'}
            </p>
            <Link href="/dashboard/enfermeros/nuevo">
              <Button className="modern-button">
                <Plus className="h-5 w-5 mr-2" />
                Agregar Enfermero
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Renderiza el modal de enfermeros */}
      <NursesDetailsModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
        nurses={modalState.nurses}
        type={modalState.type}
      />
    </div>
  )
}