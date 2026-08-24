// components/schedule-replenishment-dialog.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar as CalendarIcon, CalendarClock, Loader2, Sparkles, AlertCircle } from "lucide-react";

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
import { cn } from "@/lib/utils";
import type { ExtendedVaccineItem } from "@/app/actions/vaccines";
import type { Vaccine } from "@/lib/database";

const formSchema = z.object({
    quantity_to_order: z.coerce
        .number({ invalid_type_error: "Ingrese un número válido." })
        .int({ message: "La cantidad debe ser un número entero." })
        .positive({ message: "La cantidad a solicitar debe ser mayor a 0." }),
    scheduled_date: z.date({
        required_error: "Debe seleccionar una fecha estimada de llegada.",
        invalid_type_error: "Debe seleccionar una fecha válida.",
    }),
    notes: z.string().max(250, {
        message: "Las notas no pueden exceder los 250 caracteres.",
    }).optional().nullable(),
});

type ReplenishmentFormValues = z.infer<typeof formSchema>;

interface ScheduleReplenishmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vaccine: ExtendedVaccineItem | Vaccine;
    isSubmitting: boolean;
    onSubmit: (data: {
        scheduled_date: string;
        quantity_to_order: number;
        notes?: string | null;
    }) => Promise<void> | void;
}

export function ScheduleReplenishmentDialog({
    open,
    onOpenChange,
    vaccine,
    isSubmitting,
    onSubmit,
}: ScheduleReplenishmentDialogProps) {
    const router = useRouter();
    const [localSubmitting, setLocalSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const currentVials = Number(
        (vaccine as ExtendedVaccineItem).physical_vials ?? 
        (vaccine as ExtendedVaccineItem).current_stock_vials ?? 
        vaccine.stock_quantity ?? 
        0
    );
    const minStock = Number(vaccine.min_stock_level || 10);
    
    // Sugerencia inteligente: cubrir el déficit hasta el stock mínimo o lote estándar de 20
    const deficit = Math.max(0, minStock - currentVials);
    const suggestedQuantity = deficit > 0 ? deficit : 20;

    const form = useForm<ReplenishmentFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            quantity_to_order: suggestedQuantity,
            notes: "",
        },
    });

    useEffect(() => {
        if (open) {
            setSubmitError(null);
            form.reset({
                quantity_to_order: suggestedQuantity,
                notes: "",
                scheduled_date: undefined,
            });
        }
    }, [open, suggestedQuantity, form]);

    const handleFormSubmit = async (values: ReplenishmentFormValues) => {
        setSubmitError(null);
        setLocalSubmitting(true);
        try {
            const dateString = format(values.scheduled_date, 'yyyy-MM-dd');

            await onSubmit({
                scheduled_date: dateString,
                quantity_to_order: values.quantity_to_order,
                notes: values.notes?.trim() || null,
            });

            form.reset();
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("[ScheduleDialog] Error al programar reposición:", error);
            setSubmitError(error instanceof Error ? error.message : "Error al guardar en la base de datos.");
        } finally {
            setLocalSubmitting(false);
        }
    };

    const isPending = isSubmitting || localSubmitting;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
                        <CalendarClock className="h-5 w-5 text-sky-600" />
                        Programar Reposición de Inventario
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Genera una orden formal en <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">replenishment_schedules</code> para <strong className="text-slate-700">{vaccine.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
                        {/* Resumen de Stock Actual y Mínimo */}
                        <div className="grid grid-cols-2 gap-2 text-center p-2.5 bg-sky-50/60 rounded-xl border border-sky-100">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-sky-800 tracking-wider">Stock Actual</span>
                                <p className="text-base font-black text-sky-950">{currentVials} viales</p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mínimo Requerido</span>
                                <p className="text-base font-black text-slate-800">{minStock} viales</p>
                            </div>
                        </div>

                        {/* Campo de Cantidad a Ordenar */}
                        <FormField
                            control={form.control}
                            name="quantity_to_order"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700">
                                        Cantidad de Viales a Solicitar <span className="text-rose-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder={suggestedQuantity.toString()}
                                            min="1"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                field.onChange(val === '' ? '' : Number(val));
                                            }}
                                            className="h-10 rounded-xl"
                                        />
                                    </FormControl>
                                    <FormDescription className="text-[11px] text-sky-700 flex items-center gap-1 font-medium">
                                        <Sparkles className="h-3 w-3" />
                                        Sugerido por IA/Sistema: <strong>{suggestedQuantity} viales</strong>
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
                                    <FormLabel className="text-xs font-bold text-slate-700">
                                        Fecha Estimada de Recepción <span className="text-rose-500">*</span>
                                    </FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    type="button"
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal h-10 rounded-xl border-slate-200",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: es })
                                                    ) : (
                                                        <span>Seleccionar fecha estimada de llegada</span>
                                                    )}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    return date < today;
                                                }}
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
                                    <FormLabel className="text-xs font-bold text-slate-700">Notas / Proveedor / Prioridad</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Detalles sobre el proveedor, urgencia o número de expediente..."
                                            className="resize-none h-16 rounded-xl text-xs"
                                            {...field}
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {submitError && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                                <span>{submitError}</span>
                            </div>
                        )}

                        {/* Botón de Enviar */}
                        <Button 
                            type="submit" 
                            className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold h-11 transition-all shadow-sm cursor-pointer" 
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Programando Reposición...
                                </>
                            ) : (
                                "Guardar Programación en Base de Datos"
                            )}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}