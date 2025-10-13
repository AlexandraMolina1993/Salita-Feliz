//app/dashboard/vacunas/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2, Eye, Syringe, AlertTriangle, Package, Calendar } from "lucide-react"
import Link from "next/link"
import { getVaccines, deleteVaccine, getVaccineStats, type Vaccine } from "@/lib/database"
import { VaccineDetailsModal } from "@/components/vaccine-details-modal"
import { VaccineTypeModal } from "@/components/vaccine-type-modal";

export default function VacunasPage() {
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [vaccineStats, setVaccineStats] = useState({
    total: 0,
    lowStock: 0,
    expiringSoon: 0,
    expired: 0,
    lowStockVaccines: [] as Vaccine[],
    expiringSoonVaccines: [] as Vaccine[],
    expiredVaccines: [] as Vaccine[],
    typeVaccines: [] as Vaccine[],
  })

  // Modal states
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "total" as "total" | "lowStock" | "expiringSoon" | "expired",
    vaccines: [] as Vaccine[],
    title: "",
    description: "",
  })
// [NUEVO] Estado para el Modal de Tipos de Vacuna
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
    // Usaremos 'null' para indicar que estamos creando, no editando.
    const [currentVaccineType, setCurrentVaccineType] = useState(null)
  useEffect(() => {
    loadVaccines()
    loadVaccineStats()
  }, [])

  const loadVaccines = async () => {
    try {
      const data = await getVaccines()
      setVaccines(data)
    } catch (error) {
      console.error("Error loading vaccines:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadVaccineStats = async () => {
    try {
      const stats = await getVaccineStats()
      setVaccineStats(stats)
    } catch (error) {
      console.error("Error loading vaccine stats:", error)
    }
  }


  const openModal = (type: "total" | "lowStock" | "expiringSoon" | "expired") => {
    let modalVaccines: Vaccine[] = []
    let title = ""
    let description = ""

    switch (type) {
      case "total":
        modalVaccines = vaccines
        title = `Total de Vacunas (${vaccineStats.total})`
        description = "Listado completo de todas las vacunas registradas en el sistema"
        break
      case "lowStock":
        modalVaccines = vaccineStats.lowStockVaccines
        title = `Vacunas con Stock Bajo (${vaccineStats.lowStock})`
        description = "Vacunas que requieren reposición urgente por estar por debajo del stock mínimo"
        break
      case "expiringSoon":
        modalVaccines = vaccineStats.expiringSoonVaccines
        title = `Vacunas Por Vencer (${vaccineStats.expiringSoon})`
        description = "Vacunas que vencen en los próximos 30 días"
        break
      case "expired":
        modalVaccines = vaccineStats.expiredVaccines
        title = `Vacunas Vencidas (${vaccineStats.expired})`
        description = "Vacunas que ya han superado su fecha de vencimiento"
        break
      
    }

    setModalState({
      isOpen: true,
      type,
      vaccines: modalVaccines,
      title,
      description,
    })
  }

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }
 // [NUEVO] Funciones para el Modal de Tipos
    const openTypeModal = () => {
        setCurrentVaccineType(null) // Para asegurar que está en modo CREAR
        setIsTypeModalOpen(true)
    }

    const handleTypeSaved = () => {
        // Al guardar un tipo, es bueno refrescar las estadísticas para reflejar el cambio
        loadVaccineStats() 
        // Si el listado de vacunas también depende del tipo, podrías recargar loadVaccines() aquí.
    }
  const filteredVaccines = vaccines.filter(
    (vaccine) =>
      vaccine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaccine.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaccine.lot_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaccine.type?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStockStatus = (stock: number, stockMinimo: number) => {
    if (stock === 0) {
      return <Badge className="status-badge status-inactive">Sin Stock</Badge>
    } else if (stock <= stockMinimo) {
      return <Badge className="status-badge status-pending">Stock Bajo</Badge>
    } else {
      return <Badge className="status-badge status-active">Disponible</Badge>
    }
  }

  const isExpiringSoon = (fechaVencimiento: string) => {
    const today = new Date()
    const expDate = new Date(fechaVencimiento)
    const diffTime = expDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 30 && diffDays > 0
  }

  const isExpired = (fechaVencimiento: string) => {
    const today = new Date()
    const expDate = new Date(fechaVencimiento)
    return expDate < today
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in-up">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold gradient-text">💉 Vacunas</h1>
            <p className="text-muted-foreground mt-2">Gestiona el inventario de vacunas</p>
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
            <Syringe className="h-10 w-10 text-blue-600" />
            Vacunas
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Controla el inventario y stock de vacunas</p>
        </div>
        <Link href="/dashboard/vacunas/nueva">
          <Button className="modern-button flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nueva Vacuna
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="modern-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Buscar vacunas por nombre, laboratorio, lote o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg border-2 focus:border-blue-500 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Clickeable */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="modern-card gradient-primary text-white clickable-card" onClick={() => openModal("total")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Vacunas</p>
                <p className="text-3xl font-bold">{vaccineStats.total}</p>
              </div>
              <Package className="h-12 w-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card gradient-warning text-white clickable-card" onClick={() => openModal("lowStock")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100">Stock Bajo</p>
                <p className="text-3xl font-bold">{vaccineStats.lowStock}</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="modern-card gradient-secondary text-white clickable-card"
          onClick={() => openModal("expiringSoon")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Por Vencer</p>
                <p className="text-3xl font-bold">{vaccineStats.expiringSoon}</p>
              </div>
              <Calendar className="h-12 w-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="modern-card bg-gradient-to-r from-red-500 to-red-600 text-white clickable-card"
          onClick={() => openModal("expired")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100">Vencidas</p>
                <p className="text-3xl font-bold">{vaccineStats.expired}</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Vaccines Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredVaccines.map((vaccine, index) => (
          <Card
            key={vaccine.id}
            className="modern-card hover:shadow-2xl transition-all duration-300"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-800">{vaccine.name}</CardTitle>
                  <CardDescription className="text-gray-600 font-medium">{vaccine.manufacturer}</CardDescription>
                </div>
                {getStockStatus(vaccine.stock_quantity, vaccine.min_stock_level)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stock:</span>
                  <span
                    className={`font-bold ${vaccine.stock_quantity <= vaccine.min_stock_level ? "text-red-600" : "text-green-600"}`}
                  >
                    {vaccine.stock_quantity} unidades
                  </span>
                </div>

                {vaccine.price && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Precio:</span>
                    <span className="font-bold text-blue-600">${vaccine.price}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Lote:</span>
                  <span className="font-mono text-sm">{vaccine.lot_number}</span>
                </div>

                {vaccine.expiration_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Vencimiento:</span>
                    <span
                      className={`text-sm font-medium ${
                        isExpired(vaccine.expiration_date)
                          ? "text-red-600"
                          : isExpiringSoon(vaccine.expiration_date)
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {new Date(vaccine.expiration_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  <Badge variant="outline" className="text-xs">
                    {vaccine.type}
                  </Badge>
                </div>

                {vaccine.expiration_date &&
                  (isExpired(vaccine.expiration_date) || isExpiringSoon(vaccine.expiration_date)) && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs text-yellow-800">
                        {isExpired(vaccine.expiration_date) ? "Vacuna vencida" : "Vence pronto"}
                      </span>
                    </div>
                  )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Link href={`/dashboard/vacunas/${vaccine.id}`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full hover:bg-blue-50 hover:border-blue-300 bg-transparent"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalles
                  </Button>
                </Link>
                <Link href={`/dashboard/vacunas/${vaccine.id}/editar`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-green-50 hover:border-green-300 bg-transparent"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVaccines.length === 0 && (
        <Card className="modern-card">
          <CardContent className="text-center py-12">
            <Syringe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No se encontraron vacunas</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? "Intenta con otros términos de búsqueda" : "Comienza agregando tu primera vacuna"}
            </p>
            <Link href="/dashboard/vacunas/nueva">
              <Button className="modern-button">
                <Plus className="h-5 w-5 mr-2" />
                Agregar Vacuna
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Modal de detalles */}
      <VaccineDetailsModal
        vaccines={modalState.vaccines}
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
        type={modalState.type}
      />
    </div>
  )
}
