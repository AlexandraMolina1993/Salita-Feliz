// components/report-incident-dialog.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, ShieldAlert, AlertCircle } from "lucide-react";
import type { ExtendedVaccineItem } from "@/app/actions/vaccines";
import type { Vaccine, IncidentType } from "@/lib/database";

const IncidentSchema = z.object({
    type: z.enum(['damage', 'cold_chain_failure', 'stock_error', 'other'], {
        required_error: "Debe seleccionar un tipo de incidente.",
    }),
    description: z.string().min(4, "La descripción debe tener al menos 4 caracteres."),
    quantity_affected: z.preprocess(
        (val) => (val === '' || val === null || val === undefined || isNaN(Number(val)) ? null : Number(val)),
        z.number().min(0, "La cantidad no puede ser negativa").nullable().optional()
    ),
    deduct_from_stock: z.boolean().default(true),
});

export type IncidentFormData = z.infer<typeof IncidentSchema>;

interface ReportIncidentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vaccine: ExtendedVaccineItem | Vaccine;
    isSubmitting: boolean;
    onSubmit: (data: IncidentFormData) => Promise<void> | void;
}

export function ReportIncidentDialog({
    open,
    onOpenChange,
    vaccine,
    isSubmitting,
    onSubmit,
}: ReportIncidentDialogProps) {
    const router = useRouter();
    const [localSubmitting, setLocalSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const currentVials = Number(
        (vaccine as ExtendedVaccineItem).physical_vials ?? 
        (vaccine as ExtendedVaccineItem).current_stock_vials ?? 
        vaccine.stock_quantity ?? 
        0
    );

    const form = useForm<IncidentFormData>({
        resolver: zodResolver(IncidentSchema),
        defaultValues: {
            type: 'damage',
            description: "",
            quantity_affected: null,
            deduct_from_stock: true,
        },
    });

    useEffect(() => {
        if (open) {
            setSubmitError(null);
            form.reset({
                type: 'damage',
                description: "",
                quantity_affected: null,
                deduct_from_stock: true,
            });
        }
    }, [open, form]);

    const handleFormSubmit = async (data: IncidentFormData) => {
        setSubmitError(null);
        setLocalSubmitting(true);
        try {
            await onSubmit(data);
            form.reset();
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("[ReportIncidentDialog] Error al registrar incidente:", error);
            setSubmitError(error instanceof Error ? error.message : "Error al guardar el reporte en la base de datos.");
        } finally {
            setLocalSubmitting(false);
        }
    };

    const isPending = isSubmitting || localSubmitting;
    const watchQuantity = form.watch('quantity_affected');
    const watchDeduct = form.watch('deduct_from_stock');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-rose-700 text-lg font-bold">
                        <AlertTriangle className="h-5 w-5 text-rose-600" />
                        Reportar Incidente de Inventario
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Registra formalmente una incidencia en <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">incident_reports</code> para <strong className="text-slate-700">{vaccine.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
                        {/* Tipo de Incidente */}
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700">
                                        Tipo de Incidente <span className="text-rose-500">*</span>
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-10 rounded-xl">
                                                <SelectValue placeholder="Seleccione el tipo de incidente" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="damage">💥 Daño Físico / Rotura de Viales</SelectItem>
                                            <SelectItem value="cold_chain_failure">❄️ Falla de Cadena de Frío / Excursión Térmica</SelectItem>
                                            <SelectItem value="stock_error">⚠️ Error de Conteo / Discrepancia Física</SelectItem>
                                            <SelectItem value="other">📋 Otro Incidente Operativo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Cantidad Afectada */}
                        <FormField
                            control={form.control}
                            name="quantity_affected"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700">
                                        Cantidad Afectada (Viales Físicos)
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            min="0"
                                            max={currentVials > 0 ? currentVials : undefined}
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                field.onChange(val === '' ? null : Number(val));
                                            }}
                                            className="h-10 rounded-xl"
                                        />
                                    </FormControl>
                                    <FormDescription className="text-[11px] text-slate-500">
                                        Stock actual disponible en heladera: <strong className="text-slate-800">{currentVials} viales</strong>
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Deducción en Stock (Merma) */}
                        <FormField
                            control={form.control}
                            name="deduct_from_stock"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-xs font-bold text-slate-800 cursor-pointer">
                                            Descontar del inventario físico (Merma)
                                        </FormLabel>
                                        <p className="text-[11px] text-slate-500">
                                            Inserta un movimiento negativo en <code className="font-mono text-slate-700">stock_movements</code>
                                        </p>
                                    </div>
                                    <FormControl>
                                        <input
                                            type="checkbox"
                                            checked={field.value}
                                            onChange={field.onChange}
                                            className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* Descripción */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700">
                                        Descripción y Acciones Correctivas <span className="text-rose-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Detalle la causa del problema y las acciones tomadas..."
                                            className="resize-none h-20 rounded-xl text-xs"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {watchQuantity !== null && Number(watchQuantity) > 0 && watchDeduct && (
                            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200 flex items-start gap-2.5 text-xs text-rose-900">
                                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">Ajuste Inmediato de Stock:</span> Se descontarán <strong className="text-rose-700">{watchQuantity} viales</strong> del balance dinámico en tiempo real de la vacuna.
                                </div>
                            </div>
                        )}

                        {submitError && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                                <span>{submitError}</span>
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold h-11 transition-all shadow-sm cursor-pointer" 
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Registrando Incidente...
                                </>
                            ) : (
                                'Registrar Incidente en Base de Datos'
                            )}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}