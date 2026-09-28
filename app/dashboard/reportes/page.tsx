// En app/dashboard/reportes/page.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Download, TrendingUp, TrendingDown, CheckCircle2, ShieldAlert, MapPin, Activity, RefreshCw, Info, Calendar } from "lucide-react"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { Overview } from "@/components/overview"
import { VaccinePieChart } from "@/components/vaccine-pie"
import { VaccineTrendChart } from "@/components/vaccine-trend"
import {
  getVaccinationStatsByMonth,
  getVaccinationDistribution,
  getVaccinationTrend,
  getPatientGenderDistribution,
  getPatientAgeDistribution,
  getVaccinesByNurse,
  getNurseRankings,
  getPatientDistributionByNurse,
  getVaccinesDetailedBreakdownByMonth,
  getPatientDemographicStats,
  type NurseRankingItem
} from "@/lib/database"
import {
  ARGENTINA_PROVINCES,
  getEpidemiologyComparisonData,
  calculateSalitaFelizCoverage,
  type RegionalCoverageItem,
  type LocalCohortCoverage
} from "@/services/epidemiologyService"
import {
  generateVaccinesReportPDF,
  generatePatientsReportPDF,
  generateNursesReportPDF,
  generateEpidemiologyReportPDF
} from "@/lib/pdfReportsGenerator"
import { fetchAdminProfile, getCurrentUser } from "@/lib/auth"

export default function ReportsPage() {
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from(
    new Set([
      (currentYear - 2).toString(),
      (currentYear - 1).toString(),
      currentYear.toString(),
      (currentYear + 1).toString(),
      "2024",
      "2025",
      "2026",
      "2027"
    ])
  ).sort()

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [chartData, setChartData] = useState<any[]>([])
  const [distributionData, setDistributionData] = useState<any[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  const [patientGenderData, setPatientGenderData] = useState<any[]>([])
  const [patientAgeData, setPatientAgeData] = useState<any[]>([])
  
  // Nombres de variables más descriptivos
  const [nurseVaccines, setNurseVaccines] = useState<any[]>([])
  const [nurseRanking, setNurseRanking] = useState<NurseRankingItem[]>([])
  const [patientDistribution, setPatientDistribution] = useState<any[]>([])

  // Estado para la integración de Vigilancia Epidemiológica (NOMIVAC)
  const [selectedProvince, setSelectedProvince] = useState<string>("Córdoba")
  const [epidemiologyData, setEpidemiologyData] = useState<RegionalCoverageItem[]>([])
  const [cachedLocalCoverage, setCachedLocalCoverage] = useState<Record<string, LocalCohortCoverage> | null>(null)
  const [loadingEpidemiology, setLoadingEpidemiology] = useState<boolean>(false)

  // Período de referencia oficial extraído de la base de datos
  const currentSourcePeriod = epidemiologyData.find((item) => item.sourcePeriod)?.sourcePeriod || "Boletín Q3 2026"

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("vaccines")

  // Estado para la exportación de PDFs
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [exportingTab, setExportingTab] = useState<string | null>(null)
  const [userEmitter, setUserEmitter] = useState<string>("Administrador")

  // Referencias para capturar gráficos en alta resolución
  const overviewChartRef = useRef<HTMLDivElement>(null)
  const pieChartRef = useRef<HTMLDivElement>(null)
  const trendChartRef = useRef<HTMLDivElement>(null)
  const ageChartRef = useRef<HTMLDivElement>(null)
  const genderChartRef = useRef<HTMLDivElement>(null)
  const nurseBarChartRef = useRef<HTMLDivElement>(null)
  const nurseRankingRef = useRef<HTMLDivElement>(null)
  const patientDistributionRef = useRef<HTMLDivElement>(null)
  const epidemiologyChartRef = useRef<HTMLDivElement>(null)

  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

  // Cargar perfil del usuario actual para el encabezado formal del PDF
  useEffect(() => {
    let isMounted = true
    fetchAdminProfile()
      .then((profile) => {
        if (isMounted && profile?.name) {
          setUserEmitter(profile.name)
        } else {
          getCurrentUser()
            .then((u) => {
              if (isMounted && u?.email) {
                setUserEmitter(u.email)
              }
            })
            .catch(() => {})
        }
      })
      .catch(() => {
        getCurrentUser()
          .then((u) => {
            if (isMounted && u?.email) {
              setUserEmitter(u.email)
            }
          })
          .catch(() => {})
      })

    return () => {
      isMounted = false
    }
  }, [])

  const loadChartData = async (selectedPeriod: string) => {
    setLoading(true)
    try {
      const [stats, distData, trend, genderData, ageData] = await Promise.all([
        getVaccinationStatsByMonth(parseInt(selectedPeriod)),
        getVaccinationDistribution(),
        getVaccinationTrend(12),
        getPatientGenderDistribution(),
        getPatientAgeDistribution()
      ])

      const initialData = months.map(month => ({ name: month, total: 0 }))
      stats.forEach(item => {
        if (item.month >= 0 && item.month < 12) {
          initialData[item.month].total = item.count
        }
      })
      setChartData(initialData)
      setDistributionData(distData)
      setTrendData(trend)
      setPatientGenderData(genderData)
      setPatientAgeData(ageData)

    } catch (error) {
      console.error("Error al cargar los datos del gráfico:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadNurseData = async () => {
    setLoading(true)
    try {
      const [vaccines, ranking, distribution] = await Promise.all([
        getVaccinesByNurse(),
        getNurseRankings(),
        getPatientDistributionByNurse(),
      ])
      setNurseVaccines(vaccines)
      setNurseRanking(ranking)
      setPatientDistribution(distribution)
    } catch (error) {
      console.error("Error al cargar datos de enfermeros:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadEpidemiologyData = async (provincia: string, forceRefresh = false) => {
    setLoadingEpidemiology(true)
    try {
      let localStats = cachedLocalCoverage
      if (!localStats || forceRefresh) {
        localStats = await calculateSalitaFelizCoverage()
        setCachedLocalCoverage(localStats)
      }
      const data = await getEpidemiologyComparisonData(provincia, localStats)
      setEpidemiologyData(data)
    } catch (error) {
      console.error("Error al cargar datos epidemiológicos:", error)
    } finally {
      setLoadingEpidemiology(false)
    }
  }

  /**
   * Generación y exportación de reportes PDF de alta resolución con formato formal A4
   */
  const handleExportPDF = async (tabName: 'vaccines' | 'patients' | 'nurses' | 'epidemiology') => {
    setIsExporting(true)
    setExportingTab(tabName)
    const toastId = toast.loading(`Generando reporte formal en PDF de alta resolución...`)

    try {
      if (tabName === 'vaccines') {
        const breakdown = await getVaccinesDetailedBreakdownByMonth(parseInt(selectedYear))
        const totalVacunas = chartData.reduce((sum, entry) => sum + entry.total, 0)
        const tipoMasComun = distributionData.length > 0
          ? distributionData.reduce((prev, current) => (prev.value > current.value ? prev : current)).name
          : "N/A"

        await generateVaccinesReportPDF({
          chartElement: overviewChartRef.current,
          year: selectedYear,
          userEmitter,
          totalVacunas,
          tipoMasComun,
          monthlyStats: chartData,
          detailedBreakdown: breakdown
        })
        toast.success(`Reporte de Vacunas (${selectedYear}) generado exitosamente`, { id: toastId })
      } else if (tabName === 'patients') {
        const demographicStats = await getPatientDemographicStats()
        await generatePatientsReportPDF({
          ageChartElement: ageChartRef.current,
          genderChartElement: genderChartRef.current,
          userEmitter,
          demographicStats
        })
        toast.success("Reporte Demográfico de Pacientes generado exitosamente", { id: toastId })
      } else if (tabName === 'nurses') {
        let rankings = nurseRanking
        if (!rankings || rankings.length === 0) {
          rankings = await getNurseRankings()
          setNurseRanking(rankings)
        }
        await generateNursesReportPDF({
          chartElement: nurseBarChartRef.current,
          userEmitter,
          nurseRanking: rankings
        })
        toast.success("Reporte de Personal de Enfermería generado exitosamente", { id: toastId })
      } else if (tabName === 'epidemiology') {
        let epData = epidemiologyData
        if (!epData || epData.length === 0) {
          let localStats = cachedLocalCoverage
          if (!localStats) {
            localStats = await calculateSalitaFelizCoverage()
            setCachedLocalCoverage(localStats)
          }
          epData = await getEpidemiologyComparisonData(selectedProvince, localStats)
          setEpidemiologyData(epData)
        }
        await generateEpidemiologyReportPDF({
          chartElement: epidemiologyChartRef.current,
          selectedProvince,
          userEmitter,
          epidemiologyData: epData,
          sourcePeriod: epData[0]?.sourcePeriod
        })
        toast.success(`Reporte de Vigilancia Epidemiológica (${selectedProvince}) generado exitosamente`, { id: toastId })
      }
    } catch (error) {
      console.error("Error al exportar reporte PDF:", error)
      toast.error("Ocurrió un error al generar el PDF. Por favor, intente nuevamente.", { id: toastId })
    } finally {
      setIsExporting(false)
      setExportingTab(null)
    }
  }

  useEffect(() => {
    loadChartData(selectedYear)
  }, [selectedYear])
  
  // Carga los datos de enfermeros cuando la pestaña cambia a 'nurses'
  useEffect(() => {
    if (activeTab === "nurses") {
      loadNurseData()
    }
  }, [activeTab])

  // Carga los datos epidemiológicos cuando la pestaña cambia a 'epidemiology' o se selecciona otra provincia
  useEffect(() => {
    if (activeTab === "epidemiology") {
      loadEpidemiologyData(selectedProvince)
    }
  }, [activeTab, selectedProvince])

  const GENDER_COLORS = ['#8884d8', '#82ca9d', '#ffc658']
  const NURSE_COLORS = [
    '#3f51b5', '#c51162', '#009688', '#ff9800',
    '#9c27b0', '#ffeb3b', '#03a9f4', '#4caf50',
    '#f44336', '#607d8b', '#e91e63', '#795548', '#2196f3'
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">Visualice estadísticas y genere informes formales en PDF</p>
        </div>
      </div>

      <Tabs defaultValue="vaccines" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="vaccines">Vacunas</TabsTrigger>
          <TabsTrigger value="patients">Pacientes</TabsTrigger>
          <TabsTrigger value="nurses">Enfermeros</TabsTrigger>
          <TabsTrigger value="epidemiology">Epidemiología</TabsTrigger>
        </TabsList>

        {/* 1. PESTAÑA: VACUNAS */}
        <TabsContent value="vaccines" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Vacunas Aplicadas</CardTitle>
                  <CardDescription>Cantidad de vacunas aplicadas por período anual</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={overviewChartRef} className="w-full">
                  {loading ? (
                    <div className="flex justify-center items-center h-[350px]">
                      <p className="text-muted-foreground">Cargando datos...</p>
                    </div>
                  ) : (
                    <Overview data={chartData} />
                  )}
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleExportPDF('vaccines')}
                  disabled={isExporting}
                >
                  {isExporting && exportingTab === 'vaccines' ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin text-teal-600" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Exportar Reporte
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución por Tipo</CardTitle>
                <CardDescription>Porcentaje de vacunas aplicadas por tipo</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div ref={pieChartRef} className="h-[300px] w-full flex items-center justify-center">
                  {loading ? (
                    <p className="text-muted-foreground">Cargando...</p>
                  ) : (
                    <VaccinePieChart data={distributionData} />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Vacunación</CardTitle>
                <CardDescription>Evolución de vacunaciones en el tiempo</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div ref={trendChartRef} className="h-[300px] w-full flex items-center justify-center">
                  {loading ? (
                    <p className="text-muted-foreground">Cargando...</p>
                  ) : (
                    <VaccineTrendChart data={trendData} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. PESTAÑA: PACIENTES (INCLUYE BOTÓN FALTANTE DE EXPORTACIÓN) */}
        <TabsContent value="patients" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Pacientes</CardTitle>
              <CardDescription>Información demográfica, rangos de edad y distribución por género</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col space-y-2">
                  <Label>Distribución por Edad</Label>
                  <div ref={ageChartRef} className="h-[250px] rounded-md border flex items-center justify-center p-2 bg-card">
                    {loading ? (
                      <p className="text-muted-foreground">Cargando...</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={patientAgeData}>
                          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#adfa1d" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Label>Distribución por Género</Label>
                  <div ref={genderChartRef} className="h-[250px] rounded-md border flex items-center justify-center p-2 bg-card">
                    {loading ? (
                      <p className="text-muted-foreground">Cargando...</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={patientGenderData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {patientGenderData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            {/* BOTÓN FALTANTE AGREGADO */}
            <CardFooter className="justify-end border-t pt-4">
              <Button
                variant="outline"
                onClick={() => handleExportPDF('patients')}
                disabled={isExporting}
              >
                {isExporting && exportingTab === 'patients' ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin text-teal-600" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar Reporte
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 3. PESTAÑA: ENFERMEROS */}
        <TabsContent value="nurses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Enfermeros</CardTitle>
              <CardDescription>Información sobre el rendimiento del personal de enfermería y registro asistencial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col space-y-2">
                  <Label>Vacunas Aplicadas por Enfermero</Label>
                  <div ref={nurseBarChartRef} className="h-[250px] rounded-md border flex items-center justify-center p-2 bg-card">
                    {loading ? (
                      <p className="text-muted-foreground">Cargando...</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={nurseVaccines}>
                          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <Label>Distribución de Pacientes por Enfermero</Label>
                  <div ref={patientDistributionRef} className="h-[250px] rounded-md border flex items-center justify-center p-2 bg-card">
                    {loading ? (
                      <p className="text-muted-foreground">Cargando...</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={patientDistribution}
                            dataKey="patients"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {patientDistribution.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={NURSE_COLORS[index % NURSE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <Label>Ranking de Enfermeros</Label>
                <Card className="p-4" ref={nurseRankingRef}>
                  <div className="grid grid-cols-3 font-bold border-b pb-2 text-sm">
                    <span>Enfermero</span>
                    <span className="text-center">Matrícula (M.P.)</span>
                    <span className="text-right">Vacunas Aplicadas</span>
                  </div>
                  {loading ? (
                    <div className="mt-2 text-center text-muted-foreground">Cargando...</div>
                  ) : (
                    nurseRanking.sort((a, b) => b.vaccines - a.vaccines).map((nurse, index) => (
                      <div key={index} className="grid grid-cols-3 py-2 border-b last:border-0 text-sm items-center">
                        <span className="font-medium">{nurse.name}</span>
                        <span className="text-center text-xs text-muted-foreground">
                          {nurse.licenseNumber ? `M.P. ${nurse.licenseNumber}` : "M.P. S/M"}
                        </span>
                        <span className="text-right font-semibold text-teal-600">{nurse.vaccines}</span>
                      </div>
                    ))
                  )}
                </Card>
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t pt-4">
              <Button
                variant="outline"
                onClick={() => handleExportPDF('nurses')}
                disabled={isExporting}
              >
                {isExporting && exportingTab === 'nurses' ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin text-teal-600" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar Reporte
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 4. PESTAÑA: EPIDEMIOLOGÍA NOMIVAC */}
        <TabsContent value="epidemiology" className="mt-6 space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-semibold uppercase tracking-wider">
                    <Activity className="h-3.5 w-3.5" />
                    NOMIVAC • Ministerio de Salud
                  </div>
                  {/* Indicador visual de source_period con Tooltip informativo */}
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium cursor-help hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors">
                          <Calendar className="h-3 w-3" />
                          <span>Período: <strong className="font-semibold">{currentSourcePeriod}</strong></span>
                          <Info className="h-3 w-3 opacity-70" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs text-xs p-2.5 shadow-lg">
                        <p className="font-bold text-teal-600 dark:text-teal-400 mb-0.5">Sincronización Oficial NOMIVAC</p>
                        <p className="text-muted-foreground leading-snug">
                          Tasa oficial de referencia para <strong>{selectedProvince}</strong> correspondiente a <strong>{currentSourcePeriod}</strong> (actualización periódica de estadísticas sanitarias).
                        </p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Vigilancia Epidemiológica: Salita Feliz vs. Promedio Regional (NOMIVAC)
                </CardTitle>
                <CardDescription className="text-sm">
                  Comparación interactiva de tasas de cobertura de vacunación por cohorte etaria respecto a las estadísticas oficiales de las provincias argentinas.
                </CardDescription>
              </div>

              {/* Selector interactivo de Jurisdicción / Provincia */}
              <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg border">
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground whitespace-nowrap">
                  <MapPin className="h-4 w-4 text-teal-600" />
                  <Label htmlFor="province-select" className="cursor-pointer">Provincia:</Label>
                </div>
                <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                  <SelectTrigger id="province-select" className="w-[180px] bg-background font-medium">
                    <SelectValue placeholder="Seleccione provincia" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ARGENTINA_PROVINCES.map((prov) => (
                      <SelectItem key={prov} value={prov}>
                        {prov}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  title="Recalcular con base de datos local"
                  onClick={() => loadEpidemiologyData(selectedProvince, true)}
                  disabled={loadingEpidemiology}
                >
                  <RefreshCw className={`h-4 w-4 text-muted-foreground ${loadingEpidemiology ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-2">
              {loadingEpidemiology ? (
                <div className="flex flex-col justify-center items-center h-[360px] gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Sincronizando métricas locales con el registro NOMIVAC de {selectedProvince}...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Gráfico Agrupado BarChart (Local vs Regional) con referencia para PDF */}
                  <div ref={epidemiologyChartRef} className="h-[360px] w-full rounded-xl border bg-card p-4 shadow-sm">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={epidemiologyData}
                        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                        <XAxis
                          dataKey="vacuna"
                          stroke="#888888"
                          fontSize={13}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          unit="%"
                          domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '0.5rem',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            fontSize: '13px'
                          }}
                          formatter={(value: any, name: any) => [
                            `${value}%`,
                            name === 'local' ? 'Salita Feliz (Local)' : `NOMIVAC ${selectedProvince} (${currentSourcePeriod})`
                          ]}
                          labelStyle={{ fontWeight: 700, marginBottom: '6px' }}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          wrapperStyle={{ paddingBottom: '20px' }}
                          formatter={(value) =>
                            value === 'local'
                              ? 'Salita Feliz (Cobertura Local)'
                              : `Promedio Regional NOMIVAC (${selectedProvince})`
                          }
                        />
                        <Bar
                          dataKey="local"
                          name="local"
                          fill="#0d9488"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={52}
                        />
                        <Bar
                          dataKey="regional"
                          name="regional"
                          fill="#6366f1"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={52}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tarjetas de Insights Dinámicas */}
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-teal-600" />
                      Insights Clínicos y Desempeño vs. {selectedProvince}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      {epidemiologyData.map((item, index) => {
                        const diff = item.difference ?? 0
                        const isAbove = diff > 0
                        const isBelow = diff < 0
                        const diffAbs = Math.abs(diff)

                        return (
                          <Card
                            key={index}
                            className="border shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                                  {item.targetGroup}
                                </span>
                                {isAbove ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 whitespace-nowrap">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    +{diffAbs}% vs {selectedProvince}
                                  </span>
                                ) : isBelow ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 whitespace-nowrap">
                                    <TrendingDown className="h-3.5 w-3.5" />
                                    -{diffAbs}% vs {selectedProvince}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 whitespace-nowrap">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    En paridad
                                  </span>
                                )}
                              </div>
                              <CardTitle className="text-lg font-bold text-foreground mt-1">
                                {item.vacuna}
                              </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4 pb-4">
                              {/* Comparativa Numérica */}
                              <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl border">
                                <div>
                                  <span className="text-[11px] text-muted-foreground font-medium block">
                                    Salita Feliz
                                  </span>
                                  <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
                                    {item.local}%
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                                    {item.vaccinatedPatients ?? 0} de {item.totalTargetPatients ?? 0} pacientes
                                  </span>
                                </div>
                                <div className="border-l pl-3">
                                  <span className="text-[11px] text-muted-foreground font-medium block truncate">
                                    NOMIVAC {selectedProvince}
                                  </span>
                                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                                    {item.regional}%
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block mt-0.5 truncate" title={`Fuente: ${item.sourcePeriod || currentSourcePeriod}`}>
                                    Ref: {item.sourcePeriod || currentSourcePeriod}
                                  </span>
                                </div>
                              </div>

                              {/* Insight descriptivo */}
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {item.insight}
                              </p>
                            </CardContent>

                            <CardFooter className="pt-0 text-[11px] border-t bg-muted/10 py-2.5">
                              {isAbove ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Supera la meta regional en {selectedProvince}
                                </span>
                              ) : isBelow ? (
                                <span className="text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  Oportunidad para activar campaña de captación
                                </span>
                              ) : (
                                <span className="text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Alineado a la media sanitaria de {selectedProvince}
                                </span>
                              )}
                            </CardFooter>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t py-4 px-6 gap-4 bg-muted/20">
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground/90 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  Fuente de datos regionales: Boletines Epidemiológicos Públicos del Ministerio de Salud de la Nación / NOMIVAC (Actualización Manual).
                </p>
                <p className="text-[11px] opacity-80 pl-5">
                  Período analizado: <strong className="text-foreground">{currentSourcePeriod}</strong> • Datos locales calculados en tiempo real cruzando pacientes activos y turnos completados en Salita Feliz.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportPDF('epidemiology')}
                disabled={isExporting}
                className="shrink-0"
              >
                {isExporting && exportingTab === 'epidemiology' ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin text-teal-600" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar Reporte
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}