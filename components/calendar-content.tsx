// components/calendar-content.tsx
'use client'

import React, { useEffect, useState } from 'react';
// Asumimos que esta función existe en tu capa de datos, ¡debes implementarla!
// Ejemplo de cómo luce la función (debes adaptarla a tu base de datos):
// export const getUpcomingVaccinations = async () => { /* lógica de supabase/SQL */ };
import { getUpcomingVaccinations } from '@/lib/database'; 
import { Button } from '@/components/ui/button';
import { Calendar as LucideCalendar, Loader2, AlertTriangle } from 'lucide-react';
import { formatNominalDate } from '@/lib/dateUtils';

interface CalendarContentProps {
  onClose: () => void;
}

export function CalendarContent({ onClose }: CalendarContentProps) {
  const [loading, setLoading] = useState(true);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Simulación de datos si aún no tienes la función implementada:
        // const data = await getUpcomingVaccinations();
        const data = [
            { patient_name: "Juan Pérez", vaccine_name: "COVID-19", date: new Date(Date.now() + 86400000 * 2).toISOString() },
            { patient_name: "María Gómez", vaccine_name: "Influenza", date: new Date(Date.now() + 86400000 * 5).toISOString() },
        ];
        setUpcomingAppointments(data);
      } catch (err) {
        console.error("Error fetching upcoming vaccinations:", err);
        setError("No se pudieron cargar las próximas vacunaciones.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-500" />
        <p className="text-gray-600">Cargando eventos del calendario...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <p className="text-red-500">{error}</p>
        <Button onClick={onClose} className="mt-4">Cerrar</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <p className="text-muted-foreground">
        Resumen de las **próximas citas de vacunación** y eventos importantes.
      </p>
      
      {upcomingAppointments.length > 0 ? (
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {upcomingAppointments.map((app, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <LucideCalendar className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <div>
                <p className="font-semibold">{app.patient_name || 'Paciente Desconocido'}</p>
                <p className="text-sm text-gray-600">
                  Vacuna: {app.vaccine_name || 'N/A'} - Fecha: <span className="font-medium text-blue-600">{formatNominalDate(app.date)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-10 border-dashed border-2 rounded-lg text-center text-gray-500">
          <LucideCalendar className="h-8 w-8 mx-auto mb-3" />
          <p>No hay vacunaciones programadas próximamente.</p>
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <Button onClick={onClose} variant="outline">Cerrar Calendario</Button>
      </div>
    </div>
  );
}