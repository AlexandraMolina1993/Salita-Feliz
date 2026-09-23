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
  Phone,
  Mail,
  FileText,
  Hash,
  AlertTriangle,
  Building,
  Edit,
  ExternalLink,
  CalendarCheck,
} from "lucide-react"
import Link from "next/link"
import type { Appointment } from "@/lib/database"
import {
  formatFullSpanishDate,
  formatNominalDate,
  formatNominalTime,
  isTodayInArgentina,
} from "@/lib/dateUtils"

interface TurnoDetailsModalProps {
  turno: Appointment | null
  isOpen?: boolean
  open?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
}

export function TurnoDetailsModal({
  turno,
  isOpen,
  open,
  onClose,
  onOpenChange,
}: TurnoDetailsModalProps) {
  const isDialogOpen = open !== undefined ? open : (isOpen ?? false)

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen)
    }
    if (!newOpen && onClose) {
      onClose()
    }
  }

  if (!turno) return null

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Completado
          </Badge>
        )
      case "cancelled":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            Cancelado
          </Badge>
        )
      case "scheduled":
      default:
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 shadow-sm">
            <AlertCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            Programado
          </Badge>
        )
    }
  }

  const isToday = isTodayInArgentina(turno.appointment_date)

  // Determinar dosis a mostrar
  const doseDisplay =
    turno.dose_applied !== undefined && turno.dose_applied !== null
      ? `${turno.dose_applied} ml (aplicada)`
      : turno.dose_to_apply !== undefined && turno.dose_to_apply !== null
      ? `${turno.dose_to_apply} ml (indicada)`
      : turno.vaccines?.dose_amount
      ? `${turno.vaccines.dose_amount} ml`
      : null

  const lotDisplay = turno.vaccines?.lot_number || null

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border bg-card shadow-2xl">
        {/* Encabezado con estética clínica */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                  Detalles del Turno
                </DialogTitle>
                {isToday && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold">
                    HOY
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-sm text-muted-foreground">
                Ficha clínica de programación y aplicación de dosis
              </DialogDescription>
            </div>
            <div className="self-start sm:self-center">
              {getStatusBadge(turno.status)}
            </div>
          </div>
        </DialogHeader>

        {/* Contenido Principal */}
        <div className="p-6 space-y-6">
          {/* Card Horario y Fecha destacada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/60 dark:border-blue-900/50 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-sm">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Fecha Programada
                </p>
                <p className="text-sm font-bold text-foreground" suppressHydrationWarning>
                  {formatFullSpanishDate(turno.appointment_date)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Hora de Atención
                </p>
                <p className="text-sm font-bold text-foreground" suppressHydrationWarning>
                  {formatNominalTime(turno.appointment_time, true)}
                </p>
              </div>
            </div>
          </div>

          {/* Información del Paciente */}
          <div className="rounded-xl border bg-background p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <User className="h-4 w-4" />
                <span>Datos del Paciente</span>
              </div>
              {turno.patient_id && (
                <Link
                  href={`/dashboard/pacientes/${turno.patient_id}`}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 font-medium hover:underline"
                >
                  Ver Ficha Paciente
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Nombre Completo:</span>
                <span className="font-semibold text-foreground">
                  {turno.patients?.full_name || "Paciente no especificado"}
                </span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block">DNI / Documento:</span>
                <span className="font-mono font-medium text-foreground">
                  {turno.patients?.dni || "Sin registrar"}
                </span>
              </div>

              {turno.patients?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Teléfono:</span>
                  <span className="font-medium text-foreground">{turno.patients.phone}</span>
                </div>
              )}

              {turno.patients?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Email:</span>
                  <span className="font-medium text-foreground truncate max-w-[200px]" title={turno.patients.email}>
                    {turno.patients.email}
                  </span>
                </div>
              )}

              {turno.patients?.health_insurance && (
                <div>
                  <span className="text-xs text-muted-foreground block">Obra Social / Prepaga:</span>
                  <span className="font-medium text-foreground">{turno.patients.health_insurance}</span>
                </div>
              )}

              {turno.patients?.allergies && (
                <div className="sm:col-span-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-400 block">
                      Alergias Conocidas:
                    </span>
                    <span className="text-xs text-amber-900 dark:text-amber-300 font-medium">
                      {turno.patients.allergies}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Información de la Vacuna */}
          <div className="rounded-xl border bg-background p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Syringe className="h-4 w-4" />
                <span>Vacuna Asignada</span>
              </div>
              {turno.vaccine_id && (
                <Link
                  href={`/dashboard/vacunas/${turno.vaccine_id}`}
                  className="text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 flex items-center gap-1 font-medium hover:underline"
                >
                  Ver Ficha Vacuna
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="sm:col-span-2">
                <span className="text-xs text-muted-foreground block">Denominación:</span>
                <span className="font-bold text-base text-foreground">
                  {turno.vaccines?.name || "Vacuna no especificada"}
                </span>
              </div>

              {turno.vaccines?.manufacturer && (
                <div className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Laboratorio:</span>
                    <span className="font-medium text-foreground">{turno.vaccines.manufacturer}</span>
                  </div>
                </div>
              )}

              {lotDisplay && (
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Lote de Vacuna:</span>
                    <span className="font-mono font-medium text-foreground">{lotDisplay}</span>
                  </div>
                </div>
              )}

              {doseDisplay && (
                <div>
                  <span className="text-xs text-muted-foreground block">Dosis:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{doseDisplay}</span>
                </div>
              )}

              {turno.vaccines?.type && (
                <div>
                  <span className="text-xs text-muted-foreground block">Tipo / Categoría:</span>
                  <span className="font-medium text-foreground">{turno.vaccines.type}</span>
                </div>
              )}
            </div>
          </div>

          {/* Información del Enfermero / Aplicador */}
          <div className="rounded-xl border bg-background p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold border-b pb-2">
              <Stethoscope className="h-4 w-4" />
              <span>Profesional de la Salud / Aplicador</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Enfermero Asignado:</span>
                <span className="font-semibold text-foreground">
                  {turno.nurses?.full_name || "Enfermero de guardia"}
                </span>
              </div>

              {turno.nurses?.license_number && (
                <div>
                  <span className="text-xs text-muted-foreground block">Matrícula Profesional:</span>
                  <span className="font-mono font-medium text-foreground">
                    {turno.nurses.license_number}
                  </span>
                </div>
              )}

              {turno.nurses?.specialty && (
                <div>
                  <span className="text-xs text-muted-foreground block">Especialidad:</span>
                  <span className="font-medium text-foreground">{turno.nurses.specialty}</span>
                </div>
              )}

              {turno.nurses?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Contacto:</span>
                  <span className="font-medium text-foreground">{turno.nurses.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Información de Cierre / Finalización si está completado */}
          {turno.status === "completed" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50 p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Registro de Inmunización Efectiva</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {turno.vaccination_date && (
                  <div>
                    <span className="text-xs text-emerald-800/80 dark:text-emerald-400 block">
                      Fecha de Inoculación:
                    </span>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200" suppressHydrationWarning>
                      {formatNominalDate(turno.vaccination_date, "medium")}
                    </span>
                  </div>
                )}
                {turno.side_effects && (
                  <div className="sm:col-span-2">
                    <span className="text-xs text-emerald-800/80 dark:text-emerald-400 block">
                      Efectos Secundarios Registrados:
                    </span>
                    <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                      {turno.side_effects}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observaciones y Notas Clínicas */}
          {turno.notes && (
            <div className="rounded-xl border bg-muted/40 p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <FileText className="h-3.5 w-3.5" />
                <span>Notas Clínicas / Observaciones</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {turno.notes}
              </p>
            </div>
          )}

          {/* Metadatos de Auditoría (Fecha de creación / ID) */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1.5 font-mono">
              <span>ID:</span>
              <span className="truncate max-w-[120px]" title={turno.id}>
                {turno.id}
              </span>
            </div>
            {turno.created_at && (
              <div className="flex items-center gap-1" suppressHydrationWarning>
                <CalendarCheck className="h-3 w-3" />
                <span>Registrado el {formatNominalDate(turno.created_at, "short")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pie del modal con acciones */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row justify-between gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            {turno.id && (
              <>
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial">
                  <Link href={`/dashboard/turnos/${turno.id}`}>
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Ficha Completa
                  </Link>
                </Button>
                {turno.status === "scheduled" && (
                  <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial">
                    <Link href={`/dashboard/turnos/${turno.id}/editar`}>
                      <Edit className="h-4 w-4 mr-1.5" />
                      Editar
                    </Link>
                  </Button>
                )}
              </>
            )}
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => handleOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
