// components/add-stock-dialog.tsx
"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Loader2, PackagePlus, ShieldCheck } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ExtendedVaccineItem } from "@/app/actions/vaccines";
import type { Vaccine } from "@/lib/database";

interface AddStockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vaccine: ExtendedVaccineItem | Vaccine;
    onStockAdded?: () => void;
    isSubmitting: boolean;
    onSubmit: (data: { 
        quantity: number; 
        lot_number?: string; 
        expiration_date?: Date | string | null;
        notes?: string | null;
    }) => Promise<void> | void;
}

export const AddStockDialog: React.FC<AddStockDialogProps> = ({
    open,
    onOpenChange,
    vaccine,
    onStockAdded,
    isSubmitting,
    onSubmit,
}) => {
    const [quantity, setQuantity] = useState<number | string>("");
    const [lotNumber, setLotNumber] = useState<string>("");
    const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
    const [notes, setNotes] = useState<string>("");

    const currentVials = Number(
        (vaccine as ExtendedVaccineItem).physical_vials ?? 
        (vaccine as ExtendedVaccineItem).current_stock_vials ?? 
        vaccine.stock_quantity ?? 
        0
    );

    const doseAmount = Number((vaccine as any).dose_amount || 0.5);
    const netContent = Number((vaccine as any).net_content || 5.0);
    const numQuantity = Number(quantity) || 0;
    const additionalMl = numQuantity * netContent;
    const additionalDoses = Math.floor(additionalMl / (doseAmount || 0.5));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (numQuantity <= 0 || isNaN(numQuantity)) {
            return; 
        }

        try {
            await onSubmit({
                quantity: numQuantity,
                lot_number: lotNumber.trim() || undefined,
                expiration_date: expirationDate || null,
                notes: notes.trim() || null,
            });

            // Limpiar estado y cerrar
            setQuantity("");
            setLotNumber("");
            setExpirationDate(undefined);
            setNotes("");
            onOpenChange(false);
            if (onStockAdded) onStockAdded();
        } catch (err) {
            console.error("[AddStockDialog] Error al agregar stock:", err);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
                        <PackagePlus className="h-5 w-5 text-emerald-600" />
                        Ingreso de Stock (Viales Físicos)
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Registra un movimiento inmutable de entrada en el Ledger para <span className="font-semibold text-slate-700">{vaccine.name}</span>.
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="grid gap-4 py-2">
                    {/* Cantidad de Stock */}
                    <div className="space-y-1.5">
                        <Label htmlFor="quantity" className="text-xs font-bold text-slate-700">
                            Cantidad de Viales a Ingresar <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            id="quantity"
                            type="number"
                            placeholder="Ej: 50"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="1"
                            step="1"
                            required
                            className="h-10 rounded-xl"
                        />
                        <div className="flex justify-between items-center text-[11px] text-muted-foreground px-1">
                            <span>Stock actual: <strong className="text-slate-700">{currentVials} viales</strong></span>
                            {numQuantity > 0 && (
                                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    Nuevo total: {currentVials + numQuantity} viales (+{additionalDoses} dosis)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Número de Lote (Opcional) */}
                    <div className="space-y-1.5">
                        <Label htmlFor="lotNumber" className="text-xs font-bold text-slate-700">
                            Número de Lote (Opcional)
                        </Label>
                        <Input
                            id="lotNumber"
                            placeholder={vaccine.lot_number || "Ej: LOTE-2026-X"}
                            value={lotNumber}
                            onChange={(e) => setLotNumber(e.target.value)}
                            className="h-10 rounded-xl"
                        />
                        <p className="text-[11px] text-slate-400">
                            Lote actual: <span className="font-medium text-slate-600">{vaccine.lot_number || 'No especificado'}</span>
                        </p>
                    </div>

                    {/* Fecha de Vencimiento (Opcional) */}
                    <div className="space-y-1.5">
                        <Label htmlFor="expirationDate" className="text-xs font-bold text-slate-700">
                            Fecha de Vencimiento del Lote (Opcional)
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal h-10 rounded-xl border-slate-200",
                                        !expirationDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                                    {expirationDate ? (
                                        format(expirationDate, "PPP", { locale: es })
                                    ) : (
                                        <span>Seleccionar fecha de expiración</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={expirationDate}
                                    onSelect={setExpirationDate}
                                    initialFocus
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Observaciones / Remito */}
                    <div className="space-y-1.5">
                        <Label htmlFor="notes" className="text-xs font-bold text-slate-700">
                            Observaciones / Nro. de Remito o Factura
                        </Label>
                        <Textarea
                            id="notes"
                            placeholder="Ej: Remito Nro. #88392 - Droguería Central del Ministerio"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="resize-none h-16 rounded-xl text-xs"
                        />
                    </div>

                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-900">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Ledger Inmutable:</span> Al confirmar, se insertará un movimiento oficial de inventario tipo <code className="font-mono bg-emerald-100/80 px-1 py-0.5 rounded text-[11px]">IN (REPLENISHMENT)</code> y se recalcularán automáticamente los balances clínicos.
                        </div>
                    </div>

                    {/* Botón de envío */}
                    <Button 
                        type="submit" 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-11 transition-all shadow-sm"
                        disabled={isSubmitting || numQuantity <= 0}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Registrando en Ledger...
                            </>
                        ) : (
                            `Confirmar Ingreso de ${numQuantity > 0 ? numQuantity : ''} Viales`
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};