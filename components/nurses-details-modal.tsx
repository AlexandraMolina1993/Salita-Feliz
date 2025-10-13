// src/components/nurses-details-modal.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { type Nurse } from '@/lib/supabase'

interface NursesDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  nurses: Nurse[]
  type: 'total' | 'activos' | 'inactivos'
}

export const NursesDetailsModal = ({
  isOpen,
  onClose,
  title,
  description,
  nurses,
  type,
}: NursesDetailsModalProps) => {
  const getStatusBadge = (is_active: boolean | undefined) => {
    if (is_active === undefined) {
      return <Badge variant="secondary">N/A</Badge>
    }
    switch (is_active) {
      case true:
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Activo</Badge>
      case false:
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Inactivo</Badge>
      default:
        return <Badge variant="secondary">N/A</Badge>
    }
  }

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-4/5 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nurses.map((nurse) => (
                <TableRow key={nurse.id}>
                  <TableCell className="font-medium">
                    {nurse.full_name}
                  </TableCell>
                  <TableCell>{nurse.license_number}</TableCell>
                  <TableCell>{nurse.phone}</TableCell>
                  <TableCell>{nurse.email}</TableCell>
                  <TableCell>{getStatusBadge(nurse.is_active)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}