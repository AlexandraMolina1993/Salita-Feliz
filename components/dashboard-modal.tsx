'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { type Vaccine, type Patient, type Nurse, type Appointment } from '@/lib/supabase'

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
                      <TableCell>{new Date(patient.birth_date).toLocaleDateString()}</TableCell>
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
                <TableHead>Fabricante</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, idx) => {
                // Type guard for Vaccine
                if (
                  item &&
                  typeof item === 'object' &&
                  'name' in item &&
                  'stock_quantity' in item &&
                  'min_stock_level' in item
                ) {
                  const vaccine = item as Vaccine
                  return (
                    <TableRow key={vaccine.id}>
                      <TableCell>{vaccine.name}</TableCell>
                      <TableCell>{vaccine.manufacturer}</TableCell>
                      <TableCell>{vaccine.type}</TableCell>
                      <TableCell>{vaccine.lot_number}</TableCell>
                      <TableCell>{vaccine.stock_quantity}</TableCell>
                      <TableCell>{vaccine.expiration_date ? new Date(vaccine.expiration_date).toLocaleDateString() : 'N/A'}</TableCell>
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
          <TableCell>{new Date(appointment.appointment_date).toLocaleDateString()}</TableCell>
          <TableCell>{appointment.appointment_time}</TableCell>
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