"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Syringe,
  Stethoscope,
  FileText,
  Hash,
  Building,
  ExternalLink,
  Tag,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import type { Appointment } from "@/lib/database"
import { formatNominalDate, formatNominalTime } from "@/lib/dateUtils"

interface VaccineHistoryModalProps {
  vaccination: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VaccineHistoryModal({
  vaccination,
  open,
  onOpenChange,
}: VaccineHistoryModalProps) {
  if (!vaccination) return null

  // Helper para el badge y estado del turno
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Aplicada / Completada
          </Badge>
        )
      case "cancelled":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            Cancelada
          </Badge>
        )
      case "scheduled":
      default:
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
            <AlertCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Turno Programado
          </Badge>
        )
    }
  }

  // Nombre de la vacuna y laboratorio
  const vaccineName =
    vaccination.vaccines?.name ||
    vaccination.vacuna?.name ||
    "Vacuna no especificada"

  const manufacturer =
    vaccination.vaccines?.manufacturer ||
    vaccination.vacuna?.manufacturer ||
    null

  // Lote y vencimiento (priorizando vaccines y luego vacuna)
  const lotNumber =
    vaccination.vaccines?.lot_number ||
    vaccination.vacuna?.lot_number ||
    null

  const expirationDate =
    vaccination.vaccines?.expiration_date ||
    vaccination.vacuna?.expiration_date ||
    null

  // Enfermero / Aplicador
  const nurseName = vaccination.nurses?.full_name || null
  const nurseLicense = vaccination.nurses?.license_number || null
  const nurseSpecialty = vaccination.nurses?.specialty || null

  // Dosis
  const doseDisplay =
    vaccination.dose_applied !== undefined && vaccination.dose_applied !== null
      ? `${vaccination.dose_applied} ml (aplicada)`
      : vaccination.dose_to_apply !== undefined && vaccination.dose_to_apply !== null
      ? `${vaccination.dose_to_apply} ml (indicada)`
      : vaccination.vaccines?.dose_amount
      ? `${vaccination.vaccines.dose_amount} ml`
      : null

  const isCompleted = vaccination.status === "completed"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border bg-card shadow-2xl">
        {/* Encabezado con estética clínica */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                  <Syringe className="h-5 w-5" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                  Detalles de Vacunación
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm text-muted-foreground">
                Información técnica y registro de aplicación clínica de la dosis
              </DialogDescription>
            </div>
            <div className="self-start sm:self-center">
              {getStatusBadge(vaccination.status)}
            </div>
          </div>
        </DialogHeader>

        {/* Contenido Principal */}
        <div className="p-6 space-y-5">
          {/* Tarjeta de Fecha Exacta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200/60 dark:border-orange-900/50 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-orange-600 text-white shadow-sm">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                  {isCompleted ? "Fecha de Aplicación" : "Fecha Programada"}
                </p>
                <p className="text-sm font-bold text-foreground" suppressHydrationWarning>
                  {isCompleted && vaccination.vaccination_date
                    ? formatNominalDate(vaccination.vaccination_date, "full")
                    : formatNominalDate(vaccination.appointment_date, "full")}
                </p>
              </div>
            </div>

            {vaccination.appointment_time && (
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-600 text-white shadow-sm">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Hora del Registro
                  </p>
                  <p className="text-sm font-bold text-foreground" suppressHydrationWarning>
                    {formatNominalTime(vaccination.appointment_time, true)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Información de la Vacuna y Laboratorio */}
          <div className="rounded-xl border bg-background p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold border-b pb-2">
              <Syringe className="h-4 w-4 text-primary" />
              <span>Datos del Biológico / Vacuna</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
              <div className="sm:col-span-2">
                <span className="text-xs text-muted-foreground block">Nombre de la Vacuna:</span>
                <span className="font-bold text-base text-foreground">
                  {vaccineName}
                </span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">Laboratorio / Marca:</span>
                <div className="flex items-center gap-1.5 mt-0.5 font-medium text-foreground">
                  <Building className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{manufacturer || "No especificado"}</span>
                </div>
              </div>

              {doseDisplay && (
                <div>
                  <span className="text-xs text-muted-foreground block">Dosis Administrada:</span>
                  <span className="font-semibold text-primary mt-0.5 block">{doseDisplay}</span>
                </div>
              )}

              {vaccination.vaccines?.type && (
                <div>
                  <span className="text-xs text-muted-foreground block">Tipo / Categoría:</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-medium text-foreground">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{vaccination.vaccines.type}</span>
                  </div>
                </div>
              )}

              {vaccination.vaccines?.storage_temperature && (
                <div>
                  <span className="text-xs text-muted-foreground block">Temperatura de Almacenamiento:</span>
                  <span className="font-medium text-foreground mt-0.5 block">
                    {vaccination.vaccines.storage_temperature}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Trazabilidad: Lote y Vencimiento */}
          <div className="rounded-xl border bg-background p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold border-b pb-2">
              <ShieldCheck className="h-4 w-4" />
              <span>Trazabilidad y Seguridad Farmacéutica</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Número de Lote:</span>
                {lotNumber ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Hash className="h-3.5 w-3.5 text-emerald-600" />
                    <Badge variant="outline" className="font-mono text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                      {lotNumber}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic mt-0.5 block">
                    No registrado en el turno
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">Fecha de Vencimiento del Lote:</span>
                {expirationDate ? (
                  <span className="font-medium text-foreground mt-0.5 block" suppressHydrationWarning>
                    {formatNominalDate(expirationDate, "medium")}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground italic mt-0.5 block">
                    No especificada
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Profesional de la Salud / Aplicador */}
          <div className="rounded-xl border bg-background p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold border-b pb-2">
              <Stethoscope className="h-4 w-4" />
              <span>Profesional de la Salud / Aplicador</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Enfermero / Aplicador:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {nurseName || "Personal de guardia / No especificado"}
                  </span>
                </div>
              </div>

              {nurseLicense && (
                <div>
                  <span className="text-xs text-muted-foreground block">Matrícula Profesional:</span>
                  <span className="font-mono font-medium text-foreground mt-0.5 block">
                    {nurseLicense}
                  </span>
                </div>
              )}

              {nurseSpecialty && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground block">Especialidad:</span>
                  <span className="font-medium text-foreground mt-0.5 block">
                    {nurseSpecialty}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notas Clínicas y Observaciones */}
          {vaccination.notes ? (
            <div className="rounded-xl border bg-muted/40 p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <FileText className="h-3.5 w-3.5" />
                <span>Notas Clínicas y Observaciones</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {vaccination.notes}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/20 p-3 text-center">
              <p className="text-xs text-muted-foreground italic">
                Sin notas clínicas adicionales para este registro.
              </p>
            </div>
          )}

          {/* Efectos Secundarios si existen */}
          {vaccination.side_effects && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/50 p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold text-xs uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>Efectos Secundarios Reportados</span>
              </div>
              <p className="text-sm text-amber-900 dark:text-amber-300 whitespace-pre-wrap leading-relaxed">
                {vaccination.side_effects}
              </p>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row justify-between gap-2">
          {vaccination.id ? (
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href={`/dashboard/turnos/${vaccination.id}`}>
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Ver Turno Completo
              </Link>
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
