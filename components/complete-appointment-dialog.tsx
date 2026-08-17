'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Syringe,
  AlertCircle,
  Loader2,
  User,
  FlaskConical,
  MapPin,
  FileText,
  Clock,
} from 'lucide-react';
import { completeAppointmentAction } from '@/app/actions/appointments';
import { useToast } from '@/hooks/use-toast';
import type { Appointment } from '@/lib/database';

interface CompleteAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: (Appointment & {
    patients?: { id?: string; full_name?: string; dni?: string } | null;
    nurses?: { id?: string; full_name?: string; license_number?: string } | null;
    vaccines?: { id?: string; name?: string; dose_amount?: number; lot_number?: string; net_content?: string } | null;
  }) | null;
  onSuccess: () => void;
}

const INJECTION_SITES = [
  { value: 'Deltoides Brazo Izquierdo', label: 'Deltoides Brazo Izquierdo (IM)' },
  { value: 'Deltoides Brazo Derecho', label: 'Deltoides Brazo Derecho (IM)' },
  { value: 'Vasto Lateral Muslo Izquierdo', label: 'Vasto Lateral Muslo Izquierdo (IM)' },
  { value: 'Vasto Lateral Muslo Derecho', label: 'Vasto Lateral Muslo Derecho (IM)' },
  { value: 'Subcutánea Brazo Izquierdo', label: 'Subcutánea Brazo Izquierdo (SC)' },
  { value: 'Subcutánea Brazo Derecho', label: 'Subcutánea Brazo Derecho (SC)' },
  { value: 'Oral', label: 'Vía Oral' },
  { value: 'Intradérmica', label: 'Intradérmica (ID)' },
];

export function CompleteAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onSuccess,
}: CompleteAppointmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultDose =
    appointment?.vaccines?.dose_amount ??
    (appointment?.vaccines?.net_content ? (parseFloat(appointment.vaccines.net_content) || 0.5) : 0.5);

  const [doseMl, setDoseMl] = useState<number>(defaultDose);
  const [lotNumber, setLotNumber] = useState<string>('');
  const [siteOfInjection, setSiteOfInjection] = useState<string>('Deltoides Brazo Izquierdo');
  const [notes, setNotes] = useState<string>('');
  const [sideEffects, setSideEffects] = useState<string>('');

  useEffect(() => {
    if (appointment) {
      const vDose =
        appointment.vaccines?.dose_amount ??
        (appointment.vaccines?.net_content ? (parseFloat(appointment.vaccines.net_content) || 0.5) : 0.5);
      setDoseMl(vDose);
      setLotNumber(appointment.vaccines?.lot_number || '');
      setSiteOfInjection('Deltoides Brazo Izquierdo');
      setNotes('');
      setSideEffects('');
    }
  }, [appointment]);

  if (!appointment) return null;

  const patientName = appointment.patients?.full_name || 'Paciente';
  const vaccineName = appointment.vaccines?.name || 'Vacuna no especificada';
  const nurseName = appointment.nurses?.full_name || 'Enfermero en guardia';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!doseMl || doseMl <= 0) {
      toast({
        title: 'Dosis inválida',
        description: 'La dosis aplicada debe ser un valor numérico mayor a 0 ml.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await completeAppointmentAction({
        appointmentId: appointment.id,
        doseMl: Number(doseMl),
        nurseId: appointment.nurse_id || null,
        lotNumber: lotNumber.trim() || null,
        siteOfInjection: siteOfInjection || null,
        notes: notes.trim() || null,
        sideEffects: sideEffects.trim() || null,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Error al completar el turno.');
      }

      const res = response.data;

      toast({
        title: 'Turno Completado con Éxito',
        description: `Vacunación registrada: ${res.vaccine_name || vaccineName}. Dosis: ${res.applied_dose_ml || doseMl} ml (${res.vials_consumed || 1} vial consumido). Stock restante: ${res.remaining_stock_vials ?? 'Actualizado'} viales.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('[CompleteAppointmentDialog] Error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo completar el turno ni deducir el stock.';

      // Interceptamos alertas de validación clínica, operativa o de stock para UX amigable
      const isWarningAlert =
        errorMessage.includes('ALERTA CLÍNICA') ||
        errorMessage.includes('ALERTA OPERATIVA') ||
        errorMessage.includes('ALERTA DE SISTEMA') ||
        errorMessage.includes('Stock insuficiente');

      if (isWarningAlert) {
        let title = 'Acción denegada por seguridad';
        if (errorMessage.includes('ALERTA CLÍNICA')) {
          title = 'Validación Clínica';
        } else if (errorMessage.includes('ALERTA OPERATIVA')) {
          title = 'Validación Operativa';
        }

        toast({
          title,
          description: errorMessage,
          variant: 'warning',
        });
      } else {
        toast({
          title: 'Fallo al procesar el turno',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        {/* Header con gradiente médico */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Syringe className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                Completar y Registrar Vacunación
              </DialogTitle>
              <DialogDescription className="text-blue-100 text-xs mt-1">
                Deducción atómica de inventario en tiempo real (RPC PostgreSQL)
              </DialogDescription>
            </div>
          </div>

          {/* Tarjeta de Resumen Rápido del Turno */}
          <div className="mt-4 grid grid-cols-2 gap-2 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-xs text-white">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-blue-200" />
              <span className="font-semibold truncate">{patientName}</span>
            </div>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-blue-200" />
              <span className="font-semibold truncate">{vaccineName}</span>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dosis en ml */}
            <div className="space-y-1.5">
              <Label htmlFor="dose-ml" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Syringe className="h-3.5 w-3.5 text-blue-600" /> Dosis Aplicada (ml) *
              </Label>
              <Input
                id="dose-ml"
                type="number"
                step="0.01"
                min="0.01"
                value={doseMl}
                onChange={(e) => setDoseMl(parseFloat(e.target.value) || 0)}
                placeholder="ej: 0.5"
                required
                className="font-medium text-slate-800 border-slate-200 focus:border-blue-500 rounded-xl"
              />
              <p className="text-[11px] text-slate-400">Volumen deducido del balance.</p>
            </div>

            {/* Número de Lote */}
            <div className="space-y-1.5">
              <Label htmlFor="lot-number" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <FlaskConical className="h-3.5 w-3.5 text-indigo-600" /> N° de Lote / Batch
              </Label>
              <Input
                id="lot-number"
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="ej: LOT-2026-X89"
                className="font-medium text-slate-800 border-slate-200 focus:border-blue-500 rounded-xl font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400">Trazabilidad sanitaria.</p>
            </div>
          </div>

          {/* Sitio de Aplicación */}
          <div className="space-y-1.5">
            <Label htmlFor="injection-site" className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-sky-600" /> Sitio Anatómico de Aplicación
            </Label>
            <Select value={siteOfInjection} onValueChange={setSiteOfInjection}>
              <SelectTrigger id="injection-site" className="rounded-xl border-slate-200">
                <SelectValue placeholder="Seleccionar vía y sitio" />
              </SelectTrigger>
              <SelectContent>
                {INJECTION_SITES.map((site) => (
                  <SelectItem key={site.value} value={site.value}>
                    {site.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observaciones clínicas */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-500" /> Observaciones Clínicas (Opcional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tolerancia del paciente, indicaciones de descanso, etc..."
              rows={2}
              className="resize-none border-slate-200 rounded-xl text-xs"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 px-5 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Procesando RPC...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirmar y Descontar Stock</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
