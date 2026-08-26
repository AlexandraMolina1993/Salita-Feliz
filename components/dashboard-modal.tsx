'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { type Vaccine, type Patient, type Nurse, type Appointment } from '@/lib/supabase'
import { formatNominalDate, formatNominalTime } from '@/lib/dateUtils'

interface DashboardModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  data: (Vaccine | Patient | Nurse | Appointment)[]
  type: 'patients' | 'nurses' | 'vaccines' | 'appointments' | null
}

export function DashboardModal({ isOpen, onClose, title, data, type }: DashboardModalProps) {
  if (!isOpen) return null

  const renderTableContent = () => {
    if (data.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={5} className="text-center text-gray-500">
              No hay datos para mostrar.
            </TableCell>
          </TableRow>
        </TableBody>
      )
    }

    switch (type) {
      case 'patients':
        return (
          <>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Fecha de Nacimiento</TableHead>
                <TableHead>Género</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, idx) => {
                // Type guard for Patient
                if (
                  item &&
                  typeof item === 'object' &&
                  'dni' in item &&
                  'full_name' in item &&
                  'birth_date' in item
                ) {
                  const patient = item as Patient
                  return (
                    <TableRow key={patient.id}>
                      <TableCell>{patient.dni}</TableCell>
                      <TableCell>{patient.full_name}</TableCell>
                      <TableCell suppressHydrationWarning>{formatNominalDate(patient.birth_date)}</TableCell>
                      <TableCell>{patient.gender === 'male'? 'Masculino': patient.gender === 'female' ? 'Femenino': patient.gender}</TableCell>
                    </TableRow>
                  )
                }
                return null
              })}
            </TableBody>
          </>
        )
      case 'nurses':
        return (
          <>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, idx) => {
                // Type guard for Nurse
                if (
                  item &&
                  typeof item === 'object' &&
                  'license_number' in item &&
                  'full_name' in item &&
                  'is_active' in item
                ) {
                  const nurse = item as Nurse
                  return (
                    <TableRow key={nurse.id}>
                      <TableCell>{nurse.dni}</TableCell>
                      <TableCell>{nurse.license_number}</TableCell>
                      <TableCell>{nurse.full_name}</TableCell>
                      <TableCell>
                        <Badge variant={nurse.is_active ? 'default' : 'destructive'}>
                          {nurse.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                }
                return null
              })}
            </TableBody>
          </>
        )
      case 'vaccines':
        return (
          <>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Laboratorio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Viales</TableHead>
                <TableHead>Volumen (ml)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, idx) => {
                if (item && typeof item === 'object' && 'name' in item) {
                  const anyV = item as any
                  const vials = Number(anyV.physical_vials ?? anyV.current_stock_vials ?? anyV.physical_vials_for_repos ?? anyV.stock_quantity ?? 0)
                  const ml = Number(anyV.total_ml ?? anyV.current_stock_ml ?? (vials * (Number(anyV.dose_amount) || 0.5)))
                  const lab = anyV.laboratory || anyV.manufacturer || 'N/A'
                  const status = anyV.stock_status || (vials === 0 ? 'OUT_OF_STOCK' : vials <= (anyV.min_stock_level || 10) ? 'CRITICAL_LOW' : 'OPTIMAL')
                  const expDate = anyV.expiration_date ? formatNominalDate(anyV.expiration_date) : 'N/A'
                  
                  return (
                    <TableRow key={anyV.vaccine_id || anyV.id || idx}>
                      <TableCell className="font-bold text-slate-800">{anyV.name}</TableCell>
                      <TableCell className="text-slate-600">{lab}</TableCell>
                      <TableCell className="text-slate-600">{anyV.type || '-'}</TableCell>
                      <TableCell className="font-black text-indigo-700">{vials} viales</TableCell>
                      <TableCell className="font-semibold text-slate-700">{typeof ml === 'number' ? ml.toFixed(1) : ml} ml</TableCell>
                      <TableCell>
                        {status === 'OPTIMAL' && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Óptimo</Badge>
                        )}
                        {status === 'CRITICAL_LOW' && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">Stock Bajo</Badge>
                        )}
                        {status === 'OUT_OF_STOCK' && (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-200">Sin Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell suppressHydrationWarning className="text-slate-500 text-xs">{expDate}</TableCell>
                    </TableRow>
                  )
                }
                return null
              })}
            </TableBody>
          </>
        )
      case 'appointments':
        return (
          <>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Vacuna</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
  {data.map((item, idx) => {
    // Type guard for Appointment
    if (
      item &&
      typeof item === 'object' &&
      'appointment_date' in item &&
      'appointment_time' in item &&
      'status' in item
    ) {
      const appointment = item as Appointment

      // Lógica para determinar el texto de estado y su variante (color)
      let statusText: string
      let badgeVariant: 'default' | 'destructive' | 'secondary' = 'secondary'

      switch (appointment.status) {
        case 'completed':
          statusText = 'Completado'
          badgeVariant = 'default' // Verde/Azul (éxito)
          break
        case 'cancelled':
          statusText = 'Cancelado'
          badgeVariant = 'destructive' // Rojo (peligro)
          break
        case 'scheduled':
        default: // Cualquier otro estado (como 'scheduled')
          statusText = 'Programado'
          badgeVariant = 'default' // Gris (neutro/informativo)
          break
      }

      return (
        <TableRow key={appointment.id}>
          <TableCell suppressHydrationWarning>{formatNominalDate(appointment.appointment_date)}</TableCell>
          <TableCell suppressHydrationWarning>{formatNominalTime(appointment.appointment_time, true)}</TableCell>
          <TableCell>{appointment.patients?.full_name || 'N/A'}</TableCell>
          <TableCell>{appointment.vaccines?.name || 'N/A'}</TableCell>
          <TableCell>
            {/* Se utiliza la variable `badgeVariant` para el color y `statusText` para el texto */}
            <Badge variant={badgeVariant}>
              {statusText}
            </Badge>
          </TableCell>
        </TableRow>
      )
    }
    return null
  })}
</TableBody>
          </>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] w-full">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {data.length > 0 ? "Listado detallado de los elementos." : "No hay datos para mostrar."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {data.length > 0 && <Table>{renderTableContent()}</Table>}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}