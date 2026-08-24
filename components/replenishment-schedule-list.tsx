// components/replenishment-schedule-list.tsx
import { Package, Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatNominalDate, parseLocalDate } from "@/lib/dateUtils";

// Asume que la interfaz ReplenishmentSchedule está definida en lib/database
interface ReplenishmentSchedule {
    id: string;
    vaccine_id: string;
    scheduled_date: string; // Formato YYYY-MM-DD
    quantity_to_order: number;
    status: 'pending' | 'received' | 'cancelled';
    notes?: string | null;
    created_at: string;
}

interface ReplenishmentScheduleListProps {
    schedules: ReplenishmentSchedule[];
}

// Función auxiliar para obtener el estilo de la insignia
const getStatusBadge = (status: ReplenishmentSchedule['status']) => {
    switch (status) {
        case 'pending':
            return {
                text: "Pendiente",
                className: "bg-yellow-100 text-yellow-800 border-yellow-200",
                icon: Clock,
            };
        case 'received':
            return {
                text: "Recibido",
                className: "bg-green-100 text-green-800 border-green-200",
                icon: CheckCircle,
            };
        case 'cancelled':
            return {
                text: "Cancelado",
                className: "bg-red-100 text-red-800 border-red-200",
                icon: AlertTriangle,
            };
        default:
            return {
                text: "Desconocido",
                className: "bg-gray-100 text-gray-800 border-gray-200",
                icon: AlertTriangle,
            };
    }
};

export function ReplenishmentScheduleList({ schedules }: ReplenishmentScheduleListProps) {
    // Filtramos para mostrar solo las pendientes y ordenamos por fecha
    const pendingSchedules = schedules
        .filter(s => s.status === 'pending')
        .sort((a, b) => {
            const timeA = parseLocalDate(a.scheduled_date)?.getTime() ?? 0;
            const timeB = parseLocalDate(b.scheduled_date)?.getTime() ?? 0;
            return timeA - timeB;
        });
    
    // Mostramos todas las reposiciones, incluyendo recibidas y canceladas, después de las pendientes.
    const historicalSchedules = schedules
        .filter(s => s.status !== 'pending')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold flex items-center">
                    <Calendar className="mr-2 h-5 w-5 text-indigo-500" />
                    Programación de Reposición
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                {pendingSchedules.length === 0 && historicalSchedules.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2" />
                        <p>No hay reposiciones programadas.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Listado de Reposiciones Pendientes */}
                        {pendingSchedules.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold border-b pb-1">Próximas Entregas ({pendingSchedules.length})</h3>
                                {pendingSchedules.map((schedule) => {
                                    const { text, className, icon: Icon } = getStatusBadge(schedule.status);
                                    const formattedDate = formatNominalDate(schedule.scheduled_date, 'medium');
                                    
                                    return (
                                        <div key={schedule.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-colors">
                                            <div className="flex flex-col space-y-1">
                                                <p className="font-medium text-yellow-800 flex items-center">
                                                    <Calendar className="h-4 w-4 mr-2" />
                                                    {formattedDate}
                                                </p>
                                                <p className="text-sm text-yellow-700">
                                                    <span className="font-bold">{schedule.quantity_to_order}</span> unidades
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Badge className={className}>
                                                    <Icon className="h-3 w-3 mr-1" />
                                                    {text}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        {/* Separador e Historial */}
                        {pendingSchedules.length > 0 && historicalSchedules.length > 0 && <Separator />}

                        {historicalSchedules.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <h3 className="text-lg font-semibold border-b pb-1">Historial ({historicalSchedules.length})</h3>
                                {historicalSchedules.slice(0, 5).map((schedule) => {
                                    const { text, className, icon: Icon } = getStatusBadge(schedule.status);
                                    const formattedDate = formatNominalDate(schedule.scheduled_date, 'medium');
                                    
                                    return (
                                        <div key={schedule.id} className="flex items-center justify-between text-sm text-muted-foreground">
                                            <div className="flex-1 space-y-0.5">
                                                <p className="font-medium">{schedule.quantity_to_order} uds. programadas para {formattedDate}</p>
                                                {schedule.notes && <p className="truncate text-xs italic">{schedule.notes}</p>}
                                            </div>
                                            <Badge variant="outline" className={cn("ml-4", className)}>
                                                <Icon className="h-3 w-3 mr-1" />
                                                {text}
                                            </Badge>
                                        </div>
                                    );
                                })}
                                <p className="text-xs text-right text-muted-foreground italic">Mostrando las 5 más recientes del historial.</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}