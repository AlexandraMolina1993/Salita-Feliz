// app/dashboard/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import {
  getDashboardStats,
  getVaccineStats,
  getPatientStats,
  getGeneralNurseStats,
  getAppointmentStats,
} from '@/lib/database';
import { type Vaccine, type Patient, type Nurse, type Appointment } from '@/lib/supabase';
import { Card as UICard } from '@/components/ui/card'
import { Syringe, User, Stethoscope, Briefcase, Calendar, CheckCircle, Clock, Ban } from 'lucide-react'
import { DashboardModal } from '@/components/dashboard-modal'

export default function DashboardPage() {
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [vaccineStats, setVaccineStats] = useState<any>(null)
  const [patientStats, setPatientStats] = useState<any>(null)
  const [nurseStats, setNurseStats] = useState<any>(null)
  const [appointmentStats, setAppointmentStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

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

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        const [stats, vStats, pStats, nStats, aStats] = await Promise.all([
          getDashboardStats(),
          getVaccineStats(),
          getPatientStats(),
          getGeneralNurseStats(),
          getAppointmentStats(),
        ])
        setDashboardStats(stats)
        setVaccineStats(vStats)
        setPatientStats(pStats)
        setNurseStats(nStats)
        setAppointmentStats(aStats)
      } catch (err) {
        console.error("Error al cargar datos del dashboard:", err)
        setError(err instanceof Error ? err : new Error("Ocurrió un error desconocido."))
      } finally {
        setLoading(false)
      }
    }
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
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600 animate-pulse">Cargando datos del panel de control...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        <p>Error al cargar el panel de control: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-slide-in-up p-6">
      <h1 className="text-4xl font-bold gradient-text flex items-center gap-3">
        <Calendar className="h-10 w-10 text-blue-600" />
        Panel de Control
      </h1>
      <p className="text-muted-foreground mt-2 text-lg">
        Última actualización de estadísticas.
      </p>

      {dashboardStats && patientStats && nurseStats && vaccineStats && appointmentStats && (
        // 🚨 CONTENEDOR DE CENTRADO AÑADIDO (Centra todas las secciones de Grid)
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Sección de Estadísticas de Pacientes */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card
              title="Total Pacientes"
              value={patientStats.total}
              icon={<User />}
              style={{ background: 'linear-gradient(135deg, #7F5AF9, #5C41A8)', color: 'white' }}
              onClick={() => openModal("Total Pacientes", patientStats.allPatients, 'patients')}
            />
            <Card
              title="Pacientes Activos"
              value={patientStats.active}
              icon={<User />}
              style={{ background: 'linear-gradient(135deg, #00C6FF, #0072B2)', color: 'white' }}
              onClick={() => openModal("Pacientes Activos", patientStats.activePatients, 'patients')}
            />
            <Card
              title="Pacientes Inactivos"
              value={patientStats.inactive}
              icon={<User />}
              style={{ background: 'linear-gradient(135deg, #FF6B81, #E85064)', color: 'white' }}
              onClick={() => openModal("Pacientes Inactivos", patientStats.inactivePatients, 'patients')}
            />
          </section>

          {/* Sección de Estadísticas de ENFERMEROS (PROPS CORREGIDOS) */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card
              title="Total Enfermeros"
              value={nurseStats.total}
              icon={<Stethoscope />} // 🚨 CORREGIDO
              style={{ background: 'linear-gradient(135deg, #4A4E69, #2C2C54)', color: 'white' }} // 🚨 CORREGIDO
              onClick={() => openModal("Total Enfermeros", nurseStats.allNurses, 'nurses')}
            />
            <Card
              title="Enfermeros Activos"
              value={nurseStats.active}
              icon={<Stethoscope />} // 🚨 CORREGIDO
              style={{ background: 'linear-gradient(135deg, #00C6FF, #0072B2)', color: 'white' }} // 🚨 CORREGIDO
              onClick={() => openModal("Enfermeros Activos", nurseStats.activeNurses, 'nurses')}
            />
            <Card
              title="Enfermeros Inactivos"
              value={nurseStats.inactive}
              icon={<Briefcase />} // 🚨 CORREGIDO
              style={{ background: 'linear-gradient(135deg, #FF6B81, #E85064)', color: 'white' }} // 🚨 CORREGIDO
              onClick={() => openModal("Enfermeros Inactivos", nurseStats.inactiveNurses, 'nurses')}
            />
          </section>

          {/* Sección de Estadísticas de Turnos */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card
              title="Turnos Programados"
              value={appointmentStats.scheduled}
              icon={<Clock />}
              style={{ background: 'linear-gradient(135deg, #A4C6FF, #6A86FF)', color: 'white' }}
              onClick={() => openModal("Turnos Programados", appointmentStats.scheduledAppointments, 'appointments')}
            />
            <Card
              title="Turnos Completados"
              value={appointmentStats.completed}
              icon={<CheckCircle />}
              style={{ background: 'linear-gradient(135deg, #00C6FF, #0072B2)', color: 'white' }}
              onClick={() => openModal("Turnos Completados", appointmentStats.completedAppointments, 'appointments')}
            />
            <Card
              title="Turnos Cancelados"
              value={appointmentStats.cancelled}
              icon={<Ban />}
              style={{ background: 'linear-gradient(135deg, #A40F24, #940E21)', color: 'white' }}
              onClick={() => openModal("Turnos Cancelados", appointmentStats.cancelledAppointments, 'appointments')}
            />
          </section>

          {/* Sección de Estadísticas de Vacunas */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              title="Total Vacunas"
              value={vaccineStats.total}
              icon={<Syringe />}
              style={{ background: 'linear-gradient(135deg, #7F5AF9, #5C41A8)', color: 'white' }}
              onClick={() => openModal("Total Vacunas", vaccineStats.allVaccines, 'vaccines')}
            />
            <Card
              title="Vacunas Bajo Stock"
              value={vaccineStats.lowStock}
              icon={<Syringe />}
              style={{ background: 'linear-gradient(135deg, #FF6B81, #E85064)', color: 'white' }}
              onClick={() => openModal("Vacunas con Stock Bajo", vaccineStats.lowStockVaccines, 'vaccines')}
            />
            <Card
              title="Vacunas Por Vencer"
              value={vaccineStats.expiringSoon}
              icon={<Syringe />}
              style={{ background: 'linear-gradient(135deg, #FF8A00, #E67A00)', color: 'white' }}
              onClick={() => openModal("Vacunas Por Vencer", vaccineStats.expiringSoonVaccines, 'vaccines')}
            />
            <Card
              title="Vacunas Vencidas"
              value={vaccineStats.expired}
              icon={<Syringe />}
              style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)', color: 'white' }}
              onClick={() => openModal("Vacunas Vencidas", vaccineStats.expiredVaccines, 'vaccines')}
            />
          </section>
        </div> // 🚨 FIN DEL CONTENEDOR DE CENTRADO
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

// ... (El componente Card se mantiene igual)
interface DashboardCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass?: string;
  style?: React.CSSProperties;
  onClick: () => void;
}

function Card({ title, value, icon, colorClass, style, onClick }: DashboardCardProps) {
  return (
    <UICard
      onClick={onClick}
      className={`p-6 rounded-lg shadow-md flex items-center justify-between cursor-pointer hover:shadow-lg transition-shadow duration-300 modern-card ${colorClass} text-white`}
      style={style}
    >
      <div>
        <h3 className="text-sm font-medium opacity-80">{title}</h3>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </div>
      <div className="p-3 rounded-full opacity-70">
        {React.cloneElement(icon as React.ReactElement, { className: 'h-8 w-8' })}
      </div>
    </UICard>
  );
}