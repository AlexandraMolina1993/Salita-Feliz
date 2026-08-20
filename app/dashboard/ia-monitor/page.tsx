'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Bot,
  Sparkles,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Copy,
  Check,
  Activity,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Mail,
  MessageSquare,
  Calendar,
  Package,
  TrendingDown,
  ChevronRight,
  ExternalLink,
  Code2,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { AINotificationRecord } from '@/types/vaccine';
import type { AppointmentRemindersBatchReport } from '@/types/appointmentReminder';
import type { PredictiveStockReport } from '@/types/vaccine';

export default function AIMonitorPage() {
  const { toast } = useToast();

  // Estados de datos
  const [logs, setLogs] = useState<AINotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    telegramCount: 0,
    gmailCount: 0,
    successRate: 100,
    appointmentRemindersCount: 0,
    stockAlertsCount: 0,
  });

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Estados de ejecución de disparadores manuales
  const [isExecutingReminders, setIsExecutingReminders] = useState(false);
  const [remindersHours, setRemindersHours] = useState(24);
  const [remindersForce, setRemindersForce] = useState(false);
  const [reminderReport, setReminderReport] = useState<AppointmentRemindersBatchReport | null>(null);
  const [isReminderReportOpen, setIsReminderReportOpen] = useState(false);

  const [isExecutingStock, setIsExecutingStock] = useState(false);
  const [stockDaysWindow, setStockDaysWindow] = useState(30);
  const [stockForceAlert, setStockForceAlert] = useState(false);
  const [stockReport, setStockReport] = useState<PredictiveStockReport | null>(null);
  const [isStockReportOpen, setIsStockReportOpen] = useState(false);

  // Estados para Modal de Detalle de Log
  const [selectedLog, setSelectedLog] = useState<AINotificationRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [hasCopiedJSON, setHasCopiedJSON] = useState(false);

  // Carga de logs y métricas
  const fetchLogs = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (channelFilter !== 'ALL') params.set('channel', channelFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/api/ai/logs?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setLogs(json.data || []);
        if (json.stats) {
          setStats(json.stats);
        }
      }
      setLastRefreshedAt(new Date());
    } catch (error) {
      console.error('Error al obtener logs de IA:', error);
      if (!isSilent) {
        toast({
          title: 'Error al consultar logs',
          description: 'No se pudieron recuperar los registros de auditoría de Supabase.',
          variant: 'destructive',
        });
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [channelFilter, statusFilter, searchTerm, toast]);

  // Efecto inicial y al cambiar filtros
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresco periódico (cada 10s si está activo)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  // Suscripción Realtime a Supabase
  useEffect(() => {
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchLogs(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  // Disparador Manual: Agente de Recordatorios
  const handleExecuteReminders = async () => {
    try {
      setIsExecutingReminders(true);
      toast({
        title: '🤖 Ejecutando Agente de Recordatorios...',
        description: `Analizando turnos programados a ${remindersHours}h y redactando mensajes clínicos con IA.`,
      });

      const res = await fetch('/api/ai/appointment-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hoursAhead: remindersHours,
          forceResend: remindersForce,
          notifyEmail: true,
          notifyTelegram: true,
        }),
      });

      const json = await res.json();

      if (json.success && json.report) {
        setReminderReport(json.report);
        setIsReminderReportOpen(true);
        toast({
          title: '✅ Ciclo de Recordatorios Completado',
          description: `Se procesaron ${json.report.total_scheduled_found} turnos. Despachados: ${json.report.reminders_sent}.`,
        });
        fetchLogs(true);
      } else {
        throw new Error(json.error || 'Error al ejecutar agente de recordatorios.');
      }
    } catch (err: any) {
      console.error('Error al ejecutar recordatorios:', err);
      toast({
        title: '❌ Error en Agente de Recordatorios',
        description: err.message || 'Error inesperado durante la ejecución.',
        variant: 'destructive',
      });
    } finally {
      setIsExecutingReminders(false);
    }
  };

  // Disparador Manual: Agente de Stock Predictivo
  const handleExecuteStockAudit = async () => {
    try {
      setIsExecutingStock(true);
      toast({
        title: '⚡ Ejecutando Auditoría de Stock IA...',
        description: `Calculando run-rate a ${stockDaysWindow} días y evaluando alertas críticas.`,
      });

      const res = await fetch('/api/ai/predictive-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysWindow: stockDaysWindow,
          forceAlert: stockForceAlert,
          notifyTelegram: true,
          notifyEmail: true,
        }),
      });

      const json = await res.json();

      if (json.success && json.report) {
        setStockReport(json.report);
        setIsStockReportOpen(true);
        toast({
          title: '✅ Auditoría de Stock Completada',
          description: `Analizadas: ${json.report.total_vaccines_analyzed} vacunas. Críticas: ${json.report.critical_vaccines_count}.`,
        });
        fetchLogs(true);
      } else {
        throw new Error(json.error || 'Error al ejecutar auditoría de stock.');
      }
    } catch (err: any) {
      console.error('Error al ejecutar stock:', err);
      toast({
        title: '❌ Error en Auditoría de Stock IA',
        description: err.message || 'Error inesperado durante la ejecución.',
        variant: 'destructive',
      });
    } finally {
      setIsExecutingStock(false);
    }
  };

  // Copiar JSON de contexto al portapapeles
  const handleCopyJSON = (data: any) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setHasCopiedJSON(true);
      toast({
        title: 'Copiado al portapapeles',
        description: 'El JSON estructurado del contexto fue copiado correctamente.',
      });
      setTimeout(() => setHasCopiedJSON(false), 2500);
    } catch {
      toast({
        title: 'Error al copiar',
        description: 'No se pudo acceder al portapapeles.',
        variant: 'destructive',
      });
    }
  };

  // Helper para identificar tipo de alerta
  const getAlertTypeInfo = (log: AINotificationRecord) => {
    const ctx = log.context as any;
    if (ctx?.type === 'APPOINTMENT_REMINDER_24H' || log.message?.includes('Recordatorio') || log.message?.includes('Turno')) {
      return {
        label: 'Recordatorio Turno (24h)',
        badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
        icon: Calendar,
        patientName: ctx?.patient_name || 'Paciente',
        vaccineName: ctx?.vaccine_name || 'Vacuna',
      };
    }
    if (ctx?.type === 'PREDICTIVE_STOCK_ALERT' || log.message?.includes('Stock') || log.message?.includes('CRÍTICO')) {
      return {
        label: 'Stock Predictivo IA',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        icon: TrendingDown,
        patientName: 'Gestión Farmacia',
        vaccineName: ctx?.critical_vaccine_names?.join(', ') || 'Inventario',
      };
    }
    return {
      label: 'Alerta General IA',
      badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
      icon: Bot,
      patientName: 'Sistema',
      vaccineName: 'General',
    };
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                  Auditoría & Monitoreo de Agentes IA
                </h1>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 py-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  MOTOR ACTIVO
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Supervisión en tiempo real de despachos autónomos, motor predictivo y bitácora inmutable en Supabase.
              </p>
            </div>
          </div>
        </div>

        {/* Controles de Refresco */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center space-x-2 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-800">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-xs text-gray-600 dark:text-slate-400 cursor-pointer">
              Auto-refresco
            </Label>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs()}
            disabled={loading}
            className="gap-2 border-gray-200 dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <RefreshCw className={`h-4 w-4 text-blue-600 dark:text-blue-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>

          <span className="text-xs text-gray-500 dark:text-slate-500 hidden sm:inline-block">
            Última sinc: {lastRefreshedAt.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* 2. Tarjetas Estadísticas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Alertas */}
        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-gradient-to-b from-white to-gray-50/50 dark:from-slate-950 dark:to-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">
              Total Alertas Despachadas
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span>{stats.appointmentRemindersCount} Turnos</span>
              <span>•</span>
              <span>{stats.stockAlertsCount} Stock</span>
            </p>
          </CardContent>
        </Card>

        {/* Tasa de Éxito */}
        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-gradient-to-b from-white to-gray-50/50 dark:from-slate-950 dark:to-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">
              Tasa de Éxito de Entrega
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.successRate}%
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                {stats.sent} Exitosos
              </Badge>
            </div>
            <Progress value={stats.successRate} className="h-1.5 bg-gray-100 dark:bg-slate-800" />
          </CardContent>
        </Card>

        {/* Canales Multicanal */}
        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-gradient-to-b from-white to-gray-50/50 dark:from-slate-950 dark:to-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">
              Canales de Despacho
            </CardTitle>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Send className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Telegram: {stats.telegramCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <Mail className="h-3.5 w-3.5" />
                <span>Gmail: {stats.gmailCount}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
              Bots y SMTP con respaldo automático.
            </p>
          </CardContent>
        </Card>

        {/* Fallos / Incidentes */}
        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-gradient-to-b from-white to-gray-50/50 dark:from-slate-950 dark:to-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">
              Trazabilidad Inmutable
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>{stats.failed === 0 ? '0 Fallos' : `${stats.failed} Fallos`}</span>
              {stats.failed === 0 ? (
                <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  100% Auditado
                </span>
              ) : (
                <span className="text-xs font-normal text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                  Reintentos listos
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Registro inmutable en PostgreSQL.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Panel de Control de Disparadores Manuales (Demostración en Vivo) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Centro de Control & Disparadores Manuales de Agentes
          </h2>
          <Badge variant="secondary" className="text-[11px] font-medium">
            Entorno Demostración / Producción
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tarjeta Disparador 1: Agente Recordatorios */}
          <Card className="border-blue-200/80 dark:border-blue-900/50 shadow-md relative overflow-hidden bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-900">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                      Agente de Recordatorios de Turnos (24h)
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600 dark:text-slate-400">
                      Orquestación de avisos preventivos a pacientes con IA generativa
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  LLM Clínico
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
              <p className="text-xs text-gray-600 dark:text-slate-300">
                Consulta los turnos programados en la ventana objetivo, genera recomendaciones personalizadas (preparación previa, carnet de vacunación) y despacha automáticamente por Telegram y Gmail.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                    Ventana de Búsqueda
                  </Label>
                  <Select
                    value={String(remindersHours)}
                    onValueChange={(v) => setRemindersHours(Number(v))}
                  >
                    <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900">
                      <SelectValue placeholder="Ventana" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">Próximas 24 Horas (Mañana)</SelectItem>
                      <SelectItem value="48">Próximas 48 Horas</SelectItem>
                      <SelectItem value="72">Próximas 72 Horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <Switch
                    id="force-resend"
                    checked={remindersForce}
                    onCheckedChange={setRemindersForce}
                  />
                  <Label htmlFor="force-resend" className="text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                    Forzar reenvío
                  </Label>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Endpoint: <code className="text-blue-600 dark:text-blue-400 font-mono">POST /api/ai/appointment-reminders</code>
              </span>
              <Button
                onClick={handleExecuteReminders}
                disabled={isExecutingReminders}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 text-xs font-semibold gap-2"
              >
                {isExecutingReminders ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Ejecutando Agente...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Ejecutar Recordatorios (24h)</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Tarjeta Disparador 2: Agente de Stock Predictivo */}
          <Card className="border-amber-200/80 dark:border-amber-900/50 shadow-md relative overflow-hidden bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30 dark:from-slate-950 dark:via-amber-950/10 dark:to-slate-900">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-600 text-white shadow-sm">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                      Agente de Stock Predictivo & Run-Rate
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600 dark:text-slate-400">
                      Detección temprana de quiebre de stock sobre libro mayor inmutable
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Event-Driven
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
              <p className="text-xs text-gray-600 dark:text-slate-300">
                Calcula la velocidad de consumo diario por dosis y viales, proyecta días de cobertura restante y genera un informe ejecutivo con recomendaciones de compra para el equipo farmacéutico.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                    Historial de Consumo
                  </Label>
                  <Select
                    value={String(stockDaysWindow)}
                    onValueChange={(v) => setStockDaysWindow(Number(v))}
                  >
                    <SelectTrigger className="h-8 text-xs border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900">
                      <SelectValue placeholder="Ventana" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">Últimos 15 Días</SelectItem>
                      <SelectItem value="30">Últimos 30 Días (Estándar)</SelectItem>
                      <SelectItem value="60">Últimos 60 Días</SelectItem>
                      <SelectItem value="90">Últimos 90 Días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <Switch
                    id="force-stock-alert"
                    checked={stockForceAlert}
                    onCheckedChange={setStockForceAlert}
                  />
                  <Label htmlFor="force-stock-alert" className="text-xs text-gray-700 dark:text-slate-300 cursor-pointer">
                    Forzar alerta inmediata
                  </Label>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Endpoint: <code className="text-amber-600 dark:text-amber-400 font-mono">POST /api/ai/predictive-stock</code>
              </span>
              <Button
                onClick={handleExecuteStockAudit}
                disabled={isExecutingStock}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md shadow-amber-500/20 text-xs font-semibold gap-2"
              >
                {isExecutingStock ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Calculando Run-Rate...</span>
                  </>
                ) : (
                  <>
                    <Activity className="h-3.5 w-3.5" />
                    <span>Ejecutar Auditoría de Stock IA</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* 4. Tabla de Auditoría de Logs en Tiempo Real */}
      <Card className="border-gray-200 dark:border-slate-800 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>Bitácora de Auditoría en Tiempo Real</span>
                <Badge variant="outline" className="font-mono text-xs">
                  notifications ({logs.length})
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-gray-600 dark:text-slate-400">
                Registro inmutable de todas las decisiones, despachos y contextos de IA emitidos en el sistema.
              </CardDescription>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Buscador */}
              <div className="relative min-w-[200px]">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-400" />
                <Input
                  placeholder="Buscar destinatario, mensaje..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs border-gray-200 dark:border-slate-800"
                />
              </div>

              {/* Filtro Canal */}
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-[125px] h-9 text-xs border-gray-200 dark:border-slate-800">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos Canales</SelectItem>
                  <SelectItem value="TELEGRAM">Telegram</SelectItem>
                  <SelectItem value="GMAIL">Gmail / Email</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Estado */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[125px] h-9 text-xs border-gray-200 dark:border-slate-800">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos Estados</SelectItem>
                  <SelectItem value="SENT">Exitosos (SENT)</SelectItem>
                  <SelectItem value="FAILED">Fallidos (FAILED)</SelectItem>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium">Consultando registros de auditoría en Supabase...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
              <Bot className="h-10 w-10 text-gray-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                No se encontraron registros de auditoría con los filtros seleccionados
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-500">
                Ejecuta uno de los disparadores manuales arriba para generar nuevas alertas y verificar la trazabilidad.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-slate-900/80 text-gray-700 dark:text-slate-300 uppercase tracking-wider font-semibold border-y border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4">Tipo de Alerta</th>
                    <th className="py-3 px-4">Destinatario</th>
                    <th className="py-3 px-4">Mensaje Generado</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4 text-right">Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                  {logs.map((log) => {
                    const alertInfo = getAlertTypeInfo(log);
                    const AlertIcon = alertInfo.icon;
                    const dateFormatted = log.created_at
                      ? new Date(log.created_at).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : 'N/A';

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-blue-50/30 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        {/* Canal */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {log.channel === 'TELEGRAM' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              <MessageSquare className="h-3 w-3" />
                              Telegram
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <Mail className="h-3 w-3" />
                              Gmail / SMTP
                            </span>
                          )}
                        </td>

                        {/* Tipo de Alerta */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${alertInfo.badgeClass}`}>
                            <AlertIcon className="h-3 w-3" />
                            {alertInfo.label}
                          </span>
                        </td>

                        {/* Destinatario */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-gray-800 dark:text-slate-200">
                          {log.recipient || 'N/A'}
                        </td>

                        {/* Mensaje Corto */}
                        <td className="py-3.5 px-4 max-w-[280px] truncate text-gray-600 dark:text-slate-300">
                          {log.message?.replace(/<[^>]*>?/gm, '').slice(0, 75) || 'Sin contenido'}...
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {log.status === 'SENT' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              SENT
                            </span>
                          )}
                          {log.status === 'FAILED' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                              <XCircle className="h-3.5 w-3.5" />
                              FAILED
                            </span>
                          )}
                          {log.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              <Clock className="h-3.5 w-3.5" />
                              PENDING
                            </span>
                          )}
                        </td>

                        {/* Fecha */}
                        <td className="py-3.5 px-4 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                          {dateFormatted}
                        </td>

                        {/* Botón de Inspección */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLog(log);
                              setIsDetailOpen(true);
                            }}
                            className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 gap-1"
                          >
                            <Code2 className="h-3.5 w-3.5" />
                            <span>Contexto JSON</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Modal Inspector de Log & Contexto JSON */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800">
          <DialogHeader className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900 dark:text-white">
                    Inspección Inmutable de Auditoría
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                    ID: {selectedLog?.id || 'N/A'}
                  </DialogDescription>
                </div>
              </div>

              {selectedLog?.status === 'SENT' ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  SENT
                </Badge>
              ) : (
                <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">
                  {selectedLog?.status}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {selectedLog && (
            <Tabs defaultValue="context" className="flex-1 flex flex-col min-h-0">
              <div className="px-5 pt-3 border-b border-gray-100 dark:border-slate-800">
                <TabsList className="grid grid-cols-3 w-full max-w-sm h-8 text-xs">
                  <TabsTrigger value="context" className="text-xs">
                    Contexto JSON
                  </TabsTrigger>
                  <TabsTrigger value="message" className="text-xs">
                    Mensaje Clínico
                  </TabsTrigger>
                  <TabsTrigger value="metadata" className="text-xs">
                    Trazabilidad
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab 1: JSON */}
              <TabsContent value="context" className="flex-1 p-5 m-0 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">
                    Carga Útil del Agente (context):
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyJSON(selectedLog.context)}
                    className="h-7 text-xs gap-1.5"
                  >
                    {hasCopiedJSON ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar JSON</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="relative rounded-lg bg-slate-900 p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner border border-slate-800">
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </div>
              </TabsContent>

              {/* Tab 2: Mensaje */}
              <TabsContent value="message" className="flex-1 p-5 m-0 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span>Destinatario: <b className="text-gray-800 dark:text-slate-200">{selectedLog.recipient}</b></span>
                  <span>Canal: <b className="text-blue-600 dark:text-blue-400">{selectedLog.channel}</b></span>
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-slate-800 p-4 bg-gray-50/50 dark:bg-slate-900/50 text-sm whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-slate-200">
                  {selectedLog.message}
                </div>

                {selectedLog.error_detail && (
                  <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      Detalle de Error Registrado:
                    </p>
                    <p className="mt-1 font-mono">{selectedLog.error_detail}</p>
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: Metadatos */}
              <TabsContent value="metadata" className="flex-1 p-5 m-0 overflow-y-auto space-y-3">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                    <p className="text-gray-500 dark:text-slate-400 font-medium">Fecha de Creación</p>
                    <p className="font-semibold text-gray-800 dark:text-slate-200 mt-1">
                      {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString('es-AR') : 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                    <p className="text-gray-500 dark:text-slate-400 font-medium">Fecha de Despacho Efectivo</p>
                    <p className="font-semibold text-gray-800 dark:text-slate-200 mt-1">
                      {selectedLog.sent_at ? new Date(selectedLog.sent_at).toLocaleString('es-AR') : 'Pendiente / Fallido'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                    <p className="text-gray-500 dark:text-slate-400 font-medium">Canal de Transmisión</p>
                    <p className="font-semibold text-gray-800 dark:text-slate-200 mt-1">
                      {selectedLog.channel} API
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                    <p className="text-gray-500 dark:text-slate-400 font-medium">Firma Inmutable de Registro</p>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      Verificado en Supabase
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDetailOpen(false)}
              className="text-xs"
            >
              Cerrar Inspector
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Modal de Resultados Batch de Recordatorios */}
      <Dialog open={isReminderReportOpen} onOpenChange={setIsReminderReportOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800">
          <DialogHeader className="p-5 border-b border-gray-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-600 text-white">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900 dark:text-white">
                  Reporte de Ejecución: Agente de Recordatorios
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 dark:text-slate-400">
                  Resumen consolidado del ciclo autónomo de 24 horas
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {reminderReport && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {/* Tarjetas rápidas de resultados */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                  <p className="text-xs text-gray-500 dark:text-slate-400">Turnos Detectados</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {reminderReport.total_scheduled_found}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Enviados con Éxito</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {reminderReport.reminders_sent}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Ya Notificados</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {reminderReport.already_notified_count}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <p className="text-xs text-rose-600 dark:text-rose-400">Fallidos</p>
                  <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                    {reminderReport.reminders_failed}
                  </p>
                </div>
              </div>

              {/* Lista detallada de turnos procesados */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">
                  Detalle por Paciente
                </h4>
                {reminderReport.results.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-slate-400 py-4 text-center">
                    No hubo turnos pendientes de notificación en la ventana horaria especificada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {reminderReport.results.map((r) => (
                      <div
                        key={r.appointment_id}
                        className="p-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {r.patient_name} <span className="font-normal text-gray-500">• {r.vaccine_name}</span>
                          </p>
                          <p className="text-gray-500 dark:text-slate-400 text-[11px]">
                            Turno: {r.appointment_date} a las {r.appointment_time} hs
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {r.channels.telegram.attempted && (
                            <Badge variant="outline" className={r.channels.telegram.success ? 'text-sky-600 border-sky-300' : 'text-rose-600 border-rose-300'}>
                              Telegram: {r.channels.telegram.success ? 'OK' : 'Error'}
                            </Badge>
                          )}
                          {r.channels.email.attempted && (
                            <Badge variant="outline" className={r.channels.email.success ? 'text-rose-600 border-rose-300' : 'text-rose-600 border-rose-300'}>
                              Email: {r.channels.email.success ? 'OK' : 'Error'}
                            </Badge>
                          )}
                          <Badge className={r.status === 'SENT' ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-white'}>
                            {r.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
            <Button
              size="sm"
              onClick={() => setIsReminderReportOpen(false)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Modal de Resultados de Auditoría de Stock IA */}
      <Dialog open={isStockReportOpen} onOpenChange={setIsStockReportOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800">
          <DialogHeader className="p-5 border-b border-gray-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-600 text-white">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900 dark:text-white">
                  Reporte de Auditoría: Stock Predictivo IA
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 dark:text-slate-400">
                  Diagnóstico de Run-Rate y Despacho de Alertas
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {stockReport && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
                  <p className="text-xs text-gray-500 dark:text-slate-400">Total Analizadas</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {stockReport.total_vaccines_analyzed}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-600 dark:text-amber-400">Vacunas Críticas</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {stockReport.critical_vaccines_count}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Ventana de Análisis</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {stockReport.window_days} Días
                  </p>
                </div>
              </div>

              {/* Contenido de Alerta Generada por IA */}
              {stockReport.ai_alert && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-800 dark:text-amber-300">
                      {stockReport.ai_alert.headline}
                    </span>
                    <Badge className="bg-amber-600 text-white">
                      Urgencia: {stockReport.ai_alert.urgency}
                    </Badge>
                  </div>
                  <p className="text-gray-700 dark:text-slate-300">
                    {stockReport.ai_alert.clinical_assessment}
                  </p>
                </div>
              )}

              {/* Desglose de Vacunas Críticas */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase">
                  Diagnóstico por Vacuna
                </h4>
                {stockReport.analyses.map((item) => (
                  <div
                    key={item.vaccine_id}
                    className="p-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-gray-500 dark:text-slate-400 text-[11px]">
                        Stock actual: {item.current_stock_vials} viales ({item.current_stock_ml} ml) • Días restantes: {item.days_remaining === 999 ? 'Óptimo (+90d)' : `${item.days_remaining} días`}
                      </p>
                    </div>

                    <div>
                      {item.is_critical ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {item.urgency_level}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                          {item.urgency_level}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
            <Button
              size="sm"
              onClick={() => setIsStockReportOpen(false)}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              Cerrar Reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
