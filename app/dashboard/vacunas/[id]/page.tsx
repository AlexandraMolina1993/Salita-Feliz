// app/dashboard/vacunas/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    ArrowLeft,
    Edit,
    Package,
    Thermometer,
    Calendar,
    AlertTriangle,
    CheckCircle,
    Building,
    Hash,
    Loader2,
    Activity,
    Users,
    Stethoscope,
} from "lucide-react";

// NUEVAS IMPORTACIONES: Modales y Lista
import { AddStockDialog } from "@/components/add-stock-dialog"; 
import { ScheduleReplenishmentDialog } from "@/components/schedule-replenishment-dialog"; 
import { ReplenishmentScheduleList } from "@/components/replenishment-schedule-list"; 
import { ReportIncidentDialog } from "@/components/report-incident-dialog"; // El nuevo modal

import {
    getVaccineById,
    getVaccineStatsById,
    addStockToVaccine,
    getReplenishmentSchedulesByVaccineId, 
    scheduleReplenishment, 
    reportVaccineIncident, // <--- NUEVA FUNCIÓN DE LA DB
    type Vaccine,
    type ReplenishmentSchedule, 
    type IncidentType, // <--- NUEVO TIPO DE LA DB
} from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Define una interfaz para las estadísticas de uso
interface VaccineStats {
    monthly_applied: number;
    total_applied: number;
}

export default function VaccineDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    const [vaccine, setVaccine] = useState<Vaccine | null>(null);
    const [usageStats, setUsageStats] = useState<VaccineStats | null>(null);
    const [loading, setLoading] = useState(true);
    
    // --- ESTADOS DE GESTIÓN DE STOCK ---
    const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
    const [isSubmittingStock, setIsSubmittingStock] = useState(false);
    
    // --- ESTADOS DE REPOSICIÓN ---
    const [schedules, setSchedules] = useState<ReplenishmentSchedule[]>([]);
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
    const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

    // --- NUEVOS ESTADOS DE REPORTE DE PROBLEMAS ---
    const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
    const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
    
    
    useEffect(() => {
        if (params.id) {
            loadVaccineData(params.id as string);
        }
    }, [params.id]);

    const loadVaccineData = async (id: string) => {
        try {
            setLoading(true);
            // Llama a las TRES funciones en paralelo
            const [vaccineData, usageStatsData, schedulesData] = await Promise.all([
                getVaccineById(id),
                getVaccineStatsById(id),
                getReplenishmentSchedulesByVaccineId(id),
            ]);

            if (!vaccineData) {
                toast({
                    title: "Error",
                    description: "Vacuna no encontrada.",
                    variant: "destructive",
                });
                router.push("/dashboard/vacunas");
                return;
            }

            setVaccine(vaccineData);
            setUsageStats(usageStatsData);
            setSchedules(schedulesData); // SETEAR PROGRAMACIONES
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No se pudo cargar los datos de la vacuna y sus programaciones.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Maneja el envío del formulario para agregar stock.
     */
    const handleStockAdd = async ({ 
        quantity, 
        lot_number, 
        expiration_date 
    }: { 
        quantity: number, 
        lot_number?: string, 
        expiration_date?: Date | string | null 
    }) => {
        if (!vaccine) return;

        setIsSubmittingStock(true);
        try {
            const updatedVaccine = await addStockToVaccine(
                vaccine.id, 
                quantity, 
                lot_number, 
                expiration_date
            );

            setVaccine(updatedVaccine);
            
            if (vaccine.id) {
                getVaccineStatsById(vaccine.id).then(setUsageStats);
            }

            toast({
                title: "Stock Agregado",
                description: `Se han añadido ${quantity} unidades a ${vaccine.name}.`,
            });

            setIsStockDialogOpen(false); 

        } catch (error) {
            toast({
                title: "Error al agregar stock",
                description: error instanceof Error ? error.message : "Hubo un error desconocido.",
                variant: "destructive",
            });
        } finally {
            setIsSubmittingStock(false);
        }
    };

    /**
     * Maneja el envío del formulario para programar una reposición.
     */
    const handleScheduleReplenishment = async ({ 
        scheduled_date, 
        quantity_to_order, 
        notes 
    }: { 
        scheduled_date: string, 
        quantity_to_order: number, 
        notes?: string | null 
    }) => {
        if (!vaccine) return;

        setIsSubmittingSchedule(true);
        try {
            // Llamada a la función de base de datos (Supabase)
            const newSchedule = await scheduleReplenishment(
                vaccine.id, 
                scheduled_date, 
                quantity_to_order, 
                notes
            );
            
            // Actualizar el estado de la lista de reposiciones con el nuevo elemento
            setSchedules(prev => [...prev, newSchedule].sort((a, b) => 
                new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
            ));

            toast({
                title: "Reposición Programada",
                description: `Orden de ${quantity_to_order} unidades programada para el ${format(new Date(scheduled_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })}.`,
            });

            setIsScheduleDialogOpen(false); // Cerrar el modal

        } catch (error) {
            toast({
                title: "Error al programar reposición",
                description: error instanceof Error ? error.message : "Hubo un error desconocido.",
                variant: "destructive",
            });
        } finally {
            setIsSubmittingSchedule(false);
        }
    };

    // --- FUNCIÓN: MANEJO DE REPORTE DE INCIDENTE ---
    type IncidentFormData = { 
        type: IncidentType, 
        description: string, 
        quantity_affected?: number | null 
    };

    /**
     * Maneja el envío del formulario para reportar un incidente.
     */
    const handleReportIncident = async (data: IncidentFormData) => {
        if (!vaccine) return;

        setIsSubmittingIncident(true);
        try {
            await reportVaccineIncident(
                vaccine.id, 
                data.type, 
                data.description, 
                data.quantity_affected,
                'current_user_id' // <--- Reemplazar con el ID del usuario autenticado si tienes sesión
            );
            
            toast({
                title: "Incidente Registrado",
                description: `El incidente de tipo '${data.type}' ha sido registrado exitosamente.`,
            });

            setIsIncidentDialogOpen(false); // Cerrar el modal

        } catch (error) {
            console.error(error);
            toast({
                title: "Error al registrar incidente",
                description: error instanceof Error ? error.message : "Hubo un error desconocido al registrar el incidente.",
                variant: "destructive",
            });
        } finally {
            setIsSubmittingIncident(false);
        }
    };
    // -------------------------------------------------------


    const getStockStatus = () => {
        if (!vaccine) return { status: "unknown", color: "gray", text: "Desconocido" }

        if (vaccine.stock_quantity === 0) {
            return { status: "empty", color: "red", text: "Sin Stock" }
        } else if (vaccine.stock_quantity < vaccine.min_stock_level) {
            return { status: "low", color: "orange", text: "Stock Bajo" }
        } else {
            return { status: "good", color: "green", text: "Stock Adecuado" }
        }
    }

    const getStorageIcon = (temp?: string) => {
        if (temp?.includes("2°C a 8°C")) return "🧊"
        if (temp?.includes("-15") || temp?.includes("-60")) return "❄️"
        return "🌡️"
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!vaccine) {
        return (
            <div className="text-center py-12">
                <Stethoscope className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Vacuna no encontrada</h2>
                <p className="text-muted-foreground mb-6">La vacuna que busca no existe o ha sido eliminada.</p>
                <Button onClick={() => router.push("/dashboard/vacunas")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Vacunas
                </Button>
            </div>
        );
    }

    const stockStatus = getStockStatus()
    const stockPercentage = Math.min((vaccine.stock_quantity / vaccine.min_stock_level) * 100, 100)

    const expirationDate = vaccine.expiration_date
        ? format(new Date(vaccine.expiration_date + 'T12:00:00'), "dd/MM/yyyy", { locale: es })
        : "No disponible";

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/vacunas")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Detalles de la Vacuna</h1>
                        <p className="text-muted-foreground">Información completa de {vaccine.name}</p>
                    </div>
                </div>
                <Button asChild className="care-gradient">
                    <Link href={`/dashboard/vacunas/${vaccine.id}/editar`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Vacuna
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Información Principal (md:col-span-2) */}
                <Card className="md:col-span-2 card-hover">
                    <CardHeader className="pb-4">
                        <div className="flex items-center space-x-4">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Package className="h-8 w-8 text-primary medical-icon" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-2xl">{vaccine.name}</CardTitle>
                                <CardDescription className="text-lg">{vaccine.type && `Tipo: ${vaccine.type}`}</CardDescription>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge
                                        className={`bg-${stockStatus.color}-100 text-${stockStatus.color}-800 border-${stockStatus.color}-200`}
                                    >
                                        {stockStatus.status === "good" ? (
                                            <CheckCircle className="mr-1 h-3 w-3" />
                                        ) : (
                                            <AlertTriangle className="mr-1 h-3 w-3" />
                                        )}
                                        {stockStatus.text}
                                    </Badge>
                                    {vaccine.manufacturer && (
                                        <Badge variant="outline">
                                            <Building className="mr-1 h-3 w-3" />
                                            {vaccine.manufacturer}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Información del Producto */}
                        <div>
                            <h3 className="font-semibold text-lg mb-3 flex items-center">
                                <Package className="mr-2 h-5 w-5 text-primary" />
                                Información del Producto
                            </h3>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">Nombre</p>
                                        <p className="text-sm text-muted-foreground">{vaccine.name}</p>
                                    </div>
                                </div>
                                {vaccine.type && (
                                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                                        <Hash className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Tipo</p>
                                            <p className="text-sm text-muted-foreground">{vaccine.type}</p>
                                        </div>
                                    </div>
                                )}
                                {vaccine.manufacturer && (
                                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Laboratorio</p>
                                            <p className="text-sm text-muted-foreground">{vaccine.manufacturer}</p>
                                        </div>
                                    </div>
                                )}
                                {vaccine.lot_number && (
                                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                                        <Hash className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Lote</p>
                                            <p className="text-sm text-muted-foreground">{vaccine.lot_number}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Almacenamiento */}
                        {vaccine.storage_temperature && (
                            <div>
                                <h3 className="font-semibold text-lg mb-3 flex items-center">
                                    <Thermometer className="mr-2 h-5 w-5 text-blue-500" />
                                    Condiciones de Almacenamiento
                                </h3>
                                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">{getStorageIcon(vaccine.storage_temperature)}</span>
                                        <div>
                                            <p className="font-medium text-blue-800">Temperatura de Almacenamiento</p>
                                            <p className="text-blue-600">{vaccine.storage_temperature}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Fecha de Vencimiento */}
                        {vaccine.expiration_date && (
                            <div>
                                <h3 className="font-semibold text-lg mb-3 flex items-center">
                                    <Calendar className="mr-2 h-5 w-5 text-orange-500" />
                                    Fecha de Vencimiento
                                </h3>
                                <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                                    <div className="flex items-center space-x-3">
                                        <Calendar className="h-6 w-6 text-orange-600" />
                                        <div>
                                            <p className="font-medium text-orange-800">Vence el</p>
                                            <p className="text-lg font-bold text-orange-600">
                                                {expirationDate}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Panel Lateral (Columna 3) */}
                <div className="space-y-6">
                    {/* Control de Stock */}
                    <Card className="card-hover">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Package className="mr-2 h-5 w-5 text-green-500" />
                                Control de Stock
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-primary">{vaccine.stock_quantity}</p>
                                <p className="text-sm text-muted-foreground">unidades disponibles</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Stock actual</span>
                                    <span>
                                        {vaccine.stock_quantity} / {vaccine.min_stock_level}
                                    </span>
                                </div>
                                <Progress
                                    value={stockPercentage}
                                    className={stockStatus.status === "low" || stockStatus.status === "empty" ? "bg-red-100" : ""}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                    <p className="text-lg font-bold text-green-600">{vaccine.stock_quantity}</p>
                                    <p className="text-xs text-green-800">Actual</p>
                                </div>
                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                    <p className="text-lg font-bold text-blue-600">{vaccine.min_stock_level}</p>
                                    <p className="text-xs text-blue-800">Mínimo</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Estadísticas de Uso */}
                    <Card className="card-hover">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Activity className="mr-2 h-5 w-5 text-blue-500" />
                                Estadísticas de Uso
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
                                    <p className="text-2xl font-bold text-purple-600">
                                        {usageStats ? usageStats.monthly_applied : <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600" />}
                                    </p>
                                    <p className="text-xs text-purple-800">Este mes</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                                    <p className="text-2xl font-bold text-indigo-600">
                                        {usageStats ? usageStats.total_applied : <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />}
                                    </p>
                                    <p className="text-xs text-indigo-800">Total aplicadas</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Acciones Rápidas */}
                    <Card className="card-hover">
                        <CardHeader>
                            <CardTitle>Acciones Rápidas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Botón 1: Agregar Stock (Corregido) */}
                            <Button 
                                variant="outline" 
                                className="w-full justify-start bg-transparent"
                                onClick={() => setIsStockDialogOpen(true)} 
                            >
                                <Users className="mr-2 h-4 w-4" />
                                Agregar Stock
                            </Button>

                            {/* Botón 2: Programar Reposición (Corregido) */}
                            <Button 
                                variant="outline" 
                                className="w-full justify-start bg-transparent"
                                onClick={() => setIsScheduleDialogOpen(true)} 
                            >
                                <Calendar className="mr-2 h-4 w-4" />
                                Programar Reposición
                            </Button>

                            {/* Botón 3: Reportar Problema (Corregido) */}
                            <Button 
                                variant="outline" 
                                className="w-full justify-start bg-transparent"
                                onClick={() => setIsIncidentDialogOpen(true)} 
                            >
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Reportar Problema
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            {/* Lista de Reposiciones Programadas */}
            {vaccine && (
                <div className="grid grid-cols-1">
                    <ReplenishmentScheduleList schedules={schedules} />
                </div>
            )}
            
            {/* MODAL DE AGREGAR STOCK */}
            {vaccine && (
                <AddStockDialog
                    open={isStockDialogOpen}
                    onOpenChange={setIsStockDialogOpen}
                    vaccine={vaccine}
                    onStockAdded={() => loadVaccineData(vaccine.id)} 
                    isSubmitting={isSubmittingStock}
                    onSubmit={handleStockAdd} 
                />
            )}
            
            {/* MODAL DE REPOSICIÓN */}
            {vaccine && (
                <ScheduleReplenishmentDialog
                    open={isScheduleDialogOpen}
                    onOpenChange={setIsScheduleDialogOpen}
                    vaccine={vaccine}
                    isSubmitting={isSubmittingSchedule}
                    onSubmit={handleScheduleReplenishment} 
                />
            )}

            {/* MODAL DE REPORTE DE INCIDENTE */}
            {vaccine && (
                <ReportIncidentDialog
                    open={isIncidentDialogOpen}
                    onOpenChange={setIsIncidentDialogOpen}
                    vaccine={vaccine}
                    isSubmitting={isSubmittingIncident}
                    onSubmit={handleReportIncident} 
                />
            )}
        </div>
    );
}