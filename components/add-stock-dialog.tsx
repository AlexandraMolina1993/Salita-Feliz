// components/add-stock-dialog.tsx
"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Vaccine } from "@/lib/database";

// Define las props que recibirá el componente
interface AddStockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vaccine: Vaccine;
    onStockAdded: () => void; // Función para recargar los datos
    isSubmitting: boolean;
    onSubmit: (data: { quantity: number, lot_number?: string, expiration_date?: Date | string | null }) => void;
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const numQuantity = Number(quantity);
        if (numQuantity <= 0 || isNaN(numQuantity)) {
            // Aquí puedes agregar un toast o mensaje de error local
            return; 
        }

        onSubmit({
            quantity: numQuantity,
            lot_number: lotNumber || undefined,
            expiration_date: expirationDate || null,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Agregar Stock a {vaccine.name}</DialogTitle>
                    <DialogDescription>
                        Añade nuevas unidades de inventario y opcionalmente actualiza el lote y la fecha de vencimiento.
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    {/* Cantidad de Stock */}
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Cantidad a Agregar</Label>
                        <Input
                            id="quantity"
                            type="number"
                            placeholder="Ej: 50"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="1"
                            required
                        />
                        <p className="text-sm text-muted-foreground">Stock actual: {vaccine.stock_quantity}</p>
                    </div>

                    {/* Número de Lote (Opcional) */}
                    <div className="space-y-2">
                        <Label htmlFor="lotNumber">Número de Lote (Opcional)</Label>
                        <Input
                            id="lotNumber"
                            placeholder={vaccine.lot_number || "Nuevo Lote"}
                            value={lotNumber}
                            onChange={(e) => setLotNumber(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Si se ingresa, reemplazará el lote actual: <span className="font-medium">{vaccine.lot_number || 'N/A'}</span></p>
                    </div>

                    {/* Fecha de Vencimiento (Opcional) */}
                    <div className="space-y-2">
                        <Label htmlFor="expirationDate">Fecha de Vencimiento (Opcional)</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !expirationDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {expirationDate ? (
                                        format(expirationDate, "PPP", { locale: es })
                                    ) : (
                                        <span>Seleccionar fecha</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={expirationDate}
                                    onSelect={setExpirationDate}
                                    initialFocus
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">Reemplazará la fecha actual: <span className="font-medium">{vaccine.expiration_date ? format(new Date(vaccine.expiration_date), "dd/MM/yyyy", { locale: es }) : 'N/A'}</span></p>
                    </div>

                    {/* Botón de envío */}
                    <Button type="submit" disabled={isSubmitting || Number(quantity) <= 0 || isNaN(Number(quantity))}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? "Agregando..." : "Confirmar Stock"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};