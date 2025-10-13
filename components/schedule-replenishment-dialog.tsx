// components/schedule-replenishment-dialog.tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar as CalendarIcon, Package, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils"; // Asegúrate de tener tu utilidad de clases de Tailwind

// Asume que la interfaz Vaccine está disponible a través de una importación o definida
interface Vaccine {
    id: string;
    name: string;
    min_stock_level: number;
    stock_quantity: number;
}

// 1. Esquema de Validación con Zod
const formSchema = z.object({
    quantity_to_order: z.preprocess(
        (a) => parseInt(z.string().min(1).parse(a), 10),
        z.number().int().positive({ message: "La cantidad debe ser un número entero positivo." })
    ),
    scheduled_date: z.date({
        required_error: "Debe seleccionar una fecha de recepción estimada.",
    }),
    notes: z.string().max(250, {
        message: "Las notas no pueden exceder los 250 caracteres.",
    }).optional().nullable(),
});

type ReplenishmentFormValues = z.infer<typeof formSchema>;

interface ScheduleReplenishmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vaccine: Vaccine;
    isSubmitting: boolean;
    onSubmit: (data: {
        scheduled_date: string,
        quantity_to_order: number,
        notes?: string | null
    }) => Promise<void>;
}

export function ScheduleReplenishmentDialog({
    open,
    onOpenChange,
    vaccine,
    isSubmitting,
    onSubmit,
}: ScheduleReplenishmentDialogProps) {
    // Calcular la cantidad sugerida: Mínimo (MinStock - StockActual), pero mínimo 1.
    const suggestedQuantity = Math.max(0, vaccine.min_stock_level - vaccine.stock_quantity);

    // 2. Inicialización del Formulario
    const form = useForm<ReplenishmentFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            quantity_to_order: suggestedQuantity > 0 ? suggestedQuantity : 1, // Sugerir el valor
            notes: "",
        },
    });

    const handleSubmit = async (values: ReplenishmentFormValues) => {
        // Formatear la fecha a YYYY-MM-DD (necesario para la DB simulada)
        const dateString = format(values.scheduled_date, 'yyyy-MM-dd');

        await onSubmit({
            scheduled_date: dateString,
            quantity_to_order: values.quantity_to_order,
            notes: values.notes,
        });

        // Resetear el formulario después del envío exitoso
        form.reset({
            quantity_to_order: Math.max(0, vaccine.min_stock_level - vaccine.stock_quantity),
            notes: "",
            scheduled_date: undefined,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <Package className="mr-2 h-5 w-5 text-primary" />
                        Programar Reposición
                    </DialogTitle>
                    <DialogDescription>
                        Planifica la próxima orden de compra para **{vaccine.name}**.
                        Stock Actual: **{vaccine.stock_quantity}** uds.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        {/* Campo de Cantidad a Ordenar */}
                        <FormField
                            control={form.control}
                            name="quantity_to_order"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cantidad a ordenar (unidades)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder={suggestedQuantity.toString()}
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value)}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Sugerido: **{suggestedQuantity}** unidades (para alcanzar el stock mínimo).
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Campo de Fecha de Recepción */}
                        <FormField
                            control={form.control}
                            name="scheduled_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Recepción Estimada</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: es })
                                                    ) : (
                                                        <span>Seleccionar fecha</span>
                                                    )}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                                                initialFocus
                                                locale={es}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Campo de Notas */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas Adicionales</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Detalles sobre el pedido, proveedor, etc."
                                            {...field}
                                            value={field.value || ""} // Manejar null/undefined
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Botón de Enviar */}
                        <Button type="submit" className="w-full care-gradient" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CalendarIcon className="mr-2 h-4 w-4" />
                            )}
                            {isSubmitting ? "Programando..." : "Programar Reposición"}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}