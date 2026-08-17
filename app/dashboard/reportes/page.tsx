// En app/dashboard/reportes/page.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Download } from "lucide-react"
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
  getPatientDistributionByNurse
} from "@/lib/database"


export default function ReportsPage() {
  const [period, setPeriod] = useState("2025", "2026", "2027")
  const [chartData, setChartData] = useState([])
  const [distributionData, setDistributionData] = useState([])
  const [trendData, setTrendData] = useState([])
  const [patientGenderData, setPatientGenderData] = useState([])
  const [patientAgeData, setPatientAgeData] = useState([])
  
  // Nombres de variables más descriptivos
  const [nurseVaccines, setNurseVaccines] = useState([])
  const [nurseRanking, setNurseRanking] = useState([])
  const [patientDistribution, setPatientDistribution] = useState([])

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("vaccines");

  // Referencias para los elementos que queremos capturar
  const overviewChartRef = useRef(null);
  const pieChartRef = useRef(null);
  const trendChartRef = useRef(null);
  const nurseBarChartRef = useRef(null);
  const nurseRankingRef = useRef(null);
  const patientDistributionRef = useRef(null);

  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const loadChartData = async (selectedPeriod: string) => {
    setLoading(true)
    try {
      const [stats, distData, trend, genderData, ageData] = await Promise.all([
        getVaccinationStatsByMonth(parseInt(selectedPeriod)),
        getVaccinationDistribution(),
        getVaccinationTrend(12),
        getPatientGenderDistribution(),
        getPatientAgeDistribution()
      ]);

      const initialData = months.map(month => ({ name: month, total: 0 }));
      stats.forEach(item => {
        if (item.month >= 0 && item.month < 12) {
          initialData[item.month].total = item.count;
        }
      });
      setChartData(initialData)
      setDistributionData(distData);
      setTrendData(trend);
      setPatientGenderData(genderData);
      setPatientAgeData(ageData);

    } catch (error) {
      console.error("Error al cargar los datos del gráfico:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadNurseData = async () => {
    setLoading(true);
    try {
      const [vaccines, ranking, distribution] = await Promise.all([
        getVaccinesByNurse(),
        getNurseRankings(),
        getPatientDistributionByNurse(),
      ]);
      setNurseVaccines(vaccines);
      setNurseRanking(ranking);
      setPatientDistribution(distribution);
    } catch (error) {
      console.error("Error al cargar datos de enfermeros:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    let yOffset = 20;

    // Título principal del reporte
    doc.setFontSize(22);
    doc.text("Reporte Completo de Vacunación", 20, yOffset);
    yOffset += 15;

    // Resumen de datos clave (para la pestaña de Vacunas)
    doc.setFontSize(14);
    doc.text("Resumen de Vacunación", 20, yOffset);
    yOffset += 10;
    doc.setFontSize(12);

    const totalVacunas = chartData.reduce((sum, entry) => sum + entry.total, 0);
    const tipoMasComun = distributionData.length > 0
        ? distributionData.reduce((prev, current) => (prev.value > current.value ? prev : current)).name
        : "N/A";

    doc.text(`- Total de vacunas aplicadas en el período: ${totalVacunas}`, 20, yOffset);
    yOffset += 10;
    doc.text(`- Tipo de vacuna más común: ${tipoMasComun}`, 20, yOffset);
    yOffset += 20;

    // Sección: Vacunas Aplicadas
    if (overviewChartRef.current) {
      const canvas = await html2canvas(overviewChartRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      doc.setFontSize(16);
      doc.text("Gráfico de Vacunas Aplicadas por Mes", 20, yOffset);
      yOffset += 5;
      doc.addImage(imgData, 'PNG', 20, yOffset, 170, 90);
      yOffset += 100;
    }

    // Sección: Distribución por Tipo
    if (pieChartRef.current) {
      doc.addPage();
      yOffset = 20;
      const canvas = await html2canvas(pieChartRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      doc.setFontSize(16);
      doc.text("Gráfico de Distribución por Tipo", 20, yOffset);
      yOffset += 5;
      doc.addImage(imgData, 'PNG', 20, yOffset, 170, 90);
      yOffset += 100;
    }

    // Sección: Tendencia de Vacunación
    if (trendChartRef.current) {
      doc.addPage();
      yOffset = 20;
      const canvas = await html2canvas(trendChartRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      doc.setFontSize(16);
      doc.text("Gráfico de Tendencia de Vacunación", 20, yOffset);
      yOffset += 5;
      doc.addImage(imgData, 'PNG', 20, yOffset, 170, 90);
      yOffset += 100;
    }

    // Sección: Estadísticas de Enfermeros
    if (nurseBarChartRef.current && nurseRankingRef.current && patientDistributionRef.current) {
        doc.addPage();
        yOffset = 20;

        doc.setFontSize(18);
        doc.text("Reporte de Enfermeros", 20, yOffset);
        yOffset += 15;

        // Gráfico de Vacunas Aplicadas por Enfermero
        doc.setFontSize(14);
        doc.text("Vacunas Aplicadas por Enfermero", 20, yOffset);
        yOffset += 5;
        const nurseBarCanvas = await html2canvas(nurseBarChartRef.current, { scale: 2 });
        const nurseBarImg = nurseBarCanvas.toDataURL('image/png');
        doc.addImage(nurseBarImg, 'PNG', 20, yOffset, 170, 90);
        yOffset += 100;

        // Gráfico de Distribución de Pacientes
        doc.setFontSize(14);
        doc.text("Distribución de Pacientes por Enfermero", 20, yOffset);
        yOffset += 5;
        const patientDistCanvas = await html2canvas(patientDistributionRef.current, { scale: 2 });
        const patientDistImg = patientDistCanvas.toDataURL('image/png');
        doc.addImage(patientDistImg, 'PNG', 20, yOffset, 170, 90);
        yOffset += 100;

        // Tabla de Ranking de Enfermeros
        doc.addPage();
        yOffset = 20;
        doc.setFontSize(14);
        doc.text("Ranking de Enfermeros por Vacunas Aplicadas", 20, yOffset);
        yOffset += 10;
        
        doc.setFontSize(12);
        doc.text("Enfermero", 20, yOffset);
        doc.text("Vacunas", 100, yOffset);
        yOffset += 5;
        doc.line(20, yOffset, 180, yOffset);
        yOffset += 5;

        nurseRanking.forEach((nurse: any) => {
            doc.text(`${nurse.name}`, 20, yOffset);
            doc.text(`${nurse.vaccines}`, 100, yOffset);
            yOffset += 10;
        });
    }

    doc.save('reporte-completo.pdf');
  };

  useEffect(() => {
    loadChartData(period)
  }, [period])
  
  // NUEVO: Carga los datos de enfermeros cuando la pestaña cambia a 'nurses'
  useEffect(() => {
    if (activeTab === "nurses") {
      loadNurseData();
    }
  }, [activeTab]);

  const GENDER_COLORS = ['#8884d8', '#82ca9d', '#ffc658'];
  const NURSE_COLORS = [
  '#3f51b5', // Azul índigo
  '#c51162', // Rosa fuerte
  '#009688', // Verde azulado
  '#ff9800', // Naranja ámbar
  '#9c27b0', // Púrpura
  '#ffeb3b', // Amarillo
  '#03a9f4', // Azul claro
  '#4caf50', // Verde
  '#f44336', // Rojo
  '#607d8b', // Gris azulado
  '#e91e63', // Rosa
  '#795548', // Marrón
  '#2196f3', // Azul
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Visualice estadísticas y genere informes</p>
      </div>

      <Tabs defaultValue="vaccines" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="vaccines">Vacunas</TabsTrigger>
          <TabsTrigger value="patients">Pacientes</TabsTrigger>
          <TabsTrigger value="nurses">Enfermeros</TabsTrigger>
        </TabsList>
        <TabsContent value="vaccines" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Vacunas Aplicadas</CardTitle>
                  <CardDescription>Cantidad de vacunas aplicadas por período</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent ref={overviewChartRef}>
                {loading ? (
                  <div className="flex justify-center items-center h-[350px]">
                    <p className="text-muted-foreground">Cargando datos...</p>
                  </div>
                ) : (
                  <Overview data={chartData} />
                )}
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Datos
                </Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Tipo</CardTitle>
                <CardDescription>Porcentaje de vacunas aplicadas por tipo</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center" ref={pieChartRef}>
                <div className="h-[300px] w-full flex items-center justify-center">
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
              <CardContent className="flex justify-center" ref={trendChartRef}>
                <div className="h-[300px] w-full flex items-center justify-center">
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
        <TabsContent value="patients" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Pacientes</CardTitle>
              <CardDescription>Información demográfica y estadísticas de pacientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col space-y-2">
                  <Label>Distribución por Edad</Label>
                  <div className="h-[250px] rounded-md border flex items-center justify-center">
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
                  <div className="h-[250px] rounded-md border flex items-center justify-center">
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
          </Card>
        </TabsContent>
        <TabsContent value="nurses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Enfermeros</CardTitle>
              <CardDescription>Información sobre el rendimiento del personal de enfermería</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col space-y-2">
                  <Label>Vacunas Aplicadas por Enfermero</Label>
                  <div className="h-[250px] rounded-md border flex items-center justify-center" ref={nurseBarChartRef}>
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
                  <div className="h-[250px] rounded-md border flex items-center justify-center" ref={patientDistributionRef}>
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
                  <div className="grid grid-cols-2 font-bold border-b pb-2">
                    <span>Enfermero</span>
                    <span>Vacunas Aplicadas</span>
                  </div>
                  {loading ? (
                    <div className="mt-2 text-center text-muted-foreground">Cargando...</div>
                  ) : (
                    nurseRanking.sort((a, b) => b.vaccines - a.vaccines).map((nurse: any, index: any) => (
                      <div key={index} className="grid grid-cols-2 mt-2">
                        <span>{nurse.name}</span>
                        <span>{nurse.vaccines}</span>
                      </div>
                    ))
                  )}
                </Card>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
                <Button variant="outline" onClick={handleExportData}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Datos
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}