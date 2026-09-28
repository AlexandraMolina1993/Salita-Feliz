import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import html2canvas from "html2canvas"
import type { VaccineDetailedBreakdown, PatientDemographicStats, NurseRankingItem } from "@/lib/database"
import type { RegionalCoverageItem } from "@/services/epidemiologyService"

export interface PDFHeaderFooterMeta {
  title: string
  subtitle: string
  userEmitter: string
  tag?: string
  footerDisclaimer?: string
}

/**
 * Captura un elemento HTML / Recharts SVG con alta resolución (3x DPI)
 * y preservando colores y estilos para impresión en PDF.
 */
export async function captureHighResChart(
  element: HTMLElement | null
): Promise<{ imgData: string; width: number; height: number } | null> {
  if (!element) return null

  try {
    const canvas = await html2canvas(element, {
      scale: 3, // 300+ DPI para máxima nitidez
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
      onclone: (_clonedDoc, clonedEl) => {
        // Asegurar fondo blanco y textos oscuros legibles
        clonedEl.style.backgroundColor = "#ffffff"
        clonedEl.style.color = "#0f172a"
        clonedEl.style.padding = "10px"

        const texts = clonedEl.querySelectorAll("text")
        texts.forEach((t) => {
          const fill = t.getAttribute("fill")
          if (!fill || fill === "#888888" || fill === "currentColor" || fill === "#ffffff" || fill === "white") {
            t.setAttribute("fill", "#334155")
          }
        })

        const svgs = clonedEl.querySelectorAll("svg")
        svgs.forEach((s) => {
          s.style.backgroundColor = "#ffffff"
        })
      },
    })

    return {
      imgData: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    }
  } catch (error) {
    console.error("Error al capturar gráfico en alta resolución:", error)
    return null
  }
}

/**
 * Inserta un gráfico capturado en el PDF preservando estrictamente la relación de aspecto.
 * Nunca lo estira ni distorsiona. Retorna la nueva posición Y.
 */
export function addChartToPDF(
  doc: jsPDF,
  chart: { imgData: string; width: number; height: number },
  startY: number,
  maxHeight = 78
): number {
  const pageWidth = 210
  const margin = 14
  const contentWidth = pageWidth - margin * 2 // 182mm

  const aspectRatio = chart.width / chart.height
  let renderWidth = contentWidth
  let renderHeight = renderWidth / aspectRatio

  if (renderHeight > maxHeight) {
    renderHeight = maxHeight
    renderWidth = renderHeight * aspectRatio
  }

  // Centrado horizontal exacto
  const xPos = margin + (contentWidth - renderWidth) / 2

  // Salto de página si colisiona con el pie de página
  let currentY = startY
  if (currentY + renderHeight > 274) {
    doc.addPage()
    currentY = 38
  }

  doc.addImage(chart.imgData, "PNG", xPos, currentY, renderWidth, renderHeight)
  return currentY + renderHeight + 6
}

/**
 * Aplica el encabezado institucional y pie de página formal en todas las páginas del documento.
 */
export function applyDocumentHeaderFooter(doc: jsPDF, meta: PDFHeaderFooterMeta) {
  const totalPages = (doc.internal as any).getNumberOfPages()
  const now = new Date()
  const dateStr = now.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const timeStr = now.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // 1. Barra superior decorativa institucional (Teal / Salud)
    doc.setFillColor(13, 148, 136) // #0d9488
    doc.rect(0, 0, 210, 4, "F")

    // 2. Tarjeta del Encabezado
    doc.setFillColor(248, 250, 252) // #f8fafc
    doc.roundedRect(14, 8, 182, 22, 2, 2, "F")
    doc.setDrawColor(226, 232, 240) // #e2e8f0
    doc.setLineWidth(0.3)
    doc.roundedRect(14, 8, 182, 22, 2, 2, "S")

    // Franja lateral verde azulado
    doc.setFillColor(13, 148, 136)
    doc.rect(14, 8, 3.5, 22, "F")

    // Título institucional
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42) // slate-900
    doc.text("Salita Feliz - Sistema Integral de Vacunación", 22, 14.5)

    // Título específico del reporte
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.setTextColor(13, 148, 136) // teal-600
    doc.text(meta.title.toUpperCase(), 22, 20.5)

    // Subtítulo / Tag
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text(meta.subtitle, 22, 25.5)

    // Bloque de metadatos (Alineado a la derecha)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.setTextColor(51, 65, 85)
    doc.text("Fecha:", 152, 14, { align: "right" })
    doc.text("Emitido por:", 152, 19, { align: "right" })
    doc.text("Formato:", 152, 24, { align: "right" })

    doc.setFont("helvetica", "normal")
    doc.setTextColor(71, 85, 105)
    doc.text(`${dateStr} ${timeStr}`, 155, 14)

    const emitterLabel =
      meta.userEmitter.length > 22 ? meta.userEmitter.substring(0, 20) + "..." : meta.userEmitter
    doc.text(emitterLabel, 155, 19)
    doc.text("Oficial A4 • Auditado", 155, 24)

    // 3. Pie de página institucional
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(14, 283, 196, 283)

    if (meta.footerDisclaimer) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6.5)
      doc.setTextColor(100, 116, 139)
      doc.text(meta.footerDisclaimer, 14, 287)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(
        "Salita Feliz • Gestión de Salud Pública y Vacunación • Documento Confidencial",
        14,
        291
      )

      doc.setFont("helvetica", "bold")
      doc.text(`Página ${i} de ${totalPages}`, 196, 291, { align: "right" })
    } else {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text(
        "Salita Feliz • Gestión de Salud Pública y Vacunación • Documento Confidencial",
        14,
        290
      )

      doc.setFont("helvetica", "bold")
      doc.text(`Página ${i} de ${totalPages}`, 196, 290, { align: "right" })
    }
  }
}

/**
 * Dibuja una tarjeta con KPIs ejecutivos clave en el documento.
 */
function drawKpiGrid(
  doc: jsPDF,
  startY: number,
  cards: Array<{ label: string; value: string; hint?: string }>
): number {
  const margin = 14
  const totalWidth = 182
  const gap = 3
  const cardWidth = (totalWidth - gap * (cards.length - 1)) / cards.length
  const cardHeight = 16

  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + gap)

    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, startY, cardWidth, cardHeight, 1.5, 1.5, "F")
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(x, startY, cardWidth, cardHeight, 1.5, 1.5, "S")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text(card.label.toUpperCase(), x + 3.5, startY + 5)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(13, 148, 136)
    doc.text(card.value, x + 3.5, startY + 11)

    if (card.hint) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(5.5)
      doc.setTextColor(148, 163, 184)
      doc.text(card.hint, x + 3.5, startY + 14.5)
    }
  })

  return startY + cardHeight + 6
}

// =========================================================================
// 1. REPORTE DE VACUNAS
// =========================================================================

export interface ExportVaccinesParams {
  chartElement: HTMLElement | null
  year: string
  userEmitter: string
  totalVacunas: number
  tipoMasComun: string
  monthlyStats: Array<{ name: string; total: number }>
  detailedBreakdown: VaccineDetailedBreakdown[]
}

export async function generateVaccinesReportPDF({
  chartElement,
  year,
  userEmitter,
  totalVacunas,
  tipoMasComun,
  monthlyStats,
  detailedBreakdown,
}: ExportVaccinesParams) {
  const doc = new jsPDF("p", "mm", "a4")
  let y = 35

  // 1. Tarjetas de resumen
  const promedioMensual = (totalVacunas / 12).toFixed(1)
  const mesMayor = monthlyStats.reduce((prev, curr) => (curr.total > prev.total ? curr : prev), {
    name: "N/A",
    total: 0,
  })

  y = drawKpiGrid(doc, y, [
    { label: "Período Analizado", value: `Año ${year}`, hint: "12 Meses Calendario" },
    { label: "Total Dosis Aplicadas", value: totalVacunas.toLocaleString("es-AR"), hint: "Turnos completados" },
    { label: "Vacuna Mayor Demanda", value: tipoMasComun, hint: "Volumen principal" },
    { label: "Promedio Mensual", value: `${promedioMensual} dosis`, hint: `Pico: ${mesMayor.name} (${mesMayor.total})` },
  ])

  // 2. Gráfico de evolución en alta resolución
  const capturedChart = await captureHighResChart(chartElement)
  if (capturedChart) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text("EVOLUCIÓN Y TENDENCIA MENSUAL DE VACUNAS APLICADAS", 14, y)
    y += 3
    y = addChartToPDF(doc, capturedChart, y, 70)
  }

  // 3. Tabla Resumen Mensual Consolidado
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text("RESUMEN CONSOLIDADO POR MES", 14, y)
  y += 2

  const monthlyRows = monthlyStats.map((item) => {
    const pct = totalVacunas > 0 ? ((item.total / totalVacunas) * 100).toFixed(1) + "%" : "0.0%"
    let evaluacion = "Estable"
    if (item.total > Number(promedioMensual) * 1.2) evaluacion = "Demanda Alta"
    else if (item.total < Number(promedioMensual) * 0.7 && item.total > 0) evaluacion = "Demanda Baja"
    else if (item.total === 0) evaluacion = "Sin aplicaciones"

    return [item.name, item.total.toLocaleString("es-AR"), pct, evaluacion]
  })

  autoTable(doc, {
    startY: y,
    head: [["Mes", "Dosis Aplicadas", "Proporción Anual (%)", "Evaluación de Demanda"]],
    body: monthlyRows,
    margin: { left: 14, right: 14, top: 35, bottom: 20 },
    theme: "striped",
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: "bold" },
      1: { cellWidth: 45, halign: "right" },
      2: { cellWidth: 45, halign: "right" },
      3: { cellWidth: 57, halign: "center" },
    },
  })

  // 4. NUEVA PÁGINA: Tabla Detallada por Vacuna y Mes
  doc.addPage()
  let yPage2 = 36

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text("DESGLOSE EXACTO DE VACUNAS APLICADAS POR TIPO Y MES", 14, yPage2)
  yPage2 += 2

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(
    `Distribución mensual discriminada por vacuna y categoría inmunológica correspondiente al período fiscal ${year}.`,
    14,
    yPage2 + 3
  )
  yPage2 += 5

  const monthShorts = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  const detailedHeaders = ["Vacuna", "Tipo", ...monthShorts, "Total"]

  const detailedRows = detailedBreakdown.map((vac) => {
    return [
      vac.name,
      vac.type,
      ...vac.monthly.map((val) => (val > 0 ? val.toString() : "-")),
      vac.total.toLocaleString("es-AR"),
    ]
  })

  // Fila de totales generales
  const monthlySums = new Array(12).fill(0)
  detailedBreakdown.forEach((vac) => {
    vac.monthly.forEach((cnt, idx) => {
      monthlySums[idx] += cnt
    })
  })
  const grandTotal = detailedBreakdown.reduce((sum, v) => sum + v.total, 0)
  const totalRow = [
    "TOTAL GENERAL",
    "Todas",
    ...monthlySums.map((val) => val.toString()),
    grandTotal.toLocaleString("es-AR"),
  ]

  autoTable(doc, {
    startY: yPage2,
    head: [detailedHeaders],
    body: detailedRows,
    foot: [totalRow],
    margin: { left: 14, right: 14, top: 35, bottom: 20 },
    theme: "grid",
    headStyles: {
      fillColor: [13, 148, 136],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
      halign: "center",
    },
    footStyles: {
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 6.5,
      halign: "center",
    },
    styles: { fontSize: 6.5, cellPadding: 1.8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold", halign: "left" },
      1: { cellWidth: 28, halign: "left" },
      2: { cellWidth: 9.5, halign: "center" },
      3: { cellWidth: 9.5, halign: "center" },
      4: { cellWidth: 9.5, halign: "center" },
      5: { cellWidth: 9.5, halign: "center" },
      6: { cellWidth: 9.5, halign: "center" },
      7: { cellWidth: 9.5, halign: "center" },
      8: { cellWidth: 9.5, halign: "center" },
      9: { cellWidth: 9.5, halign: "center" },
      10: { cellWidth: 9.5, halign: "center" },
      11: { cellWidth: 9.5, halign: "center" },
      12: { cellWidth: 9.5, halign: "center" },
      13: { cellWidth: 9.5, halign: "center" },
      14: { cellWidth: 14, fontStyle: "bold", halign: "right" },
    },
  })

  // Aplicar encabezado institucional y pie de página en todas las páginas
  applyDocumentHeaderFooter(doc, {
    title: "Reporte de Vacunación",
    subtitle: `Estadísticas de Dosis Aplicadas y Desglose por Mes • Período ${year}`,
    userEmitter,
  })

  doc.save(`reporte-vacunas-${year}.pdf`)
}

// =========================================================================
// 2. REPORTE DE PACIENTES
// =========================================================================

export interface ExportPatientsParams {
  ageChartElement: HTMLElement | null
  genderChartElement: HTMLElement | null
  userEmitter: string
  demographicStats: PatientDemographicStats
}

export async function generatePatientsReportPDF({
  ageChartElement,
  genderChartElement,
  userEmitter,
  demographicStats,
}: ExportPatientsParams) {
  const doc = new jsPDF("p", "mm", "a4")
  let y = 35

  const total = demographicStats.totalPatients
  const mayorGrupo = demographicStats.ageStats.reduce(
    (prev, curr) => (curr.count > prev.count ? curr : prev),
    { group: "N/A", count: 0, percentage: "0.0" }
  )
  const femenino = demographicStats.genderStats.find((g) => g.name === "Femenino")
  const masculino = demographicStats.genderStats.find((g) => g.name === "Masculino")

  // 1. Tarjetas de resumen
  y = drawKpiGrid(doc, y, [
    { label: "Padrón de Pacientes", value: total.toLocaleString("es-AR"), hint: "Registrados activos" },
    { label: "Cohorte Mayoritaria", value: mayorGrupo.group.split(" ")[0], hint: `${mayorGrupo.percentage}% del total` },
    { label: "Distribución Femenina", value: `${femenino?.percentage || "0.0"}%`, hint: `${femenino?.count || 0} pacientes` },
    { label: "Distribución Masculina", value: `${masculino?.percentage || "0.0"}%`, hint: `${masculino?.count || 0} pacientes` },
  ])

  // 2. Gráficos demográficos en alta resolución
  const capturedAge = await captureHighResChart(ageChartElement)
  if (capturedAge) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text("DISTRIBUCIÓN DEMOGRÁFICA POR EDAD Y GÉNERO", 14, y)
    y += 3
    y = addChartToPDF(doc, capturedAge, y, 62)
  }

  // 3. Tabla: Resumen Estadístico Exacto por Rango de Edad
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text("DISTRIBUCIÓN EXACTA POR RANGO DE EDAD", 14, y)
  y += 2

  const ageRows = demographicStats.ageStats.map((item) => {
    let prioridad = "Población Objetivo Primaria"
    if (item.group.includes("Pediátrico")) prioridad = "Esquema Nacional Completo (Calendario)"
    else if (item.group.includes("Adultos Mayores")) prioridad = "Población de Riesgo / Vacunación Antigripal"

    return [item.group, item.count.toLocaleString("es-AR"), `${item.percentage}%`, prioridad]
  })

  autoTable(doc, {
    startY: y,
    head: [["Rango de Edad / Cohorte", "Cantidad de Pacientes", "Proporción (%)", "Prioridad Clínica"]],
    body: ageRows,
    foot: [["TOTAL PADRÓN", total.toLocaleString("es-AR"), "100.0%", "Cobertura Universal"]],
    margin: { left: 14, right: 14, top: 35, bottom: 20 },
    theme: "striped",
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: "bold" },
      1: { cellWidth: 40, halign: "right" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 52, halign: "left" },
    },
  })

  // 4. NUEVA PÁGINA: Cruce Demográfico y Género
  doc.addPage()
  let yPage2 = 36

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text("DISTRIBUCIÓN POR GÉNERO Y CRUCE DEMOGRÁFICO", 14, yPage2)
  yPage2 += 2

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(
    "Resumen cruzado para planificación de recursos de salud pública y captación de población objetivo.",
    14,
    yPage2 + 3
  )
  yPage2 += 6

  // Tabla Género
  const genderRows = demographicStats.genderStats.map((item) => [
    item.name,
    item.count.toLocaleString("es-AR"),
    `${item.percentage}%`,
  ])

  autoTable(doc, {
    startY: yPage2,
    head: [["Género", "Cantidad de Pacientes", "Proporción Poblacional (%)"]],
    body: genderRows,
    foot: [["TOTAL", total.toLocaleString("es-AR"), "100.0%"]],
    margin: { left: 14, right: 14, top: 35, bottom: 20 },
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 60, halign: "right" },
      2: { cellWidth: 62, halign: "right" },
    },
  })

  const lastTable = (doc as any).lastAutoTable
  let yCross = lastTable ? lastTable.finalY + 8 : yPage2 + 40

  // Tabla Cruce Demográfico
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text("CRUCE DEMOGRÁFICO: GRUPO ETARIO VS. GÉNERO", 14, yCross)
  yCross += 2

  const crossRows = demographicStats.crossStats.map((item) => [
    item.group,
    item.female.toLocaleString("es-AR"),
    item.male.toLocaleString("es-AR"),
    item.other.toLocaleString("es-AR"),
    item.total.toLocaleString("es-AR"),
  ])

  const totalFemale = demographicStats.crossStats.reduce((acc, c) => acc + c.female, 0)
  const totalMale = demographicStats.crossStats.reduce((acc, c) => acc + c.male, 0)
  const totalOther = demographicStats.crossStats.reduce((acc, c) => acc + c.other, 0)

  autoTable(doc, {
    startY: yCross,
    head: [["Grupo de Edad", "Femenino", "Masculino", "Otro / Sin datos", "Total Cohorte"]],
    body: crossRows,
    foot: [
      [
        "CONSOLIDADO",
        totalFemale.toLocaleString("es-AR"),
        totalMale.toLocaleString("es-AR"),
        totalOther.toLocaleString("es-AR"),
        total.toLocaleString("es-AR"),
      ],
    ],
    margin: { left: 14, right: 14, top: 35, bottom: 20 },
    theme: "grid",
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: "bold" },
      1: { cellWidth: 32, halign: "right" },
      2: { cellWidth: 32, halign: "right" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 31, fontStyle: "bold", halign: "right" },
    },
  })

  // Aplicar encabezado institucional y pie de página en todas las páginas
  applyDocumentHeaderFooter(doc, {
    title: "Reporte de Pacientes",
    subtitle: "Estadísticas Demográficas, Cohortes Etarias y Distribución de Género",
    userEmitter,
  })

  doc.save(`reporte-pacientes-${new Date().toISOString().split("T")[0]}.pdf`)
}

// =========================================================================
// 3. REPORTE DE ENFERMEROS
// =========================================================================

export interface ExportNursesParams {
  chartElement: HTMLElement | null
  userEmitter: string
  nurseRanking: NurseRankingItem[]
}

export async function generateNursesReportPDF({
  chartElement,
  userEmitter,
  nurseRanking,
}: ExportNursesParams) {
  const doc = new jsPDF("p", "mm", "a4")
  let y = 35

  const totalDosis = nurseRanking.reduce((sum, n) => sum + n.vaccines, 0)
  const totalPacientes = nurseRanking.reduce((sum, n) => sum + n.patients, 0)
  const totalProfesionales = nurseRanking.length
  const topNurse = nurseRanking[0] || { name: "N/A", vaccines: 0, licenseNumber: "S/M" }

  // 1. Tarjetas de resumen
  y = drawKpiGrid(doc, y, [
    { label: "Equipo de Enfermería", value: `${totalProfesionales} Profesionales`, hint: "Personal activo" },
    { label: "Dosis Administradas", value: totalDosis.toLocaleString("es-AR"), hint: "Total asistencial" },
    { label: "Pacientes Atendidos", value: totalPacientes.toLocaleString("es-AR"), hint: "Atenciones únicas" },
    { label: "Líder de Cobertura", value: topNurse.name.split(" ")[0], hint: `${topNurse.vaccines} dosis aplicadas` },
  ])

  // 2. Gráficos de rendimiento en alta resolución
  const capturedChart = await captureHighResChart(chartElement)
  if (capturedChart) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text("RENDIMIENTO Y COBERTURA ASISTENCIAL DEL PERSONAL", 14, y)
    y += 3
    y = addChartToPDF(doc, capturedChart, y, 68)
  }

  // 3. Tabla: Ranking detallando la cantidad exacta de dosis aplicadas por cada profesional con su matrícula
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text("RANKING DE RENDIMIENTO PROFESIONAL (CON MATRÍCULA)", 14, y)
  y += 2

  const rankingRows = nurseRanking.map((nurse, index) => {
    const aportePct = totalDosis > 0 ? ((nurse.vaccines / totalDosis) * 100).toFixed(1) + "%" : "0.0%"
    let calificacion = "Estándar"
    if (index === 0 && nurse.vaccines > 0) calificacion = "Destacado (1° Puesto)"
    else if (nurse.vaccines >= (totalDosis / (totalProfesionales || 1))) calificacion = "Óptimo"

    return [
      `${index + 1}°`,
      nurse.name,
      nurse.licenseNumber ? `M.P. ${nurse.licenseNumber}` : "M.P. No registrada",
      nurse.vaccines.toLocaleString("es-AR"),
      nurse.patients.toLocaleString("es-AR"),
      aportePct,
      calificacion,
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [
      [
        "#",
        "Profesional de Enfermería",
        "Matrícula Profesional",
        "Dosis Aplicadas",
        "Pacientes",
        "Aporte (%)",
        "Desempeño",
      ],
    ],
    body: rankingRows,
    foot: [
      [
        "",
        "TOTAL EQUIPO ASISTENCIAL",
        "-",
        totalDosis.toLocaleString("es-AR"),
        totalPacientes.toLocaleString("es-AR"),
        "100.0%",
        "Consolidado",
      ],
    ],
    margin: { left: 14, right: 14, top: 35, bottom: 20 },
    theme: "striped",
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold", fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 48, fontStyle: "bold" },
      2: { cellWidth: 35, halign: "center" },
      3: { cellWidth: 26, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 23, halign: "center" },
    },
  })

  // Aplicar encabezado institucional y pie de página en todas las páginas
  applyDocumentHeaderFooter(doc, {
    title: "Reporte de Enfermeros",
    subtitle: "Rendimiento Asistencial, Registro de Matrículas y Dosis Aplicadas",
    userEmitter,
  })

  doc.save(`reporte-enfermeros-${new Date().toISOString().split("T")[0]}.pdf`)
}

// =========================================================================
// 4. REPORTE DE EPIDEMIOLOGÍA (NOMIVAC)
// =========================================================================

export interface ExportEpidemiologyParams {
  chartElement: HTMLElement | null
  selectedProvince: string
  userEmitter: string
  epidemiologyData: RegionalCoverageItem[]
  sourcePeriod?: string
}

export async function generateEpidemiologyReportPDF({
  chartElement,
  selectedProvince,
  userEmitter,
  epidemiologyData,
  sourcePeriod: customSourcePeriod,
}: ExportEpidemiologyParams) {
  const doc = new jsPDF("p", "mm", "a4")
  let y = 35

  const sourcePeriod =
    customSourcePeriod ||
    epidemiologyData.find((item) => item.sourcePeriod)?.sourcePeriod ||
    "Boletín Q3 2026"

  const totalVacunas = epidemiologyData.length
  const superanMeta = epidemiologyData.filter((item) => (item.difference ?? 0) > 0).length
  const bajoMeta = epidemiologyData.filter((item) => (item.difference ?? 0) < 0).length

  const avgLocal =
    totalVacunas > 0
      ? (epidemiologyData.reduce((acc, i) => acc + i.local, 0) / totalVacunas).toFixed(1)
      : "0.0"
  const avgRegional =
    totalVacunas > 0
      ? (epidemiologyData.reduce((acc, i) => acc + i.regional, 0) / totalVacunas).toFixed(1)
      : "0.0"

  // 1. Tarjetas de resumen
  y = drawKpiGrid(doc, y, [
    { label: "Jurisdicción", value: selectedProvince, hint: "Media provincial NOMIVAC" },
    { label: "Período Oficial", value: sourcePeriod, hint: "Actualización manual" },
    { label: "Cobertura Salita", value: `${avgLocal}%`, hint: "Promedio local ponderado" },
    { label: `Media ${selectedProvince}`, value: `${avgRegional}%`, hint: "Registro Sanitario Oficial" },
  ])

  // 2. Gráfico comparativo en alta resolución
  const capturedChart = await captureHighResChart(chartElement)
  if (capturedChart) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text(`VIGILANCIA EPIDEMIOLÓGICA: SALITA FELIZ VS. NOMIVAC (${selectedProvince.toUpperCase()})`, 14, y)
    y += 3
    y = addChartToPDF(doc, capturedChart, y, 70)
  }

  // 3. Main Requirement: Tabla detallada con el cruce exacto:
  // "Vacuna | Cobertura Local (%) | Promedio Provincial (%) | Diferencia (+/-)"
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text("CRUCE EXACTO DE COBERTURA Y COMPARATIVA SANITARIA", 14, y)
  y += 2

  const epRows: string[][] = epidemiologyData.map((item) => {
    const diff = item.difference ?? 0
    let diffFormatted = `${diff > 0 ? "+" : ""}${diff}%`
    let evaluacion = "Alineado a la media"

    if (diff > 0) {
      evaluacion = "Supera meta regional"
    } else if (diff < 0) {
      evaluacion = "Oportunidad de captación"
    }

    return [
      item.vacuna,
      item.targetGroup || "Población General",
      `${item.local}% (${item.vaccinatedPatients ?? 0}/${item.totalTargetPatients ?? 0})`,
      `${item.regional}%`,
      diffFormatted,
      evaluacion,
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Vacuna",
        "Población Objetivo / Cohorte",
        "Cobertura Local (%)",
        `Promedio ${selectedProvince} (%)`,
        "Diferencia (+/-)",
        "Evaluación Sanitaria",
      ],
    ],
    body: epRows,
    margin: { left: 14, right: 14, top: 35, bottom: 20 },
    theme: "striped",
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2.2, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold" },
      1: { cellWidth: 42 },
      2: { cellWidth: 30, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 26, halign: "center" },
      4: { cellWidth: 22, halign: "center", fontStyle: "bold" },
      5: { cellWidth: 24, halign: "center" },
    },
    didParseCell: (data) => {
      // Resaltar en verde o rojo la columna Diferencia (+/-)
      if (data.section === "body" && data.column.index === 4) {
        const text = String(data.cell.raw)
        if (text.startsWith("+")) {
          data.cell.styles.textColor = [5, 150, 105] // Emerald
        } else if (text.startsWith("-")) {
          data.cell.styles.textColor = [225, 29, 72] // Rose
        }
      }
    },
  })

  // 4. NUEVA PÁGINA: Resumen de Hallazgos Clínicos e Insights
  doc.addPage()
  let yPage2 = 36

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text(`PLAN DE ACCIÓN Y RECOMENDACIONES EPIDEMIOLÓGICAS (${selectedProvince.toUpperCase()})`, 14, yPage2)
  yPage2 += 2

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(
    "Acciones sanitarias y análisis de brechas clínicas frente a los promedios oficiales de NOMIVAC.",
    14,
    yPage2 + 3
  )
  yPage2 += 6

  const insightRows: string[][] = epidemiologyData.map((item) => {
    const diff = item.difference ?? 0
    let estado = diff > 0 ? "COBERTURA ÓPTIMA" : diff < 0 ? "CAMPAÑA ACTIVA" : "PARIDAD"
    return [item.vacuna, item.targetGroup || "General", estado, item.insight || "Sin observaciones adicionales"]
  })

  autoTable(doc, {
    startY: yPage2,
    head: [["Vacuna", "Cohorte", "Estado Clínico", "Recomendación / Hallazgo Sanitario"]],
    body: insightRows,
    margin: { left: 14, right: 14, top: 35, bottom: 20 },
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2.2, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold" },
      1: { cellWidth: 32 },
      2: { cellWidth: 26, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 92 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        const text = String(data.cell.raw)
        if (text === "COBERTURA ÓPTIMA") {
          data.cell.styles.textColor = [5, 150, 105]
        } else if (text === "CAMPAÑA ACTIVA") {
          data.cell.styles.textColor = [225, 29, 72]
        }
      }
    },
  })

  // Aplicar encabezado institucional y pie de página en todas las páginas
  applyDocumentHeaderFooter(doc, {
    title: "Reporte de Vigilancia Epidemiológica",
    subtitle: `Salita Feliz vs. NOMIVAC (${selectedProvince}) • Ref: ${sourcePeriod}`,
    userEmitter,
    footerDisclaimer:
      "Fuente de datos regionales: Boletines Epidemiológicos Públicos del Ministerio de Salud de la Nación / NOMIVAC (Actualización Manual).",
  })

  doc.save(`reporte-epidemiologia-${selectedProvince.toLowerCase().replace(/\s+/g, "-")}.pdf`)
}
