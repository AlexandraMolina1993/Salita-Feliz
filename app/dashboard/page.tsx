// app/dashboard/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import {
  getDashboardStats,
  getPatientStats,
  getGeneralNurseStats,
  getAppointmentStats,
} from '@/lib/database';
import { getVaccineStockList } from '@/services/vaccineService';
import { getVaccinesStockAction, getVaccinationRhythmAction, type VaccinationRhythmStats } from '@/app/actions/vaccines';
import type { VaccineStockView } from '@/types/vaccine';
// 🔐 IMPORTANTE: Conexión con tu sistema de autenticación de administradores
import { fetchAdminProfile } from '@/lib/auth';
import { Card as UICard } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Syringe, User, Stethoscope, Calendar, CheckCircle, Clock, TrendingUp, PieChart, Sparkles, ShieldCheck, Droplet, AlertTriangle, Activity } from 'lucide-react'
import { DashboardModal } from '@/components/dashboard-modal'
import { AIStockAutonomyCard } from '@/components/ai-stock-autonomy-card'

export default function DashboardPage() {
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [vaccineStockList, setVaccineStockList] = useState<VaccineStockView[]>([])
  const [vaccinationRhythm, setVaccinationRhythm] = useState<VaccinationRhythmStats | null>(null)
  const [patientStats, setPatientStats] = useState<any>(null)
  const [nurseStats, setNurseStats] = useState<any>(null)
  const [appointmentStats, setAppointmentStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // 👤 Estado para guardar el nombre real del Administrador logueado
  const [adminName, setAdminName] = useState<string>('Administrador')

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    title: string
    data: any[]
    type: 'patients' | 'nurses' | 'vaccines' | 'appointments' | null
  }>({
    isOpen: false,
    title: '',
    data: [],
    type: null,
  })

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Carga en paralelo de métricas con la vista v_vaccines_stock en tiempo real y ritmo de vacunación
      const [stats, vStockList, pStats, nStats, aStats, rhythmStats, adminProfile] = await Promise.all([
        getDashboardStats().catch(() => null),
        getVaccinesStockAction().catch(async () => {
          return getVaccineStockList().catch(() => []);
        }),
        getPatientStats().catch(() => null),
        getGeneralNurseStats().catch(() => null),
        getAppointmentStats().catch(() => null),
        getVaccinationRhythmAction(30).catch(() => null),
        fetchAdminProfile().catch(() => null)
      ])
      
      setDashboardStats(stats)
      setVaccineStockList((vStockList as any[]) || [])
      setVaccinationRhythm(rhythmStats)
      setPatientStats(pStats)
      setNurseStats(nStats)
      setAppointmentStats(aStats)

      if (adminProfile && adminProfile.name) {
        const primerNombre = adminProfile.name.split(' ')[0];
        setAdminName(primerNombre);
      }
    } catch (err) {
      console.error("Error al cargar datos del dashboard:", err)
      setError(err instanceof Error ? err : new Error("Ocurrió un error desconocido."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const openModal = (title: string, data: any[], type: 'patients' | 'nurses' | 'vaccines' | 'appointments') => {
    setModalState({ isOpen: true, title, data, type })
  }

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50/50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium animate-pulse">Cargando métricas de Salita Feliz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500 bg-slate-50/50">
        <p className="font-medium">⚠️ Error al cargar el panel de control: {error.message}</p>
      </div>
    )
  }

  // --- CÁLCULOS DINÁMICOS BASADOS EN v_vaccines_stock ---
  const totalTurnos = (appointmentStats?.scheduled || 0) + (appointmentStats?.completed || 0) + (appointmentStats?.cancelled || 0) || 1;
  const pctProgramados = Math.round(((appointmentStats?.scheduled || 0) / totalTurnos) * 100);
  const pctCompletados = Math.round(((appointmentStats?.completed || 0) / totalTurnos) * 100);
  const pctCancelados = Math.round(((appointmentStats?.cancelled || 0) / totalTurnos) * 100);

  const totalVacunasCount = vaccineStockList.length || 1;
  const totalViales = vaccineStockList.reduce(
    (acc, v) => acc + (Number(v.physical_vials ?? v.current_stock_vials ?? v.physical_vials_for_repos) || 0),
    0
  );
  const totalMl = vaccineStockList.reduce((acc, v) => acc + (Number(v.total_ml ?? v.current_stock_ml) || 0), 0);

  const vacunasOptimas = vaccineStockList.filter((v) => v.stock_status === 'OPTIMAL');
  const vacunasBajoStock = vaccineStockList.filter((v) => v.stock_status === 'CRITICAL_LOW');
  const vacunasAgotadas = vaccineStockList.filter((v) => v.stock_status === 'OUT_OF_STOCK');

  const isExpiringSoon = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  const vacunasPorVencer = vaccineStockList.filter((v) => isExpiringSoon(v.expiration_date));
  const vacunasVencidas = vaccineStockList.filter((v) => isExpired(v.expiration_date));

  const pctOptimas = Math.round((vacunasOptimas.length / totalVacunasCount) * 100);
  const pctBajoStock = Math.round((vacunasBajoStock.length / totalVacunasCount) * 100);
  const pctAgotadas = Math.round((vacunasAgotadas.length / totalVacunasCount) * 100);
  const pctPorVencer = Math.round((vacunasPorVencer.length / totalVacunasCount) * 100);

  return (
    <div className="min-h-screen bg-slate-50/60 p-6 lg:p-8 space-y-8 animate-slide-in-up">
      
      {/* ENCABEZADO PRINCIPAL */}
      <div className="mb-6 space-y-2 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50/60 border border-indigo-100/50 w-fit px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          ¡Hola de nuevo, {adminName}! Bienvenido al centro de control
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">
                Panel de Control General
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 font-medium">
              Monitoreo en tiempo real de pacientes, inventario clínico (v_vaccines_stock) y motor de IA predictiva.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full text-[11px] font-bold text-emerald-600 w-fit shadow-sm self-start md:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ledger & Vista v_vaccines_stock Activos
          </div>
        </div>
      </div>

      {patientStats && nurseStats && appointmentStats && (
        <div className="max-w-7xl mx-auto space-y-8">

          {/* 1️⃣ FILA SUPERIOR: RESUMEN DE MÉTRICAS CLAVE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MiniCard 
              title="Pacientes Registrados" 
              value={patientStats.total} 
              icon={<User className="text-indigo-600" />} 
              subtitle={`${patientStats.active} activos con cobertura`}
              onClick={() => openModal("Total Pacientes", patientStats.allPatients, 'patients')}
            />
            <MiniCard 
              title="Personal de Enfermería" 
              value={nurseStats.total} 
              icon={<Stethoscope className="text-sky-600" />} 
              subtitle={`${nurseStats.active} enfermeros operativos`}
              onClick={() => openModal("Total Enfermeros", nurseStats.allNurses, 'nurses')}
            />
            <MiniCard 
              title="Turnos Concluidos" 
              value={appointmentStats.completed} 
              icon={<CheckCircle className="text-emerald-600" />} 
              subtitle={`${pctCompletados}% efectividad clínica`}
              onClick={() => openModal("Turnos Completados", appointmentStats.completedAppointments, 'appointments')}
            />
            <MiniCard 
              title="Ritmo de Vacunación (Últimos 30 días)" 
              value={`${vaccinationRhythm?.totalDoses ?? 0} dosis`} 
              icon={<Activity className="text-indigo-600" />} 
              subtitle={`Más solicitada: ${vaccinationRhythm?.topVaccineName || "Sin aplicaciones"}`}
              badge={(vaccinationRhythm?.totalDoses ?? 0) > 0 ? "Activo" : undefined}
              onClick={() => openModal("Turnos Completados (Últimos 30 días)", vaccinationRhythm?.completedAppointments || appointmentStats?.completedAppointments || [], 'appointments')}
            />
          </div>

          {/* 2️⃣ COMPONENTE DE ESTADO DE AUTONOMÍA Y ALERTA DE IA */}
          <div className="space-y-2">
            <AIStockAutonomyCard onRefresh={loadDashboardData} />
          </div>

          {/* 3️⃣ FILA CENTRAL: GRÁFICOS ANALÍTICOS Y GESTIÓN DE STOCK */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Rendimiento de Turnos */}
            <UICard className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                    Distribución y Rendimiento de Turnos
                  </h3>
                  <p className="text-xs text-slate-400">Proporción basada en {totalTurnos} turnos registrados</p>
                </div>
              </div>

              <div className="space-y-5 py-2">
                <ProgressBar label="Turnos Completados (Dosis Aplicada)" count={appointmentStats.completed} percentage={pctCompletados} color="bg-emerald-500" onClick={() => openModal("Turnos Completados", appointmentStats.completedAppointments, 'appointments')} />
                <ProgressBar label="Turnos Programados / En Espera" count={appointmentStats.scheduled} percentage={pctProgramados} color="bg-amber-500" onClick={() => openModal("Turnos Programados", appointmentStats.scheduledAppointments, 'appointments')} />
                <ProgressBar label="Turnos Cancelados" count={appointmentStats.cancelled} percentage={pctCancelados} color="bg-rose-500" onClick={() => openModal("Turnos Cancelados", appointmentStats.cancelledAppointments, 'appointments')} />
              </div>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-3 text-center text-xs font-medium text-slate-500">
                <div>🏁 {pctCompletados}% Completitud</div>
                <div className="border-x border-slate-100">⏳ {pctProgramados}% En Espera</div>
                <div>❌ {pctCancelados}% Cancelados</div>
              </div>
            </UICard>

            {/* Gestión Dinámica de Inventario (v_vaccines_stock) */}
            <UICard className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-sky-500" />
                    Balance de Stock Clínico (v_vaccines_stock)
                  </h3>
                  <p className="text-xs text-slate-400">Total: {totalViales} viales disponibles ({totalMl.toFixed(1)} ml)</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-indigo-600 bg-indigo-50 border-indigo-100">
                  En Tiempo Real
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 flex justify-between">
                  <span>Salud General del Inventario</span>
                  <span className="text-indigo-600 font-bold">{pctOptimas}% Stock Óptimo</span>
                </div>
                <div className="w-full h-7 bg-slate-100 rounded-lg flex overflow-hidden shadow-inner border border-slate-200/50">
                  {pctOptimas > 0 && <div style={{ width: `${pctOptimas}%` }} className="bg-emerald-500 transition-all duration-500" title="Stock Óptimo" />}
                  {pctBajoStock > 0 && <div style={{ width: `${pctBajoStock}%` }} className="bg-amber-400 transition-all duration-500" title="Stock Bajo" />}
                  {pctAgotadas > 0 && <div style={{ width: `${pctAgotadas}%` }} className="bg-rose-500 transition-all duration-500" title="Sin Stock" />}
                  {pctPorVencer > 0 && <div style={{ width: `${pctPorVencer}%` }} className="bg-purple-400 transition-all duration-500" title="Por Vencer" />}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <StockLegendItem 
                  dotColor="bg-emerald-500" 
                  label="Stock Óptimo" 
                  value={`${vacunasOptimas.length} vacunas (${vacunasOptimas.reduce((a, b) => a + b.current_stock_vials, 0)} viales)`} 
                  onClick={() => openModal("Vacunas con Stock Óptimo", vacunasOptimas, 'vaccines')} 
                />
                <StockLegendItem 
                  dotColor="bg-amber-400" 
                  label="Stock Bajo Mínimo" 
                  value={`${vacunasBajoStock.length} vacunas`} 
                  textColor="text-amber-700 font-bold"
                  onClick={() => openModal("Vacunas con Stock Bajo", vacunasBajoStock, 'vaccines')} 
                />
                <StockLegendItem 
                  dotColor="bg-rose-500" 
                  label="Sin Stock (Agotadas)" 
                  value={`${vacunasAgotadas.length} vacunas`} 
                  textColor="text-rose-700 font-bold"
                  onClick={() => openModal("Vacunas Agotadas", vacunasAgotadas, 'vaccines')} 
                />
                <StockLegendItem 
                  dotColor="bg-purple-400" 
                  label="Próximas a Vencer" 
                  value={`${vacunasPorVencer.length} lotes`} 
                  onClick={() => openModal("Vacunas Por Vencer", vacunasPorVencer, 'vaccines')} 
                />
              </div>
            </UICard>

          </div>

          {/* 4️⃣ FILA INFERIOR: MONITOREO OPERATIVO EN TIEMPO REAL */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Actividad Reciente */}
            <UICard className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    Monitoreo de Pacientes Recientes
                  </h3>
                  <p className="text-xs text-slate-400">Últimos registros vinculados en el sistema</p>
                </div>
                <span className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                  En tiempo real
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3">Paciente</th>
                      <th className="py-2.5 px-3">Acción / Cobertura</th>
                      <th className="py-2.5 px-3 text-right">Contacto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {patientStats.allPatients?.slice(0, 4).map((paciente: any, idx: number) => (
                      <tr key={paciente.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {paciente.full_name || paciente.nombre || "Paciente Registrado"}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            paciente.status === 'ACTIVE' || paciente.status === 'activo' || paciente.estado === 'activo' || !paciente.status
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${paciente.status === 'ACTIVE' || paciente.status === 'activo' || !paciente.status ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            Alta de Cobertura
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 font-mono text-[11px]">
                          {paciente.phone || paciente.telefono || "Sin teléfono"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </UICard>

            {/* Próximos Turnos Cronológicos */}
            <UICard className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-sky-500" />
                    Próximos Turnos
                  </h3>
                  <p className="text-xs text-slate-400">Cronograma inmediato de vacunación</p>
                </div>
                <button 
                  onClick={() => openModal("Turnos Programados", appointmentStats.scheduledAppointments, 'appointments')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  Ver todos
                </button>
              </div>

              <div className="space-y-3 max-h-[210px] overflow-y-auto pr-1">
                {appointmentStats.scheduledAppointments?.length > 0 ? (
                  appointmentStats.scheduledAppointments.slice(0, 3).map((turno: any, idx: number) => {
                    const nombrePaciente = turno.nombre_paciente || turno.patient_name || turno.paciente || turno.patients?.full_name || "Paciente Asignado";
                    const nombreEnfermero = turno.nombre_enfermero || turno.nurse_name || turno.enfermero || turno.nurses?.full_name || "Por asignar";

                    return (
                      <div key={turno.id || idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between group hover:border-slate-200 transition-all">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {nombrePaciente}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                            <span className="text-slate-400 font-semibold">Enf:</span> 
                            <span className="text-slate-600">{nombreEnfermero}</span>
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap">
                            {turno.hora || turno.time || turno.appointment_time || "12:30 hs"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <CheckCircle className="h-8 w-8 text-slate-200 mx-auto" />
                    <p className="text-xs font-medium">No hay turnos pendientes para hoy</p>
                  </div>
                )}
              </div>
            </UICard>

          </div>

        </div>
      )}

      <DashboardModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        data={modalState.data}
        type={modalState.type}
      />
    </div>
  );
}

// --- SUB-COMPONENTES AUXILIARES ---

interface MiniCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  subtitle: string
  badge?: string
  onClick: () => void
}

function MiniCard({ title, value, icon, subtitle, badge, onClick }: MiniCardProps) {
  return (
    <UICard 
      onClick={onClick}
      className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{value}</h3>
        </div>
        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg group-hover:bg-slate-100 transition-colors">
          {React.cloneElement(icon as React.ReactElement, { className: 'h-5 w-5' })}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">{subtitle}</span>
        {badge && (
          <span className="bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wide animate-pulse">
            {badge}
          </span>
        )}
      </div>
    </UICard>
  )
}

interface ProgressBarProps {
  label: string
  count: number
  percentage: number
  color: string
  onClick: () => void
}

function ProgressBar({ label, count, percentage, color, onClick }: ProgressBarProps) {
  return (
    <div className="space-y-1.5 cursor-pointer group" onClick={onClick}>
      <div className="flex justify-between text-xs font-medium">
        <span className="text-slate-600 group-hover:text-indigo-600 font-semibold transition-colors">{label}</span>
        <span className="text-slate-400">{count} un. <span className="font-bold text-slate-700">({percentage}%)</span></span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
        <div style={{ width: `${percentage}%` }} className={`h-full ${color} rounded-full transition-all duration-500 group-hover:brightness-95`} />
      </div>
    </div>
  )
}

interface StockLegendItemProps {
  dotColor: string
  label: string
  value: string
  textColor?: string
  onClick: () => void
}

function StockLegendItem({ dotColor, label, value, textColor = "text-slate-700", onClick }: StockLegendItemProps) {
  return (
    <div 
      onClick={onClick}
      className="p-2.5 border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all"
    >
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        <span className="text-slate-500 font-medium">{label}</span>
      </div>
      <span className={`${textColor} font-semibold`}>{value}</span>
    </div>
  )
}