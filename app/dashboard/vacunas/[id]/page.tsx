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
    Trash2,
    Sparkles,
    ShieldCheck,
    Droplet,
} from "lucide-react";
import {
    deleteReplenishmentSchedule,
    deleteVaccineIncident,
    getVaccineStatsById,
    addStockToVaccine,
    getReplenishmentSchedulesByVaccineId, 
    scheduleReplenishment, 
    reportVaccineIncident,
    getVaccineUnifiedHistory
} from "@/lib/database";
import type {
    UnifiedHistoryItem,
    ReplenishmentSchedule, 
    IncidentType,
} from "@/lib/database";
import { getVaccineStockByIdAction, type ExtendedVaccineItem } from "@/app/actions/vaccines";

import { AddStockDialog } from "@/components/add-stock-dialog"; 
import { ScheduleReplenishmentDialog } from "@/components/schedule-replenishment-dialog"; 
import { ReportIncidentDialog } from "@/components/report-incident-dialog";
import { AIStockAutonomyCard } from "@/components/ai-stock-autonomy-card";

import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface VaccineStats {
    monthly_applied: number;
    total_applied: number;
}

export default function VaccineDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    const [vaccine, setVaccine] = useState<ExtendedVaccineItem | null>(null);
    const [history, setHistory] = useState<UnifiedHistoryItem[]>([]);
    const [usageStats, setUsageStats] = useState<VaccineStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
    const [isSubmittingStock, setIsSubmittingStock] = useState(false);
    
    const [schedules, setSchedules] = useState<ReplenishmentSchedule[]>([]);
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
    const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

    const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
    const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);

    // --- FUNCIÓN: MANEJO DE ELIMINACIÓN DE ELEMENTOS DEL HISTORIAL ---
    const handleDeleteHistoryItem = async (itemId: string, type: 'incident' | 'replenishment') => {
        if (!confirm(`¿Estás seguro de que deseas eliminar este registro de ${type === 'incident' ? 'incidente' : 'reposición'}?`)) {
            return;
        }

        setDeletingId(itemId);
        try {
            if (type === 'incident') {
                await deleteVaccineIncident(itemId);
            } else {
                await deleteReplenishmentSchedule(itemId);
            }

            setHistory(prev => prev.filter(item => item.id !== itemId));
            
            if (type === 'replenishment') {
                setSchedules(prev => prev.filter(s => s.id !== itemId));
            }

            toast({
                title: "Registro eliminado",
                description: "El evento fue removido del historial de trazabilidad correctamente.",
            });
            
            if (params.id) loadVaccineData(params.id as string);

        } catch (error) {
            console.error("Error al eliminar el ítem:", error);
            toast({
                title: "Error al eliminar",
                description: error instanceof Error ? error.message : "No se pudo eliminar el registro de la base de datos.",
                variant: "destructive",
            });
        } finally {
            setDeletingId(null);
        }
    };

    // 🎨 Subcomponente Dinámico de Tarjetas del Historial con Botón de Eliminar
    const HistoryItemCard: React.FC<{ item: UnifiedHistoryItem }> = ({ item }) => {
        const isIncident = item.type === 'incident';
        const colorClass = isIncident ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50';
        const icon = isIncident ? '⚠️' : '📦';
        const title = isIncident ? `Incidente: ${item.status?.toUpperCase()}` : `Reposición: ${item.status?.toUpperCase()}`;
        const isDeletingThis = deletingId === item.id;

        const dateDisplay = new Date(item.date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        return (
            <Card className={`border-l-4 ${colorClass} relative group overflow-hidden`}>
                <CardContent className="p-4 flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <p className="text-lg font-semibold flex items-center">
                            {icon} <span className="ml-2">{title}</span>
                        </p>
                        <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                        {item.quantity !== null && item.quantity !== undefined && (
                            <p className="text-xs mt-1 font-semibold text-muted-foreground">
                                {isIncident ? `Dosis Afectadas: ${item.quantity}` : `Cantidad Ordenada: ${item.quantity}`}
                            </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2 block sm:hidden">{dateDisplay}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0">
                        <p className="text-xs text-gray-500 font-medium hidden sm:block">{dateDisplay}</p>
                        
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={isDeletingThis}
                            onClick={() => handleDeleteHistoryItem(item.id, item.type as 'incident' | 'replenishment')}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200/60 bg-white shadow-sm transition-all"
                        >
                            {isDeletingThis ? (
                                <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };
    
    const loadVaccineData = async (id: string) => {
        try {
            setLoading(true);
            const [vaccineData, usageStatsData, schedulesData, historyData] = await Promise.all([
                getVaccineStockByIdAction(id),
                getVaccineStatsById(id).catch(() => null),
                getReplenishmentSchedulesByVaccineId(id).catch(() => []),
                getVaccineUnifiedHistory(id).catch(() => []),
            ]);

            if (!vaccineData) {
                toast({
                    title: "Error",
                    description: "Vacuna no encontrada en el inventario consolidado.",
                    variant: "destructive",
                });
                router.push("/dashboard/vacunas");
                return;
            }

            setVaccine(vaccineData);
            setHistory(historyData);
            setUsageStats(usageStatsData);
            setSchedules(schedulesData);
        } catch (error) {
            console.error("Error al cargar datos de la vacuna:", error);
            toast({
                title: "Error",
                description: "No se pudo cargar los datos de la vacuna desde la vista de stock.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (params.id) {
            loadVaccineData(params.id as string);
        }
    }, [params.id]);

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
            await addStockToVaccine(
                vaccine.id!, 
                quantity, 
                lot_number, 
                expiration_date
            );
            if (vaccine.id) {
                await loadVaccineData(vaccine.id);
            }
            toast({
                title: "Stock Agregado",
                description: `Se han añadido ${quantity} viales a ${vaccine.name}.`,
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
            const newSchedule = await scheduleReplenishment(
                vaccine.id!, 
                scheduled_date, 
                quantity_to_order, 
                notes
            );
            
            setSchedules(prev => [...prev, newSchedule].sort((a, b) => 
                new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
            ));

            const newHistoryItem: UnifiedHistoryItem = {
                id: newSchedule.id,
                date: newSchedule.created_at || new Date().toISOString(),
                type: 'replenishment',
                description: `Pedido de reposición programado. Notas: ${notes || 'Sin observaciones'}`,
                quantity: quantity_to_order,
                status: newSchedule.status || 'pending',
            };

            setHistory(prevHistory => {
                const updatedHistory = [...prevHistory, newHistoryItem];
                updatedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                return updatedHistory;
            });

            toast({
                title: "Reposición Programada",
                description: `Orden de ${quantity_to_order} unidades programada para el ${format(new Date(scheduled_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })}.`,
            });
            setIsScheduleDialogOpen(false);
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

    type IncidentFormData = { 
        type: IncidentType, 
        description: string, 
        quantity_affected?: number | null 
    };

    const handleReportIncident = async (data: IncidentFormData) => {
        if (!vaccine) return;
        setIsSubmittingIncident(true);
        try {
           const newIncident = await reportVaccineIncident(
                vaccine.id!, 
                data.type, 
                data.description, 
                data.quantity_affected,
                'current_user_id'
            );
            const newHistoryItem: UnifiedHistoryItem = {
                id: newIncident.id,
                date: newIncident.created_at, 
                type: 'incident',
                description: `Tipo de Incidente: ${newIncident.incident_type}. Detalles: ${newIncident.description}`,
                quantity: newIncident.quantity_affected,
                status: newIncident.status,
            };
            setHistory(prevHistory => {
                const updatedHistory = [...prevHistory, newHistoryItem];
                updatedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                return updatedHistory;
            });
            toast({
                title: "Incidente Registrado",
                description: `El incidente de tipo '${data.type}' ha sido registrado exitosamente.`,
            });
            setIsIncidentDialogOpen(false);
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

    const getStorageIcon = (temp?: string) => {
        if (temp?.includes("2°C a 8°C")) return "🧊";
        if (temp?.includes("-15") || temp?.includes("-60")) return "❄️";
        return "🌡️";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
                    <p className="text-slate-500 font-medium animate-pulse">Cargando datos y ledger de stock...</p>
                </div>
            </div>
        );
    }

    if (!vaccine) return null;

    // Valores dinámicos calculados directamente desde la vista `v_vaccines_stock`
    const dynamicVials = Number(vaccine.physical_vials ?? vaccine.current_stock_vials ?? vaccine.stock_quantity ?? 0);
    const doseAmount = Number(vaccine.dose_amount || 0.5);
    const netContent = Number(vaccine.net_content || 5.0);
    const dynamicMl = Number(vaccine.total_ml ?? (dynamicVials * netContent));
    const availableDoses = Number(vaccine.available_doses_for_clinic ?? Math.floor(dynamicMl / doseAmount));
    const minStock = Number(vaccine.min_stock_level || 10);
    const stockStatus = vaccine.stock_status ?? (dynamicVials <= 0 ? 'OUT_OF_STOCK' : dynamicVials <= minStock ? 'CRITICAL_LOW' : 'OPTIMAL');

    const getStatusDetails = () => {
        switch (stockStatus) {
            case 'OUT_OF_STOCK':
                return { label: 'Sin Stock / Agotado', color: 'rose', bg: 'bg-rose-100 text-rose-800 border-rose-200', icon: AlertTriangle };
            case 'CRITICAL_LOW':
                return { label: 'Stock Crítico / Bajo', color: 'amber', bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle };
            case 'OPTIMAL':
            default:
                return { label: 'Stock Óptimo', color: 'emerald', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle };
        }
    };

    const statusObj = getStatusDetails();
    const StatusIcon = statusObj.icon;
    const stockPercentage = Math.min(100, Math.max(0, (dynamicVials / (minStock || 1)) * 100));
    const expirationDate = vaccine.expiration_date
        ? format(new Date(vaccine.expiration_date + 'T12:00:00'), "dd/MM/yyyy", { locale: es })
        : "No disponible";

    return (
        <div className="space-y-8 animate-slide-in-up pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/vacunas")} className="rounded-xl border-slate-200 hover:bg-slate-100">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{vaccine.name}</h1>
                            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                                Vista en tiempo real: v_vaccines_stock
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mt-0.5">Control dinámico de inventario clínico y trazabilidad por viales</p>
                    </div>
                </div>
                <Button asChild className="modern-button shadow-md">
                    <Link href={`/dashboard/vacunas/${vaccine.id}/editar`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Vacuna
                    </Link>
                </Button>
            </div>

            {/* Grid Principal */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Columna Izquierda: Información de Ficha Técnica */}
                <Card className="md:col-span-2 modern-card shadow-sm">
                    <CardHeader className="pb-4 border-b border-slate-100">
                        <div className="flex items-center space-x-4">
                            <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                                <Package className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-2xl font-bold text-slate-800">{vaccine.name}</CardTitle>
                                    <Badge className={statusObj.bg}>
                                        <StatusIcon className="mr-1 h-3 w-3" />
                                        {statusObj.label}
                                    </Badge>
                                </div>
                                <CardDescription className="text-sm font-medium text-slate-500 mt-1">
                                    {vaccine.type && `Tipo: ${vaccine.type}`} • Laboratorio: {vaccine.manufacturer || 'No especificado'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-6">
                        <div>
                            <h3 className="font-bold text-slate-800 text-base mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4 text-blue-600" />
                                Ficha Técnica y Registro Sanitario
                            </h3>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <Package className="h-4 w-4 text-slate-400" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400">Nombre Oficial</p>
                                        <p className="text-sm font-bold text-slate-700">{vaccine.name}</p>
                                    </div>
                                </div>

                                {vaccine.type && (
                                    <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <Hash className="h-4 w-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400">Tipo Inmunológico</p>
                                            <p className="text-sm font-bold text-slate-700">{vaccine.type}</p>
                                        </div>
                                    </div>
                                )}

                                {vaccine.manufacturer && (
                                    <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <Building className="h-4 w-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400">Laboratorio Fabricante</p>
                                            <p className="text-sm font-bold text-slate-700">{vaccine.manufacturer}</p>
                                        </div>
                                    </div>
                                )}

                                {vaccine.lot_number && (
                                    <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <Hash className="h-4 w-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400">Lote Activo</p>
                                            <p className="text-sm font-mono font-bold text-slate-700">{vaccine.lot_number}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <Stethoscope className="h-4 w-4 text-slate-400" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400">Vía de Administración</p>
                                        <p className="text-sm font-bold text-slate-700">{(vaccine as any).administration_route || "Intramuscular (IM)"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <Droplet className="h-4 w-4 text-blue-500" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400">Dosis Estándar</p>
                                        <p className="text-sm font-bold text-blue-700">{doseAmount} ml por aplicación</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Temperatura y Vencimiento */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {vaccine.storage_temperature && (
                                <div className="p-4 rounded-xl bg-sky-50 border border-sky-200/70 space-y-1">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">{getStorageIcon(vaccine.storage_temperature)}</span>
                                        <div>
                                            <p className="text-xs font-bold text-sky-800">Cadena de Frío</p>
                                            <p className="text-sm font-semibold text-sky-700">{vaccine.storage_temperature}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {vaccine.expiration_date && (
                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/70 space-y-1">
                                    <div className="flex items-center space-x-3">
                                        <Calendar className="h-6 w-6 text-amber-600" />
                                        <div>
                                            <p className="text-xs font-bold text-amber-800">Vencimiento del Lote</p>
                                            <p className="text-sm font-black text-amber-700">{expirationDate}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Columna Derecha: Control de Stock Dinámico */}
                <div className="space-y-6">
                    <Card className="modern-card shadow-sm border-slate-200">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                    Balance Dinámico de Stock
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    v_vaccines_stock
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-4">
                            {/* Stock Principal en Viales y Volumen en ML */}
                            <div className="text-center p-4 bg-gradient-to-br from-indigo-50/60 to-sky-50/40 rounded-2xl border border-indigo-100">
                                <p className="text-4xl font-black text-indigo-700">
                                    {dynamicVials} <span className="text-lg font-normal text-indigo-900">viales</span>
                                </p>
                                <p className="text-xs font-semibold text-slate-500 mt-1">
                                    Total en mililitros: <span className="text-indigo-600 font-bold">{dynamicMl.toFixed(1)} ml</span> ({doseAmount} ml/dosis)
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                                    <p className="text-lg font-black text-slate-800">{minStock}</p>
                                    <p className="text-[11px] text-slate-400 font-semibold">Stock Mínimo</p>
                                </div>
                                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                    <p className="text-lg font-black text-emerald-700">
                                        {availableDoses}
                                    </p>
                                    <p className="text-[11px] text-emerald-800 font-semibold">Dosis Disponibles</p>
                                </div>
                            </div>

                            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                                <div className="flex justify-between text-xs font-semibold text-slate-600">
                                    <span>Nivel frente al mínimo</span>
                                    <span className="font-bold text-slate-800">{dynamicVials} / {minStock} viales</span>
                                </div>
                                <Progress value={stockPercentage} className="h-2" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Estadísticas de Aplicación */}
                    <Card className="modern-card shadow-sm border-slate-200">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-600" />
                                Estadísticas Clínicas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                                    <p className="text-2xl font-black text-indigo-700">
                                        {usageStats ? usageStats.monthly_applied : <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-600" />}
                                    </p>
                                    <p className="text-[11px] font-semibold text-indigo-800">Dosis Este Mes</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-sky-50 border border-sky-200">
                                    <p className="text-2xl font-black text-sky-700">
                                        {usageStats ? usageStats.total_applied : <Loader2 className="h-5 w-5 animate-spin mx-auto text-sky-600" />}
                                    </p>
                                    <p className="text-[11px] font-semibold text-sky-800">Total Histórico</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Acciones Rápidas */}
                    <Card className="modern-card shadow-sm border-slate-200">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-base font-bold text-slate-800">Operaciones de Inventario</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-2.5">
                            <Button variant="outline" className="w-full justify-start rounded-xl font-semibold border-slate-200 hover:bg-slate-50" onClick={() => setIsStockDialogOpen(true)}>
                                <Users className="mr-2 h-4 w-4 text-emerald-600" />
                                Añadir Stock (Viales)
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-xl font-semibold border-slate-200 hover:bg-slate-50" onClick={() => setIsScheduleDialogOpen(true)}>
                                <Calendar className="mr-2 h-4 w-4 text-sky-600" />
                                Programar Reposición
                            </Button>
                            <Button variant="outline" className="w-full justify-start rounded-xl font-semibold border-slate-200 hover:bg-slate-50" onClick={() => setIsIncidentDialogOpen(true)}>
                                <AlertTriangle className="mr-2 h-4 w-4 text-rose-600" />
                                Reportar Incidente
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* SECCIÓN DE IA PREDICTIVA Y ESTADO DE AUTONOMÍA */}
            <div className="space-y-4">
                <AIStockAutonomyCard
                    vaccineId={vaccine.id}
                    title={`Diagnóstico Predictivo de IA: ${vaccine.name}`}
                    onRefresh={() => loadVaccineData(vaccine.id)}
                />
            </div>
            
            {/* HISTORIAL UNIFICADO */}
            <div className="mt-8 space-y-4">
                <h2 className="text-2xl font-black tracking-tight text-slate-800 flex items-center">
                    <Activity className="mr-2 h-6 w-6 text-blue-600" />
                    Historial de Trazabilidad y Movimientos
                </h2>
                <div className="space-y-3">
                    {history.length === 0 ? (
                        <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-muted-foreground text-sm font-medium">No hay eventos de inventario registrados para esta vacuna.</p>
                        </div>
                    ) : (
                        history.map(item => (
                            <HistoryItemCard key={item.id + item.type} item={item} />
                        ))
                    )}
                </div>
            </div>
            
            {/* Diálogos modales */}
            <AddStockDialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen} vaccine={vaccine} onStockAdded={() => loadVaccineData(vaccine.id)} isSubmitting={isSubmittingStock} onSubmit={handleStockAdd} />
            <ScheduleReplenishmentDialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen} vaccine={vaccine} isSubmitting={isSubmittingSchedule} onSubmit={handleScheduleReplenishment} />
            <ReportIncidentDialog open={isIncidentDialogOpen} onOpenChange={setIsIncidentDialogOpen} vaccine={vaccine} isSubmitting={isSubmittingIncident} onSubmit={handleReportIncident} />
        </div>
    );
}