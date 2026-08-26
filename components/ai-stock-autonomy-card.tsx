'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  TrendingDown,
  Activity,
  Send,
  CheckCircle2,
  RefreshCw,
  Search,
  ShieldAlert,
  CalendarDays,
  Zap,
  Info,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StockRunRateAnalysis, PredictiveStockReport } from '@/types/vaccine';
import Link from 'next/link';

import { getVaccineRunRateAction } from '@/app/actions/vaccines';

interface AIStockAutonomyCardProps {
  /** Si se pasa vaccineId, el componente muestra el diagnóstico específico para esa vacuna */
  vaccineId?: string;
  /** Título personalizado opcional */
  title?: string;
  /** Si es compacto (para barras laterales o vistas reducidas) */
  compact?: boolean;
  /** Callback opcional al actualizar */
  onRefresh?: () => void;
}

export function AIStockAutonomyCard({
  vaccineId,
  title,
  compact = false,
  onRefresh,
}: AIStockAutonomyCardProps) {
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<StockRunRateAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, startScanTransition] = useTransition();
  const [selectedWindow, setSelectedWindow] = useState<number>(30);
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lastReport, setLastReport] = useState<PredictiveStockReport | null>(null);

  const fetchRunRateData = async (days: number) => {
    try {
      setLoading(true);
      const res = await getVaccineRunRateAction(days);

      if (res.success && Array.isArray(res.data)) {
        setAnalyses(res.data);
      } else {
        throw new Error(res.error || 'Error al obtener diagnóstico predictivo.');
      }
    } catch (error) {
      console.error('[AIStockAutonomyCard] Error al cargar análisis:', error);
      toast({
        title: 'Error de IA Predictiva',
        description: 'No se pudo calcular la proyección de run-rate.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunRateData(selectedWindow);
  }, [selectedWindow]);

  const handleRunFullAIAutonomousScan = () => {
    startScanTransition(async () => {
      try {
        const res = await fetch('/api/ai/predictive-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            daysWindow: selectedWindow,
            forceAlert: false,
            notifyTelegram: true,
            notifyEmail: true,
          }),
        });

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Error al ejecutar el motor de alertas.');
        }

        setLastReport(json.report);
        await fetchRunRateData(selectedWindow);

        if (onRefresh) onRefresh();

        const criticalCount = json.report?.critical_vaccines_count || 0;
        const tgSent = json.report?.dispatch_results?.telegram?.success;
        const emailSent = json.report?.dispatch_results?.gmail?.success;

        toast({
          title: '🧠 Análisis de IA Completado',
          description: `Diagnóstico ejecutado: ${criticalCount} vacunas críticas detectadas. Notificaciones: ${
            tgSent ? 'Telegram ✓ ' : ''
          }${emailSent ? 'Gmail ✓' : tgSent ? '' : 'Monitoreo activo'}`,
        });
      } catch (error) {
        console.error('[AIStockAutonomyCard] Error al escanear:', error);
        toast({
          title: 'Error en Escaneo de IA',
          description: error instanceof Error ? error.message : 'Fallo en el motor autónomo.',
          variant: 'destructive',
        });
      }
    });
  };

  // Si estamos en modo vacuna individual
  const singleVaccineAnalysis = vaccineId
    ? analyses.find((a) => a.vaccine_id === vaccineId)
    : null;

  // Filtrado de vacunas para la vista general
  const filteredAnalyses = analyses.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.laboratory && item.laboratory.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.type && item.type.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesUrgency =
      filterUrgency === 'ALL' ||
      (filterUrgency === 'CRITICAL' && item.urgency_level === 'CRITICAL') ||
      (filterUrgency === 'HIGH' && item.urgency_level === 'HIGH') ||
      (filterUrgency === 'MEDIUM' && item.urgency_level === 'MEDIUM') ||
      (filterUrgency === 'OPTIMAL' && item.urgency_level === 'OPTIMAL');

    return matchesSearch && matchesUrgency;
  });

  const criticalCount = analyses.filter((a) => a.is_critical).length;
  const avgDaysRemaining =
    analyses.length > 0
      ? Math.round(
          analyses.reduce((acc, curr) => acc + (curr.days_remaining > 365 ? 365 : curr.days_remaining), 0) /
            analyses.length
        )
      : 0;

  const getUrgencyBadge = (urgency: string, days: number) => {
    switch (urgency) {
      case 'CRITICAL':
        return (
          <Badge className="bg-rose-600 text-white font-bold flex items-center gap-1 shadow-sm animate-pulse">
            <Flame className="h-3 w-3" />
            Crítico ({days === 0 ? 'Sin stock' : `${days}d`})
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge className="bg-amber-500 text-white font-semibold flex items-center gap-1 shadow-sm">
            <AlertTriangle className="h-3 w-3" />
            Urgente ({days}d)
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge className="bg-sky-500 text-white font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Atención ({days}d)
          </Badge>
        );
      case 'OPTIMAL':
      default:
        return (
          <Badge className="bg-emerald-600 text-white font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Óptimo ({days > 365 ? '+365d' : `${days}d`})
          </Badge>
        );
    }
  };

  const getAutonomyBarColor = (days: number) => {
    if (days <= 7) return 'bg-rose-500';
    if (days <= 15) return 'bg-amber-500';
    if (days <= 30) return 'bg-sky-500';
    return 'bg-emerald-500';
  };

  // =========================================================================
  // VISTA MODO VACUNA ESPECÍFICA (Para el detalle de /dashboard/vacunas/[id])
  // =========================================================================
  if (vaccineId) {
    if (loading) {
      return (
        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm">
          <CardContent className="p-6 flex items-center justify-center space-x-3">
            <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-slate-600">Calculando proyección de IA...</p>
          </CardContent>
        </Card>
      );
    }

    if (!singleVaccineAnalysis) {
      return null;
    }

    const item = singleVaccineAnalysis;
    const progressPercent = Math.min(100, Math.max(0, (item.days_remaining / 30) * 100));

    return (
      <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/30 shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-indigo-100/60 bg-white/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  Motor Predictivo & Run-Rate de IA
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Proyección basada en {selectedWindow} días de consumo en el ledger
                </CardDescription>
              </div>
            </div>
            {getUrgencyBadge(item.urgency_level, item.days_remaining)}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Métricas Principales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-center shadow-xs">
              <p className="text-[11px] font-semibold text-slate-400">Autonomía Proyectada</p>
              <p className="text-xl font-black text-indigo-700">
                {item.days_remaining > 365 ? '+1 año' : `${item.days_remaining} días`}
              </p>
              <p className="text-[10px] text-slate-400">según ritmo actual</p>
            </div>

            <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-center shadow-xs">
              <p className="text-[11px] font-semibold text-slate-400">Velocidad / Día</p>
              <p className="text-xl font-black text-slate-800">
                {item.daily_consumption_ml.toFixed(2)} <span className="text-xs font-normal">ml</span>
              </p>
              <p className="text-[10px] text-slate-400">≈ {item.daily_consumption_vials.toFixed(2)} viales/día</p>
            </div>

            <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-center shadow-xs">
              <p className="text-[11px] font-semibold text-slate-400">Consumo Período</p>
              <p className="text-xl font-black text-sky-600">
                {item.total_consumed_ml_period.toFixed(1)} <span className="text-xs font-normal">ml</span>
              </p>
              <p className="text-[10px] text-slate-400">{item.total_consumed_vials_period} viales en {selectedWindow}d</p>
            </div>

            <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-center shadow-xs">
              <p className="text-[11px] font-semibold text-slate-400">Reorden Sugerido</p>
              <p className="text-xl font-black text-emerald-600">
                +{item.recommended_reorder_vials} <span className="text-xs font-normal">viales</span>
              </p>
              <p className="text-[10px] text-slate-400">para 30 días de buffer</p>
            </div>
          </div>

          {/* Barra Visual de Autonomía */}
          <div className="space-y-1.5 bg-white p-3.5 border border-slate-200/80 rounded-xl">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-600" /> Cobertura de Stock Estimada
              </span>
              <span className="font-bold text-indigo-700">{item.days_remaining} días restantes</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getAutonomyBarColor(item.days_remaining)} transition-all duration-700 rounded-full`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              💡 <span className="font-semibold">Diagnóstico IA:</span> {item.reorder_reason}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // =========================================================================
  // VISTA MODO DASHBOARD GENERAL
  // =========================================================================
  return (
    <Card className="border border-indigo-100/80 bg-white shadow-xl rounded-2xl overflow-hidden">
      {/* HEADER PRINCIPAL */}
      <CardHeader className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-inner shrink-0">
              <Sparkles className="h-6 w-6 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl md:text-2xl font-black text-white tracking-tight">
                  {title || 'Estado de Autonomía y Alerta de IA'}
                </CardTitle>
                <span className="inline-flex items-center gap-1 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Zap className="h-2.5 w-2.5 text-amber-300" /> Run-Rate Engine v2.0
                </span>
              </div>
              <CardDescription className="text-indigo-200/80 text-xs mt-1">
                Monitoreo algorítmico continuo sobre movimientos de inventario inmutables con proyección predictiva de agotamiento.
              </CardDescription>
            </div>
          </div>

          {/* Acciones y Selectores */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto">
            <Select
              value={selectedWindow.toString()}
              onValueChange={(val) => setSelectedWindow(Number(val))}
            >
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white text-xs h-9 rounded-xl focus:ring-indigo-400">
                <CalendarDays className="h-3.5 w-3.5 mr-1 text-indigo-200" />
                <SelectValue placeholder="Ventana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="15">Últimos 15 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="60">Últimos 60 días</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleRunFullAIAutonomousScan}
              disabled={isScanning || loading}
              className="bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-bold text-xs h-9 rounded-xl shadow-lg shadow-indigo-500/30 px-3.5 flex items-center gap-1.5 border border-indigo-400/30"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Analizando...' : 'Escanear IA'}</span>
            </Button>
          </div>
        </div>

        {/* METRICS STRIP HEADER */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <p className="text-[11px] text-indigo-200/70 font-semibold">Vacunas Analizadas</p>
            <p className="text-xl font-bold text-white mt-0.5">{analyses.length}</p>
            <p className="text-[10px] text-indigo-200/50">catálogo activo</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <p className="text-[11px] text-rose-300 font-semibold flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Vacunas Críticas
            </p>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{criticalCount}</p>
            <p className="text-[10px] text-rose-200/60">requieren reposición</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <p className="text-[11px] text-indigo-200/70 font-semibold">Autonomía Media</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">≈ {avgDaysRemaining} días</p>
            <p className="text-[10px] text-indigo-200/50">cobertura estimada</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <p className="text-[11px] text-indigo-200/70 font-semibold">Alertas Autónomas</p>
            <p className="text-xl font-bold text-sky-300 mt-0.5">Telegram & Mail</p>
            <p className="text-[10px] text-indigo-200/50">canal sincronizado</p>
          </div>
        </div>
      </CardHeader>

      {/* CONTENIDO DEL CUERPO: FILTROS Y LISTADO */}
      <CardContent className="p-6 space-y-6">
        {/* Barra de Filtro y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar vacuna o laboratorio..."
              className="pl-9 h-9 text-xs bg-white rounded-lg border-slate-200 focus:border-indigo-500"
            />
          </div>

          {/* Filtro por Urgencia */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Button
              variant={filterUrgency === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterUrgency('ALL')}
              className={`text-xs h-8 rounded-lg ${filterUrgency === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
            >
              Todas ({analyses.length})
            </Button>
            <Button
              variant={filterUrgency === 'CRITICAL' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFilterUrgency('CRITICAL')}
              className="text-xs h-8 rounded-lg"
            >
              Críticas ({criticalCount})
            </Button>
            <Button
              variant={filterUrgency === 'HIGH' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterUrgency('HIGH')}
              className={`text-xs h-8 rounded-lg ${filterUrgency === 'HIGH' ? 'bg-amber-500 text-white' : 'text-slate-600'}`}
            >
              Urgentes ({analyses.filter((a) => a.urgency_level === 'HIGH').length})
            </Button>
            <Button
              variant={filterUrgency === 'OPTIMAL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterUrgency('OPTIMAL')}
              className={`text-xs h-8 rounded-lg ${filterUrgency === 'OPTIMAL' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
            >
              Óptimas ({analyses.filter((a) => a.urgency_level === 'OPTIMAL').length})
            </Button>
          </div>
        </div>

        {/* LISTADO DE PROYECCIONES */}
        {loading ? (
          <div className="text-center py-12 space-y-3">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-500">
              Consultando ledger de stock y calculando run-rates...
            </p>
          </div>
        ) : filteredAnalyses.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Info className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">No se encontraron vacunas con este filtro</p>
            <p className="text-xs text-slate-400 mt-1">Prueba seleccionando otro nivel de urgencia o término de búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAnalyses.map((item) => {
              const barProgress = Math.min(100, Math.max(0, (item.days_remaining / 30) * 100));

              return (
                <div
                  key={item.vaccine_id}
                  className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-xl p-4 shadow-xs hover:shadow-md transition-all space-y-3 relative group"
                >
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/dashboard/vacunas/${item.vaccine_id}`}
                        className="font-bold text-slate-800 hover:text-indigo-600 text-sm flex items-center gap-1 transition-colors"
                      >
                        {item.name}
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                      <p className="text-xs text-slate-400 font-medium">
                        {item.laboratory || 'Laboratorio no especificado'} {item.type ? `• ${item.type}` : ''}
                      </p>
                    </div>
                    {getUrgencyBadge(item.urgency_level, item.days_remaining)}
                  </div>

                  {/* Stock Actual y Dosis */}
                  <div className="grid grid-cols-3 gap-2 py-1 text-center bg-slate-50/80 rounded-lg border border-slate-100 text-xs">
                    <div className="p-1.5">
                      <span className="text-[10px] text-slate-400 block">Stock Actual</span>
                      <span className="font-bold text-slate-800">
                        {item.current_stock_vials} <span className="font-normal text-[10px]">viales</span>
                      </span>
                    </div>
                    <div className="p-1.5 border-x border-slate-200/60">
                      <span className="text-[10px] text-slate-400 block">Volumen (ml)</span>
                      <span className="font-bold text-slate-800">
                        {item.current_stock_ml.toFixed(1)} <span className="font-normal text-[10px]">ml</span>
                      </span>
                    </div>
                    <div className="p-1.5">
                      <span className="text-[10px] text-slate-400 block">Consumo Diario</span>
                      <span className="font-bold text-indigo-600">
                        {item.daily_consumption_ml.toFixed(2)} <span className="font-normal text-[10px]">ml/d</span>
                      </span>
                    </div>
                  </div>

                  {/* Barra de Proyección de Días Restantes */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Proyección de Agotamiento:</span>
                      <span className={item.is_critical ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                        {item.days_remaining === 0
                          ? 'Agotado (0 días)'
                          : item.days_remaining > 365
                          ? '+1 año de stock'
                          : `${item.days_remaining} días restantes`}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getAutonomyBarColor(item.days_remaining)} transition-all duration-500 rounded-full`}
                        style={{ width: `${barProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Diagnóstico de Reorden */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 truncate max-w-[210px]" title={item.reorder_reason}>
                      💡 {item.reorder_reason}
                    </span>
                    {item.recommended_reorder_vials > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shrink-0">
                        Pedir +{item.recommended_reorder_vials} viales
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                        Stock Cubierto
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
