// components/report-incident-dialog.tsx
"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { type Vaccine, type IncidentType } from "@/lib/database"; // Importar tipos

// Esquema de validación con Zod
const IncidentSchema = z.object({
    type: z.enum(['damage', 'cold_chain_failure', 'stock_error', 'other'], {
        required_error: "Debe seleccionar un tipo de incidente.",
    }),
    description: z.string().min(10, "La descripción es obligatoria y debe tener al menos 10 caracteres."),
    quantity_affected: z.coerce.number().min(0, "La cantidad no puede ser negativa").optional().nullable(),
});

type IncidentFormData = z.infer<typeof IncidentSchema>;

interface ReportIncidentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vaccine: Vaccine;
    isSubmitting: boolean;
    onSubmit: (data: IncidentFormData) => void;
}

export function ReportIncidentDialog({
    open,
    onOpenChange,
    vaccine,
    isSubmitting,
    onSubmit,
}: ReportIncidentDialogProps) {
    const form = useForm<IncidentFormData>({
        resolver: zodResolver(IncidentSchema),
        defaultValues: {
            type: 'damage',
            description: "",
            quantity_affected: null,
        },
    });

    const handleSubmit = (data: IncidentFormData) => {
        onSubmit(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Reportar Problema con {vaccine.name}</DialogTitle>
                    <DialogDescription>
                        Documente un incidente (daño, falla de frío, error de stock, etc.).
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        
                        {/* Tipo de Incidente */}
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Incidente</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione el tipo de incidente" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="damage">Daño Físico / Descarte</SelectItem>
                                            <SelectItem value="cold_chain_failure">Falla de Cadena de Frío</SelectItem>
                                            <SelectItem value="stock_error">Error de Conteo / Lote</SelectItem>
                                            <SelectItem value="other">Otro Incidente</SelectItem>
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
                                    <FormLabel>Cantidad Afectada (dosis)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            {...field}
                                            value={field.value ?? ''} // Maneja null para el input number
                                            onChange={e => {
                                                const value = parseFloat(e.target.value);
                                                field.onChange(isNaN(value) ? null : value);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Descripción */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción y Acciones Tomadas</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Detalle el problema, la causa y las acciones inmediatas que tomó (ej: la nevera falló, se trasladaron las vacunas a la nevera B)."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full care-gradient" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                'Registrar Incidente'
                            )}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}