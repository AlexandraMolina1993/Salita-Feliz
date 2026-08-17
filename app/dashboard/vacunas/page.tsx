// app/dashboard/vacunas/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit, Trash2, Eye, Syringe, AlertTriangle, Package, Calendar, Droplets, ShieldAlert, Sparkles, RefreshCw } from "lucide-react"
import Link from "next/link"
import { getVaccinesStockAction, getVaccineStatsAction, type ExtendedVaccineItem } from "@/app/actions/vaccines"
import { getVaccines, getVaccineStats, type Vaccine } from "@/lib/database"
import { VaccineDetailsModal } from "@/components/vaccine-details-modal"
import { VaccineTypeModal } from "@/components/vaccine-type-modal"

export default function VacunasPage() {
  const [vaccines, setVaccines] = useState<ExtendedVaccineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [vaccineStats, setVaccineStats] = useState({
    total: 0,
    lowStock: 0,
    expiringSoon: 0,
    expired: 0,
    totalVials: 0,
    totalMl: 0,
    totalAvailableDoses: 0,
    lowStockVaccines: [] as any[],
    expiringSoonVaccines: [] as any[],
    expiredVaccines: [] as any[],
    typeVaccines: [] as any[],
  })

  // Modal states
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "total" as "total" | "lowStock" | "expiringSoon" | "expired",
    vaccines: [] as any[],
    title: "",
    description: "",
  })

  // Estado para el Modal de Tipos de Vacuna
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [currentVaccineType, setCurrentVaccineType] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([loadVaccinesList(), loadVaccineStatsData()])
    } catch (error) {
      console.error("Error al cargar vacunas:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([loadVaccinesList(), loadVaccineStatsData()])
    } finally {
      setIsRefreshing(false)
    }
  }

  const loadVaccinesList = async () => {
    try {
      // 1. Intentar Server Action exclusivo de la vista v_vaccines_stock
      const data = await getVaccinesStockAction()
      if (data && data.length > 0) {
        setVaccines(data)
        return
      }
    } catch (err) {
      console.warn("getVaccinesStockAction falló, usando fallback local:", err)
    }

    try {
      // Fallback a getVaccines()
      const fallbackData = await getVaccines()
      setVaccines(fallbackData as any[])
    } catch (error) {
      console.error("Error loading vaccines:", error)
    }
  }

  const loadVaccineStatsData = async () => {
    try {
      const stats = await getVaccineStatsAction()
      if (stats) {
        setVaccineStats(stats as any)
        return
      }
    } catch (err) {
      console.warn("getVaccineStatsAction falló, usando fallback local:", err)
    }

    try {
      const fallbackStats = await getVaccineStats()
      setVaccineStats((prev) => ({ ...prev, ...(fallbackStats as any) }))
    } catch (error) {
      console.error("Error loading vaccine stats:", error)
    }
  }

  const openModal = (type: "total" | "lowStock" | "expiringSoon" | "expired") => {
    let modalVaccines: any[] = []
    let title = ""
    let description = ""

    switch (type) {
      case "total":
        modalVaccines = vaccines
        title = `Total de Vacunas (${vaccineStats.total})`
        description = "Listado completo de todas las vacunas registradas en el libro mayor de inventario"
        break
      case "lowStock":
        modalVaccines = vaccineStats.lowStockVaccines
        title = `Vacunas con Stock Bajo (${vaccineStats.lowStock})`
        description = "Vacunas que requieren reposición urgente por estar por debajo del umbral mínimo de viales"
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

  const filteredVaccines = vaccines.filter((vaccine) => {
    const term = searchTerm.toLowerCase()
    const name = vaccine.name?.toLowerCase() || ""
    const lab = (vaccine.laboratory || vaccine.manufacturer || "").toLowerCase()
    const lot = vaccine.lot_number?.toLowerCase() || ""
    const type = vaccine.type?.toLowerCase() || ""
    return name.includes(term) || lab.includes(term) || lot.includes(term) || type.includes(term)
  })

  const getStockStatusBadge = (vaccine: ExtendedVaccineItem) => {
    const vials = Number(vaccine.physical_vials ?? vaccine.stock_quantity ?? 0)
    const min = Number(vaccine.min_stock_level || 10)
    const status = vaccine.stock_status

    if (status === "OUT_OF_STOCK" || vials <= 0) {
      return <Badge className="status-badge bg-rose-500/15 text-rose-700 border-rose-200">Sin Stock</Badge>
    } else if (status === "CRITICAL_LOW" || vials <= min) {
      return <Badge className="status-badge bg-amber-500/15 text-amber-700 border-amber-200">Stock Bajo</Badge>
    } else {
      return <Badge className="status-badge bg-emerald-500/15 text-emerald-700 border-emerald-200">Disponible</Badge>
    }
  }

  const isExpiringSoon = (fechaVencimiento?: string | null) => {
    if (!fechaVencimiento) return false
    const today = new Date()
    const expDate = new Date(fechaVencimiento)
    const diffTime = expDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 30 && diffDays > 0
  }

  const isExpired = (fechaVencimiento?: string | null) => {
    if (!fechaVencimiento) return false
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
            <p className="text-muted-foreground mt-2">Cargando inventario consolidado de la vista v_vaccines_stock...</p>
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
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
              Ledger v_vaccines_stock Activo
            </span>
          </div>
          <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
            <Syringe className="h-10 w-10 text-blue-600" />
            Inventario de Vacunas
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Control en tiempo real de viales físicos, volumen clínico en ml y dosis proyectadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            Sincronizar
          </Button>
          <Link href="/dashboard/vacunas/nueva">
            <Button className="modern-button flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nueva Vacuna
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards - Clickeable */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="modern-card gradient-primary text-white clickable-card" onClick={() => openModal("total")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Vacunas</p>
                <p className="text-3xl font-bold">{vaccineStats.total}</p>
                <p className="text-xs text-blue-200 mt-1">
                  {vaccineStats.totalVials || vaccines.reduce((acc, v) => acc + (v.physical_vials || 0), 0)} viales físicos
                </p>
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
                <p className="text-xs text-yellow-200 mt-1">Por debajo del umbral mín.</p>
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
                <p className="text-xs text-purple-200 mt-1">En los próximos 30 días</p>
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
                <p className="text-xs text-red-200 mt-1">Requieren descarte clínico</p>
              </div>
              <ShieldAlert className="h-12 w-12 text-red-200" />
            </div>
          </CardContent>
        </Card>
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

      {/* Vaccines Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredVaccines.map((vaccine, index) => {
          const physicalVials = Number(vaccine.physical_vials ?? vaccine.stock_quantity ?? 0)
          const availableDoses = Number(vaccine.available_doses_for_clinic ?? 0)
          const totalMl = Number(vaccine.total_ml ?? vaccine.current_stock_ml ?? 0)
          const isLow = physicalVials <= (vaccine.min_stock_level || 10)

          return (
            <Card
              key={vaccine.id || vaccine.vaccine_id}
              className="modern-card hover:shadow-2xl transition-all duration-300 border border-slate-200/80 bg-white"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-800 tracking-tight">
                      {vaccine.name}
                    </CardTitle>
                    <CardDescription className="text-slate-600 font-medium mt-0.5">
                      {vaccine.laboratory || vaccine.manufacturer || "Laboratorio General"}
                    </CardDescription>
                  </div>
                  {getStockStatusBadge(vaccine)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  {/* Stock Físico (Viales) */}
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-indigo-500" />
                      Viales Físicos:
                    </span>
                    <span className={`font-black text-base ${isLow ? "text-red-600" : "text-emerald-700"}`}>
                      {physicalVials} viales
                    </span>
                  </div>

                  {/* Dosis Clínicas y Volumen ml */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-blue-50/70 border border-blue-100 p-2 rounded-lg">
                      <p className="text-slate-500 font-medium">Dosis Clínicas</p>
                      <p className="text-sm font-bold text-blue-700">{availableDoses} dosis</p>
                    </div>
                    <div className="bg-sky-50/70 border border-sky-100 p-2 rounded-lg">
                      <p className="text-slate-500 font-medium">Volumen Total</p>
                      <p className="text-sm font-bold text-sky-700">{totalMl.toFixed(1)} ml</p>
                    </div>
                  </div>

                  {/* Dosis / Contenido */}
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <span>Dosis por Turno: <strong>{vaccine.dose_amount} ml</strong></span>
                    <span>Envase: <strong>{vaccine.net_content || 5.0} ml</strong></span>
                  </div>

                  {vaccine.price && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Precio Ref.:</span>
                      <span className="font-bold text-blue-600">${vaccine.price}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Lote:</span>
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {vaccine.lot_number || "LOTE-GENERAL"}
                    </span>
                  </div>

                  {vaccine.expiration_date && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Vencimiento:</span>
                      <span
                        className={`font-semibold ${
                          isExpired(vaccine.expiration_date)
                            ? "text-red-600"
                            : isExpiringSoon(vaccine.expiration_date)
                              ? "text-yellow-600"
                              : "text-green-700"
                        }`}
                      >
                        {new Date(vaccine.expiration_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="pt-1">
                    <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-600 font-normal">
                      {vaccine.type || "General"}
                    </Badge>
                  </div>

                  {vaccine.expiration_date &&
                    (isExpired(vaccine.expiration_date) || isExpiringSoon(vaccine.expiration_date)) && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200/60">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                        <span className="text-xs text-yellow-800 font-medium">
                          {isExpired(vaccine.expiration_date) ? "Vacuna vencida - No aplicar" : "Vence en menos de 30 días"}
                        </span>
                      </div>
                    )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <Link href={`/dashboard/vacunas/${vaccine.id || vaccine.vaccine_id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full hover:bg-blue-50 hover:border-blue-300 text-slate-700 bg-white"
                    >
                      <Eye className="h-4 w-4 mr-1 text-blue-600" />
                      Ver Detalles
                    </Button>
                  </Link>
                  <Link href={`/dashboard/vacunas/${vaccine.id || vaccine.vaccine_id}/editar`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-green-50 hover:border-green-300 text-slate-700 bg-white"
                    >
                      <Edit className="h-4 w-4 text-emerald-600" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
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

