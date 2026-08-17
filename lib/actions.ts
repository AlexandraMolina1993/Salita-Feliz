// lib/actions.ts

import { revalidatePath } from 'next/cache'; // <-- ¡Aquí es donde debe ir!
import { supabase } from './database'; 

// Importa los tipos necesarios de database.ts
import { 
    type IncidentReport, 
    type ReplenishmentSchedule, 
    type IncidentType 
} from './database'; 

/**
 * Función de Inserción para reportar un incidente (Server Action).
 */
export async function reportVaccineIncidentAction(
    vaccineId: string,
    type: IncidentType,
    description: string,
    quantityAffected: number | null = null,
    reportedBy: string = 'unknown_user' 
): Promise<IncidentReport> {
    
    const newIncident = {
        vaccine_id: vaccineId,
        incident_type: type,
        description: description,
        quantity_affected: quantityAffected,
        reported_by: reportedBy,
        status: 'new',
    };

    const { data, error } = await supabase
        .from('incident_reports')
        .insert(newIncident)
        .select()
        .single();

    if (error) {
        console.error("Supabase Error al reportar incidente:", error.message);
        throw new Error(`Error al registrar el incidente: ${error.message}`);
    }
    
    // ✅ REVALIDACIÓN: Aquí funciona porque este archivo está aislado de Client Components.
    revalidatePath(`/dashboard/vacunas/${vaccineId}`); 
    
    return data as IncidentReport;
}

/**
 * Programa una nueva orden de reposición (Server Action).
 */
export async function scheduleReplenishmentAction( 
    vaccineId: string,
    scheduledDate: string,
    quantityToOrder: number,
    notes: string | null = null
): Promise<ReplenishmentSchedule> { 
    
    const { data, error } = await supabase 
        .from('replenishment_schedules')
        .insert({
            vaccine_id: vaccineId,
            scheduled_date: scheduledDate,
            quantity_to_order: quantityToOrder,
            status: 'pending', 
            notes: notes,
        })
        .select()
        .single();

    if (error) {
        const errorMessage = error.message || JSON.stringify(error);
        console.error('Error al programar reposición:', error);
        throw new Error(`Fallo en Supabase: ${errorMessage}`);
    }

    // ✅ REVALIDACIÓN: Aquí funciona.
    revalidatePath(`/dashboard/vacunas/${vaccineId}`); 

    return data as ReplenishmentSchedule;
}
