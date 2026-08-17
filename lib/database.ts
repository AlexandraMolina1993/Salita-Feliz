// lib/database.ts
import { revalidatePath } from 'next/cache';
import {
  supabase,
  type Appointment,
  type Patient,
  type Nurse,
  type VaccinationRecord,
  type Notification,
  type SystemConfig,
  Database,
  replenishment_schedules,
} from "./supabase";
import { getArgentinaTodayDateString } from "./dateUtils";

export { supabase, type Appointment };

export async function getUpcomingVaccinations() {
  return getAppointments();
}

export type VaccineType = {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
};
// --- Tipos de Datos para Incidente y Reposición ---
export type IncidentType = 
    | 'Daño Físico / Descarte' 
    | 'Falla de Frío' 
    | 'Error de Administración' 
    | 'Error de Stock' 
    | 'Otro';

export type IncidentReport = {
    id: string;
    vaccine_id: string;
    incident_type: IncidentType;
    description: string;
    quantity_affected: number | null;
    reported_by: string; 
    reported_at: string;
    status: 'new' | 'in_review' | 'closed'; // Asegúrate que el estado coincida con tu columna 'status'
    created_at: string;
};

export type ReplenishmentSchedule = {
    id: string;
    vaccine_id: string;
    scheduled_date: string;
    quantity_to_order: number;
    status: 'pending' | 'ordered' | 'received' | 'cancelled'; // Asegúrate que el estado coincida con tu columna 'status'
    notes: string | null;
    created_at: string;
};
// --- Tipos de Datos Unificados ---

export type HistoryItemType = 'replenishment' | 'incident';

// Tipo para unificar el historial (Reposición + Incidente)
export type UnifiedHistoryItem = {
    id: string;
    date: string;
    type: 'replenishment' | 'incident';
    description: string;
    quantity: number | null;
    status: string;
};
export type Vaccine = {
    id: string;
    name: string;
    type: string;
    manufacturer: string | null;
    storage_temperature: string | null;
    expiration_date: string | null;
    stock_quantity: number;
    min_stock_level: number;
    lot_number: string | null;
    // Agrega más campos de tu tabla 'vaccines'
};
// Tipo de la tabla 'incidents'
export type Incident = {
    id: string;
    vaccine_id: string;
    incident_type: IncidentType; // Usamos el tipo definido
    description: string;
    quantity_affected: number | null;
    reported_by_user_id: string;
    created_at: string; // Timestamp de la DB
    status: 'registrado' | 'investigacion' | 'resuelto'; // Ejemplo de estados
};

// --- Funciones auxiliares (Helpers) ---
const isExpiringSoon = (expirationDate: string | null | undefined) => {
  if (!expirationDate) return false;
  const today = new Date();
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays > 0;
};

const isExpired = (expirationDate: string | null | undefined) => {
  if (!expirationDate) return false;
  const today = new Date();
  const expDate = new Date(expirationDate);
  return expDate < today;
};

const calculateAge = (birthDate: string | null) => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// --- CRUD de Pacientes ---
export async function getPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
}

export async function getPatientByDni(dni: string): Promise<Patient | null> {
  const { data, error } = await supabase.from("patients").select("*").eq("dni", dni).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  return data;
}

export async function createPatient(patient: Omit<Patient, "id" | "created_at" | "updated_at">): Promise<Patient> {
  const { data, error } = await supabase.from("patients").insert([patient]).select().single();

  if (error) throw error;
  return data;
}

export async function updatePatient(id: string, patient: Partial<Patient>): Promise<Patient> {
  const { data, error } = await supabase.from("patients").update(patient).eq("id", id).select().single();

  if (error) throw error;
  return data;
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase.from("patients").update({ is_active: false }).eq("id", id);

  if (error) throw error;
}

export async function activatePatient(id: string): Promise<void> {
  const { error } = await supabase.from("patients").update({ is_active: true }).eq("id", id);

  if (error) throw error;
}

// Función para obtener la distribución de pacientes por género
export async function getPatientGenderDistribution() {
  const { data, error } = await supabase
    .from('patients')
    .select('gender');

  if (error) {
    console.error("Error fetching patient gender distribution:", error);
    return [];
  }

  const distributionData = data.reduce((acc: { [key: string]: number }, patient) => {
    const gender = patient.gender || 'Desconocido';
    acc[gender] = (acc[gender] || 0) + 1;
    return acc;
  }, {});

  const formattedData = Object.keys(distributionData).map(key => ({
    name: key === 'female' ? 'Femenino' : key === 'male' ? 'Masculino' : key,
    value: distributionData[key]
  }));

  return formattedData;
}

// Función para obtener la distribución de pacientes por grupo de edad
export async function getPatientAgeDistribution() {
  const { data, error } = await supabase
    .from('patients')
    .select('birth_date');

  if (error) {
    console.error("Error fetching patient age distribution:", error);
    return [];
  }

  const ageGroups = {
    '0-17': 0,
    '18-64': 0,
    '65+': 0
  };

  data.forEach(patient => {
    const age = calculateAge(patient.birth_date);
    if (age >= 0 && age <= 17) {
      ageGroups['0-17']++;
    } else if (age >= 18 && age <= 64) {
      ageGroups['18-64']++;
    } else if (age >= 65) {
      ageGroups['65+']++;
    }
  });

  const formattedData = Object.keys(ageGroups).map(key => ({
    name: key,
    value: ageGroups[key]
  }));

  return formattedData;
}

// --- CRUD de Enfermeros ---
export async function getNurses(): Promise<Nurse[]> {
  const { data, error } = await supabase
    .from("nurses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getNurseById(id: string): Promise<Nurse | null> {
  const { data, error } = await supabase
    .from("nurses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createNurse(
  nurse: Omit<Nurse, "id" | "created_at" | "updated_at">
): Promise<Nurse> {
  const { data, error } = await supabase
    .from("nurses")
    .insert([nurse])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateNurse(id: string, nurse: Partial<Nurse>): Promise<Nurse> {
  const { data, error } = await supabase
    .from("nurses")
    .update(nurse)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNurse(id: string): Promise<void> {
  const { error } = await supabase.from("nurses").update({ is_active: false }).eq("id", id);

  if (error) throw error;
}

// --- Funciones de datos de enfermeros con Supabase (CORREGIDAS Y OPTIMIZADAS) ---

/**
 * Obtiene el número de vacunas aplicadas por cada enfermero.
 * @returns {Promise<Array<{ name: string, value: number }>>}
 */
export async function getVaccinesByNurse() {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, nurses!inner(full_name)')
    .eq('status', 'completed');

  if (error) {
    console.error("Error fetching vaccines by nurse:", error);
    return [];
  }

  const stats = data.reduce((acc, record) => {
    const nurseName = record.nurses?.full_name || 'Enfermero Desconocido';
    acc[nurseName] = (acc[nurseName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.keys(stats).map(name => ({
    name,
    value: stats[name]
  }));
}

/**
 * Obtiene un ranking de enfermeros por la cantidad de vacunas aplicadas.
 * @returns {Promise<Array<{ name: string, vaccines: number }>>}
 */
export async function getNurseRankings() {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, nurses!inner(full_name)')
    .eq('status', 'completed');

  if (error) {
    console.error("Error fetching nurse rankings:", error);
    return [];
  }

  const rankings = data.reduce((acc, record) => {
    const nurseName = record.nurses?.full_name || 'Enfermero Desconocido';
    acc[nurseName] = (acc[nurseName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.keys(rankings)
    .map(name => ({
      name,
      vaccines: rankings[name]
    }))
    .sort((a, b) => b.vaccines - a.vaccines);
}

/**
 * Obtiene la distribución de pacientes por cada enfermero.
 * @returns {Promise<Array<{ name: string, patients: number }>>}>
 */
export async function getPatientDistributionByNurse() {
  const { data, error } = await supabase
    .from('appointments')
    .select('patient_id, nurses!inner(full_name)')
    .eq('status', 'completed');

  if (error) {
    console.error("Error fetching patient distribution by nurse:", error);
    return [];
  }

  const patientCounts = data.reduce((acc, record) => {
    const nurseName = record.nurses?.full_name || 'Enfermero Desconocido';
    const patientId = record.patient_id;

    if (!acc[nurseName]) {
      acc[nurseName] = new Set();
    }
    acc[nurseName].add(patientId);

    return acc;
  }, {} as Record<string, Set<string>>);

  return Object.keys(patientCounts).map(name => ({
    name,
    patients: patientCounts[name].size
  }));
}

// --- Función para obtener estadísticas de un solo enfermero ---
export async function getNurseStats(nurse_id: string) {
  try {
    // Obtener el estado de actividad del enfermero
    const { data: nurseData, error: nurseError } = await supabase
      .from('nurses')
      .select('is_active')
      .eq('id', nurse_id)
      .single();

    if (nurseError) {
      console.error("Supabase Error fetching nurse status:", nurseError);
      throw nurseError; // Lanza el error para que sea capturado por el catch
    }

    // Contar las vacunas aplicadas en el mes actual
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count: monthlyCount, error: monthlyError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('nurse_id', nurse_id)
      .eq('status', 'completed')
      .gte('appointment_date', startOfMonth);

    if (monthlyError) {
      console.error("Supabase Error fetching monthly vaccines:", monthlyError);
      throw monthlyError;
    }

    // Contar el total de vacunas aplicadas
    const { count: totalCount, error: totalError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('nurse_id', nurse_id)
      .eq('status', 'completed');

    if (totalError) {
      console.error("Supabase Error fetching total vaccines:", totalError);
      throw totalError;
    }

    return {
      status: nurseData?.is_active ? 'Activo' : 'Inactivo',
      monthlyVaccines: monthlyCount || 0,
      totalVaccines: totalCount || 0,
    };

  } catch (error) {
    console.error("Error fetching nurse stats:", error);
    // Devuelve un objeto con valores por defecto en caso de error
    return {
      status: 'Inactivo', // O un estado de error, según prefieras
      monthlyVaccines: 0,
      totalVaccines: 0,
    };
  }
}
// --- Función para obtener turnos asignados a un enfermero ---
export async function getAssignedAppointments(nurseId: string) {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      *,
      patients:patient_id(*),
      vaccines:vaccine_id(*)
      `
    )
    .eq("nurse_id", nurseId)
    .is("deleted_at", null)
    .order("appointment_date", { ascending: false });

  if (error) {
    console.error("Error fetching assigned appointments:", error);
    throw error;
  }
  return data || [];
}
// --- Función para obtener el historial de pacientes atendidos por un enfermero ---
export async function getNursePatientHistory(nurseId: string) {
  const { data, error } = await supabase
    .from("appointments") // <-- CAMBIO AQUÍ: Ahora consulta la tabla de 'appointments'
    .select(
      `
      id,
      appointment_date,
      patients:patient_id(*),
      vaccines:vaccine_id(*)
      `
    )
    .eq("nurse_id", nurseId)
    .eq("status", "completed") // <-- CAMBIO AQUÍ: Filtra solo por turnos completados
    .order("appointment_date", { ascending: false });

  if (error) {
    console.error("Error fetching nurse patient history:", error);
    throw error;
  }

  // Mapeamos los datos para que coincidan con la interfaz de "VaccinationRecord"
  // Esto es para que no tengas que cambiar tu componente en el frontend
  const formattedData = data.map(record => ({
    id: record.id,
    vaccination_date: record.appointment_date, // Usamos la fecha del turno como fecha de vacunación
    patients: record.patients,
    vaccines: record.vaccines,
    // Puedes agregar más campos si es necesario
  }));

  return formattedData || [];
}
// --- Función para obtener el reporte de rendimiento de un enfermero ---
export async function getNursePerformanceReport(nurseId: string) {
  try {
    // 1. Conteo total de pacientes atendidos (únicos)
    const { data: totalPatientsData, error: totalPatientsError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('nurse_id', nurseId)
      .eq('status', 'completed');

    if (totalPatientsError) throw totalPatientsError;

    const uniquePatients = new Set(totalPatientsData.map(record => record.patient_id));
    const totalPatientsCount = uniquePatients.size;

    // 2. Conteo total de vacunas aplicadas
    const { count: totalVaccinesCount, error: totalVaccinesError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('nurse_id', nurseId)
      .eq('status', 'completed');

    if (totalVaccinesError) throw totalVaccinesError;

    // 3. Conteo de vacunas del mes actual
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count: monthlyVaccinesCount, error: monthlyVaccinesError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('nurse_id', nurseId)
      .eq('status', 'completed')
      .gte('appointment_date', startOfMonth);

    if (monthlyVaccinesError) throw monthlyVaccinesError;

    // 4. Conteo de vacunas de hoy (Normalizado para UTC-3 Argentina)
    const todayArgentina = getArgentinaTodayDateString();

    const { count: todayVaccinesCount, error: todayVaccinesError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('nurse_id', nurseId)
      .eq('status', 'completed')
      .eq('appointment_date', todayArgentina);

    if (todayVaccinesError) throw todayVaccinesError;

    // Devolvemos solo los datos numéricos limpios
    return {
      totalPatients: totalPatientsCount,
      totalVaccines: totalVaccinesCount,
      monthlyVaccines: monthlyVaccinesCount,
      todayVaccines: todayVaccinesCount,
    };

  } catch (error) {
    console.error("Error fetching nurse performance report:", error);
    return {
      totalPatients: 0,
      totalVaccines: 0,
      monthlyVaccines: 0,
      todayVaccines: 0,
    };
  }
}
/**
 * Extrae la ruta del archivo dentro del bucket 'avatars' de una URL pública de Supabase.
 * La URL tiene el formato: .../storage/v1/object/public/avatars/filePath
 * @param publicUrl La URL completa del archivo.
 * @returns La ruta del archivo (ej. 'nombre-aleatorio.png') o null si no se puede parsear.
 */
function getFilePathFromUrl(publicUrl: string): string | null {
    const bucketName = 'avatars';
    // La ruta que precede al nombre del archivo siempre debe ser: '/public/avatars/'
    const pathSegment = `/public/${bucketName}/`;
    
    // 1. Intentamos dividir por el segmento completo '/public/avatars/'
    const parts = publicUrl.split(pathSegment);
    
    if (parts.length > 1) {
        // parts[1] contiene la ruta relativa (ej: 'imagen-123.jpg')
        return parts[1]; 
    }
    
    // 2. Si falló el primer intento (por si la URL no es 'public'), intentamos el segmento simple
    const simpleParts = publicUrl.split(`/${bucketName}/`);
    if (simpleParts.length > 1) {
        return simpleParts.pop() || null;
    }
    
    return null;
}

/**
 * Sube una nueva imagen y, si existe una previa, la elimina del bucket 'avatars'.
 * Genera un nombre de archivo único para la nueva imagen.
 * * @param file El nuevo objeto File a subir.
 * @param oldImageUrl La URL pública de la imagen anterior (si existe), para ser eliminada.
 * @returns La URL pública de la imagen recién subida.
 */
export async function replaceNurseImage(
    file: File, 
    oldImageUrl: string | null | undefined
): Promise<string> {
    const bucketName = 'avatars';
    const fileExt = file.name.split('.').pop();
    
    // 1. Declaración de la variable para el nuevo URL aquí (CORRECCIÓN CLAVE)
    let newPublicUrl: string; // La inicializamos

    // Generamos un nombre de archivo ÚNICO para la nueva imagen
    const newFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const newFilePath = newFileName;

    // A. Subir el nuevo archivo
    const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(newFilePath, file);

    if (uploadError) {
        // ... manejo de error ...
        throw new Error("Error al subir la imagen a Supabase Storage: " + uploadError.message);
    }

    // B. Obtener la URL pública del nuevo archivo
    const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(newFilePath);

    if (!publicUrlData.publicUrl) {
        // ... manejo de error ...
        throw new Error("No se pudo obtener la URL pública después de la subida.");
    }
    
    // 2. Asignamos el valor a la variable declarada
    newPublicUrl = publicUrlData.publicUrl; 

    // C. Borrar la imagen antigua (¡El resto de la lógica de borrado con logs va aquí!)
   if (oldImageUrl) {
        const oldFilePath = getFilePathFromUrl(oldImageUrl);
        
        if (oldFilePath) {
            // 🚨 LOGS CRÍTICOS: REVISA ESTO EN LA CONSOLA DEL NAVEGADOR
            console.log("LOG BORRADO: URL Antigua:", oldImageUrl);
            console.log("LOG BORRADO: Path extraído para eliminar:", oldFilePath);
            
            const { error: deleteError } = await supabase.storage
                .from(bucketName)
                .remove([oldFilePath]); // Borrado

            
            if (deleteError) {
                // Si ves este error, el 'oldFilePath' NO es la ruta correcta O RLS está mal.
                console.error("ADVERTENCIA CRÍTICA: FALLÓ EL BORRADO de la imagen antigua. Error:", deleteError);
            } else {
                console.log("BORRADO EXITOSO: Imagen antigua eliminada:", oldFilePath);
            }
        } else {
             console.warn("ADVERTENCIA CRÍTICA: No se pudo extraer la ruta del archivo antiguo de la URL:", oldImageUrl);
        }
    }

    // D. Retorno (Ahora newPublicUrl está definida y es accesible)
    return newPublicUrl; // <--- Línea donde estaba el error de referencia
}
/**
 * Actualiza el campo image_url de un enfermero en la tabla 'nurses'.
 * * @param nurseId El ID del enfermero a actualizar.
 * @param newImageUrl La nueva URL de la imagen.
 */
export async function updateNurseImageUrl(nurseId: string, newImageUrl: string) {
    const { error } = await supabase
        .from("nurses")
        .update({ image_url: newImageUrl })
        .eq("id", nurseId);

    if (error) {
        throw new Error("Error al actualizar la URL del enfermero: " + error.message);
    }
    return { success: true };
}
export interface SpecialtyCount {
    specialty: string;
    count: number;
}

/**
 * Obtiene el conteo de enfermeros agrupados por especialidad.
 * @returns Un array con objetos { specialty, count }
 */
export async function getSpecialtyCounts(): Promise<SpecialtyCount[]> {
    // Traemos las especialidades de los enfermeros activos
    const { data, error } = await supabase
        .from('nurses')
        .select('specialty')
        .not('specialty', 'is', null)
        .not('specialty', 'eq', '');
        
    if (error) {
        console.error("Error al obtener el conteo de especialidades:", error);
        throw new Error(error.message);
    }
    
    // Hacemos la agrupación y el conteo limpio en JavaScript para evitar el Error 400
    const counts = data.reduce((acc, record) => {
        const spec = record.specialty;
        acc[spec] = (acc[spec] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    return Object.keys(counts).map(specialty => ({
        specialty,
        count: counts[specialty]
    }));
}

// --- CRUD de Vacunas ---
export async function getVaccines(): Promise<Vaccine[]> {
  const { data: stockData, error: stockErr } = await supabase
    .from("v_vaccines_stock")
    .select("*")
    .order("name", { ascending: true });

  if (!stockErr && stockData && stockData.length > 0) {
    return stockData.map((v: any) => {
      const physicalVials = Number(v.physical_vials ?? v.current_stock_vials ?? v.physical_vials_for_repos ?? Math.ceil(Number(v.current_stock_fraction) || 0));
      const totalMl = Number(v.total_ml ?? v.current_stock_ml) || (physicalVials * (Number(v.dose_amount) || 0.5));

      return {
        id: v.vaccine_id,
        vaccine_id: v.vaccine_id,
        name: v.name,
        type: v.type || "General",
        manufacturer: v.laboratory || "Laboratorio",
        laboratory: v.laboratory || "Laboratorio",
        dose_amount: Number(v.dose_amount) || 0.5,
        net_content: Number(v.net_content) || 5.0,
        lot_number: v.lot_number || "LOTE-GENERAL",
        expiration_date: v.expiration_date,
        stock_quantity: physicalVials,
        current_stock_fraction: Number(v.current_stock_fraction ?? physicalVials),
        current_stock_vials: physicalVials,
        physical_vials: physicalVials,
        available_doses_for_clinic: Number(v.available_doses_for_clinic) || Math.floor(totalMl / (Number(v.dose_amount) || 0.5)),
        total_ml: totalMl,
        current_stock_ml: totalMl,
        min_stock_level: Number(v.min_stock_level) || 10,
        storage_temperature: v.storage_temperature || "2°C a 8°C",
        is_active: v.is_active ?? true,
        stock_status: v.stock_status || (physicalVials <= 0 ? 'OUT_OF_STOCK' : physicalVials <= (Number(v.min_stock_level) || 10) ? 'CRITICAL_LOW' : 'OPTIMAL'),
      } as any;
    });
  }

  const { data, error } = await supabase
    .from("vaccines")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Consulta la vista maestra `v_vaccines_stock` con los 3 filtros clínicos obligatorios:
 * 1. Fecha de vencimiento hoy o posterior (.gte('expiration_date', today))
 * 2. Vacuna no dada de baja (.eq('is_active', true))
 * 3. Stock real para pacientes (.gt('available_doses_for_clinic', 0))
 */
export async function getClinicallyAvailableVaccines() {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("v_vaccines_stock")
    .select("*")
    .gte("expiration_date", today)
    .eq("is_active", true)
    .gt("available_doses_for_clinic", 0)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error al obtener vacunas clínicamente viables:", error);
    throw error;
  }
  return data || [];
}

export async function getVaccineById(id: string): Promise<Vaccine | null> {
  const { data: vStock } = await supabase
    .from("v_vaccines_stock")
    .select("*")
    .eq("vaccine_id", id)
    .maybeSingle();

  const { data: rawVaccine } = await supabase
    .from("vaccines")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!vStock && !rawVaccine) {
    return null;
  }

  const base = rawVaccine || {};
  const stock = vStock || {};

  const physicalVials = Number(stock.physical_vials ?? stock.current_stock_vials ?? stock.physical_vials_for_repos ?? Math.ceil(Number(stock.current_stock_fraction) || 0) ?? base.stock_quantity ?? 0);
  const totalMl = Number(stock.total_ml ?? stock.current_stock_ml ?? (physicalVials * (Number(stock.dose_amount ?? base.dose_amount) || 0.5)));

  return {
    ...base,
    id: stock.vaccine_id || base.id || id,
    vaccine_id: stock.vaccine_id || base.id || id,
    name: stock.name || base.name,
    manufacturer: stock.laboratory || base.manufacturer,
    laboratory: stock.laboratory || base.manufacturer,
    type: stock.type || base.type,
    dose_amount: Number(stock.dose_amount ?? base.dose_amount) || 0.5,
    net_content: Number(stock.net_content ?? base.net_content) || 5.0,
    min_stock_level: Number(stock.min_stock_level ?? base.min_stock_level) || 10,
    expiration_date: stock.expiration_date || base.expiration_date,
    is_active: stock.is_active ?? base.is_active ?? true,
    stock_quantity: physicalVials,
    current_stock_vials: physicalVials,
    physical_vials: physicalVials,
    current_stock_fraction: Number(stock.current_stock_fraction ?? physicalVials),
    total_ml: totalMl,
    current_stock_ml: totalMl,
    available_doses_for_clinic: Number(stock.available_doses_for_clinic ?? Math.floor(totalMl / (Number(stock.dose_amount ?? base.dose_amount) || 0.5))),
    stock_status: stock.stock_status || (physicalVials <= 0 ? 'OUT_OF_STOCK' : physicalVials <= (Number(stock.min_stock_level ?? base.min_stock_level) || 10) ? 'CRITICAL_LOW' : 'OPTIMAL'),
  } as any;
}

export async function createVaccine(vaccine: Omit<Vaccine, "id" | "created_at" | "updated_at">): Promise<Vaccine> {
  const { data, error } = await supabase.from("vaccines").insert([vaccine]).select().single();

  if (error) throw error;
  return data;
}

export async function updateVaccine(id: string, vaccine: Partial<Vaccine>): Promise<Vaccine> {
  const { data, error } = await supabase.from("vaccines").update(vaccine).eq("id", id).select().single();

  if (error) throw error;
  return data;
}

/**
 * Agrega unidades de stock a una vacuna existente y actualiza los datos.
 * * NOTA: Esta función realiza dos pasos:
 * 1. Inserta un movimiento en stock_movements (Ledger inmutable).
 * 2. Actualiza el stock, lote y vencimiento en la tabla base vaccines.
 * * @param vaccineId El ID de la vacuna.
 * @param stock_quantity La cantidad de unidades a agregar (debe ser > 0).
 * @param lot_number (Opcional) El nuevo número de lote si aplica.
 * @param expiration_date (Opcional) La nueva fecha de vencimiento si aplica.
 * @returns La vacuna actualizada.
 */
export async function addStockToVaccine(
    vaccineId: string,
    stock_quantity: number, 
    lot_number?: string, 
    expiration_date?: Date | string | null
): Promise<Vaccine> {
    
    if (stock_quantity <= 0) {
        throw new Error("La cantidad de stock a agregar debe ser mayor a cero.");
    }
    
    // 1. Registrar movimiento inmutable en stock_movements
    await supabase.from("stock_movements").insert({
      vaccine_id: vaccineId,
      type: "REPLENISHMENT",
      quantity_vials: stock_quantity,
      description: `Ingreso de stock: +${stock_quantity} viales`,
      metadata: {
        lot_number: lot_number || null,
        expiration_date: expiration_date || null,
        source: "add_stock_dialog"
      }
    });

    // 2. Obtener el registro actual para conocer el stock_quantity
    const { data: currentVaccine, error: fetchError } = await supabase
        .from("vaccines")
        .select("stock_quantity")
        .eq("id", vaccineId)
        .single();

    if (fetchError) {
        throw fetchError;
    }
    if (!currentVaccine) {
        throw new Error(`Vacuna con ID ${vaccineId} no encontrada.`);
    }

    // Calcular el nuevo stock
    const newStock = Number(currentVaccine.stock_quantity || 0) + stock_quantity;

    // 3. Preparar los datos de actualización
    const updatedData: Partial<Vaccine> = { 
        stock_quantity: newStock 
    };

    if (lot_number) {
        updatedData.lot_number = lot_number;
    }
    if (expiration_date !== undefined) {
        updatedData.expiration_date = expiration_date;
    }

    // 4. Ejecutar la actualización en Supabase
    const { data, error: updateError } = await supabase
        .from("vaccines")
        .update(updatedData)
        .eq("id", vaccineId)
        .select()
        .single();

    if (updateError) {
        console.error("Error al actualizar el stock en Supabase:", updateError);
        throw updateError;
    }

    return data;
}

export async function getVaccinationStatsByMonth(year: number) {
  const { data, error } = await supabase
    .from("appointments")
    .select("appointment_date")
    .eq("status", "completed")
    .gte("appointment_date", `${year}-01-01`) // <-- Usa guiones
    .lt("appointment_date", `${year + 1}-01-01`); // <-- Usa guiones

  if (error) {
    console.error("Error fetching vaccination stats:", error);
    return [];
  }

  const monthlyData = data.reduce((acc: { [key: number]: number }, appointment) => {
    // Ya no es necesario normalizar la fecha, ya que viene en un formato estándar
    const month = new Date(appointment.appointment_date).getMonth();
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const formattedData = Object.keys(monthlyData).map(monthIndex => ({
    month: parseInt(monthIndex),
    count: monthlyData[parseInt(monthIndex)]
  }));

  return formattedData;
}
export async function getVaccinationDistribution() {
  const { data, error } = await supabase
    .from("appointments")
    .select("vaccine_id, vaccines!inner(name)")
    .eq("status", "completed");

  if (error) {
    console.error("Error fetching vaccine distribution:", error);
    return [];
  }

  const distributionData = data.reduce((acc: { [key: string]: number }, appointment) => {
    const vaccineName = appointment.vaccines?.name || "Desconocida";
    acc[vaccineName] = (acc[vaccineName] || 0) + 1;
    return acc;
  }, {});

  const formattedData = Object.keys(distributionData).map(name => ({
    name: name,
    value: distributionData[name]
  }));

  return formattedData;
}
export async function getVaccinationTrend(periodInMonths: number) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - periodInMonths);

  const { data, error } = await supabase
    .from("appointments")
    .select("appointment_date")
    .eq("status", "completed")
    .gte("appointment_date", startDate.toISOString().split('T')[0]);

  if (error) {
    console.error("Error fetching vaccination trend:", error);
    return [];
  }

  const trendData = data.reduce((acc: { [key: string]: number }, appointment) => {
    const date = new Date(appointment.appointment_date);
    const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
    acc[monthYear] = (acc[monthYear] || 0) + 1;
    return acc;
  }, {});

  const formattedData = Object.keys(trendData).map(monthYear => ({
    name: monthYear,
    total: trendData[monthYear]
  }));

  return formattedData;
}
/**
 * Programa una nueva orden de reposición para una vacuna.
 */
// 1. Función para programar una reposición: ¡RENOMBRADA!
export async function scheduleReplenishment( // <-- CAMBIO CLAVE: Renombrada
    vaccineId: string,
    scheduledDate: string,
    quantityToOrder: number,
    notes: string | null = null
): Promise<ReplenishmentSchedule> { // <-- Usar el nombre de la interfaz/tipo
    const { data, error } = await supabase 
        .from('replenishment_schedules')
        .insert({
            vaccine_id: vaccineId,
            scheduled_date: scheduledDate,
            quantity_to_order: quantityToOrder,
            status: 'pending', // Usar minúsculas 'pending' si tu enum/check en DB es sensible a mayúsculas
            notes: notes,
        })
        .select()
        .single();

    if (error) {
        const errorMessage = error.message || JSON.stringify(error);
        console.error('Error al programar reposición:', error);
        throw new Error(`Fallo en Supabase: ${errorMessage}`);
    }

    // Asegúrate de que el retorno coincida con la interfaz ReplenishmentSchedule
    return data as ReplenishmentSchedule;
}

// 2. Función para obtener las reposiciones programadas (Mantenemos el nombre original)
export async function getReplenishmentSchedulesByVaccineId(vaccineId: string): Promise<ReplenishmentSchedule[]> {
    const { data, error } = await supabase
        .from('replenishment_schedules')
        .select('*')
        .eq('vaccine_id', vaccineId)
        .order('scheduled_date', { ascending: true }); 

    if (error) {
        console.error("Error fetching replenishment schedules:", error);
        throw new Error(`Fallo al cargar las programaciones de reposición: ${error.message}`);
    }

    // Asegúrate de que el retorno coincida con la interfaz ReplenishmentSchedule[]
    return (data || []) as ReplenishmentSchedule[];
}
/**
 * Obtiene todos los incidentes reportados para una vacuna específica.
 * @param vaccineId El ID de la vacuna.
 * @returns Una lista de incidentes reportados.
 */
export async function getVaccineIncidentsByVaccineId(vaccineId: string): Promise<IncidentReport[]> {
    const { data, error } = await supabase
        .from('incident_reports') // ⬅️ Nombre de tu tabla en Supabase
        .select('*')
        .eq('vaccine_id', vaccineId)
        .order('created_at', { ascending: false }); // Ordenar por fecha, más reciente primero

    if (error) {
        console.error("Error fetching vaccine incidents:", error);
        throw new Error("No se pudo cargar la lista de incidentes.");
    }

    // El tipo de retorno ya está definido en la firma de la función (Promise<IncidentReport[]>)
    return (data || []) as IncidentReport[]; 
}
// Función de Inserción
export async function reportVaccineIncident(
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
        // created_at NO se envía, Supabase lo gestiona automáticamente (NOT NULL, now())
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
   
    return data as IncidentReport;
}
/**
 * Obtiene, combina y ordena cronológicamente el historial de reposiciones e incidentes de una vacuna.
 * @param vaccineId El ID de la vacuna.
 * @returns Una lista unificada de historial ordenada por fecha descendente.
 */
export async function getVaccineUnifiedHistory(vaccineId: string): Promise<UnifiedHistoryItem[]> {
    // 1. Cargar datos de forma concurrente
    const [replenishments, incidents] = await Promise.all([
        getReplenishmentSchedulesByVaccineId(vaccineId),
        getVaccineIncidentsByVaccineId(vaccineId), 
    ]);

    // 2. Mapear Reposiciones a UnifiedHistoryItem (COMPLETADO)
    const mappedReplenishments: UnifiedHistoryItem[] = (replenishments || []).map(r => ({
        id: r.id,
        date: r.scheduled_date, // Usamos scheduled_date como la fecha principal
        type: 'replenishment',
        description: `Reposición programada: ${r.notes ? r.notes : 'Sin nota'}`,
        quantity: r.quantity_to_order,
        status: r.status,
    }));

    // 3. Mapear Incidentes a UnifiedHistoryItem (COMPLETADO)
    const mappedIncidents: UnifiedHistoryItem[] = (incidents || []).map(i => ({
        id: i.id,
        date: i.created_at, // Usamos created_at como la fecha principal
        type: 'incident',
        description: `Incidente (${i.incident_type}): ${i.description}`,
        quantity: i.quantity_affected ? -i.quantity_affected : null, // Cantidad afectada, generalmente negativa
        status: i.status,
    }));

    // 4. Unificar y Ordenar
    const unifiedHistory: UnifiedHistoryItem[] = [
        ...mappedReplenishments,
        ...mappedIncidents,
    ];

    // Ordenar por fecha de forma descendente (más reciente primero)
    unifiedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return unifiedHistory;
}
/**
 * Obtiene las estadísticas de uso de una vacuna específica.
 * @param vaccineId El ID de la vacuna
 */
export async function getVaccineStatsById(vaccineId: string) {
    try {
        // Conteo de dosis aplicadas en el mes actual
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count: monthlyApplied, error: monthlyError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact' })
            .eq('vaccine_id', vaccineId)
            .eq('status', 'completed')
            .gte('appointment_date', startOfMonth);

        if (monthlyError) throw monthlyError;

        // Conteo del total de dosis aplicadas históricamente
        const { count: totalApplied, error: totalError } = await supabase
            .from('appointments')
            .select('*', { count: 'exact' })
            .eq('vaccine_id', vaccineId)
            .eq('status', 'completed');

        if (totalError) throw totalError;

        return {
            monthly_applied: monthlyApplied || 0,
            total_applied: totalApplied || 0,
        };

    } catch (error) {
        console.error("Error fetching vaccine stats:", error);
        return {
            monthly_applied: 0,
            total_applied: 0,
        };
    }
    
}
export async function createVaccineType(data: Omit<VaccineType, 'id'>) {
    const { data: newType, error } = await supabase
        .from('vaccine_types')
        .insert([data])
        .select()
        .single();
    
    if (error) {
        console.error("Error al crear tipo de vacuna:", error);
        throw new Error(error.message);
    }
    return newType as VaccineType;
}

/**
 * Obtiene todos los tipos de vacunas.
 */
export async function getVaccineTypes(): Promise<VaccineType[]> {
    const { data, error } = await supabase
        .from('vaccine_types')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("Error al obtener tipos de vacunas:", error);
        throw new Error(error.message);
    }
    return data as VaccineType[];
}

/**
 * Actualiza un tipo de vacuna existente.
 */
export async function updateVaccineType(id: number, data: Partial<VaccineType>) {
    const { data: updatedType, error } = await supabase
        .from('vaccine_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error("Error al actualizar tipo de vacuna:", error);
        throw new Error(error.message);
    }
    return updatedType as VaccineType;
}
// --- CRUD de Turnos ---
export async function getAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      patients:patient_id(*),
      vaccines:vaccine_id(*),
      nurses:nurse_id(*)
    `)
    .is("deleted_at", null)
    .order("appointment_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      patients:patient_id(*),
      vaccines:vaccine_id(*),
      nurses:nurse_id(*)
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  return data;
}

export async function createAppointment(
  // La función ahora recibe los campos por separado o un objeto que los contenga
  appointment: Omit<Appointment, "id" | "created_at" | "updated_at">,
): Promise<Appointment> {

  // Asumimos que el objeto appointment ya tiene los campos
  // appointment_date y appointment_time con sus valores correctos.
  // Tu base de datos los guardará tal cual.

  const { data, error } = await supabase
    .from("appointments")
    .insert([appointment]) // El objeto appointment ya debería tener la fecha y hora correctas
    .select(`
      *,
      patients:patient_id(*),
      vaccines:vaccine_id(*),
      nurses:nurse_id(*)
    `)
    .single();

  if (error) {
    console.error("Error al insertar el turno en Supabase:", error);
    throw error;
  }
  return data;
}


export async function updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .update(appointment)
    .eq("id", id)
    .select(`
      *,
      patients:patient_id(*),
      vaccines:vaccine_id(*),
      nurses:nurse_id(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateAppointmentStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);

  if (error) throw error;
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
// **Función para obtener los turnos de un paciente con los detalles de la vacuna**
export async function getAppointmentsByPatientId(patientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      *,
      vacuna:vaccine_id(name, manufacturer)
      `
    )
    .eq("patient_id", patientId)
    .is("deleted_at", null)
    .order("appointment_date", { ascending: false });

  if (error) {
    console.error("Error fetching appointments:", error);
    return [];
  }
  return data as Appointment[];
}
// ... tus otros imports y la definición de la interfaz Appointment ...

// Agrega esta función aquí:
export async function completeAppointment(turno: Appointment) {
  if (turno.status === 'completed') return { success: true };

  const { data: vacuna, error: fetchError } = await supabase
    .from('vaccines')
    .select('stock_quantity, net_content')
    .eq('id', turno.vaccine_id)
    .single();

  if (fetchError || !vacuna) throw new Error("No se pudo obtener la vacuna");

  // AHORA BIEN:
  // dosisAplicada es el valor que el usuario ingresó (ej: 0.5)
  // volumenTotalEnvase es el valor que tienes en 'net_content' (ej: 2.0)
  const dosisAplicada = Number(turno.dose_to_apply || 0); 
  const volumenTotalEnvase = Number(vacuna.net_content || 0);
  
  if (volumenTotalEnvase <= 0) throw new Error("La configuración de la vacuna es inválida");

  // CALCULO CORRECTO:
  // Si aplicas 0.5 de un total de 2.0, el resultado es 0.25
  const fraccionDeEnvaseConsumida = dosisAplicada / volumenTotalEnvase;

  // Restamos esa fracción al stock total
  const nuevoStock = Number(vacuna.stock_quantity) - fraccionDeEnvaseConsumida;

  // Actualizamos el stock en la base de datos
  const { error: updateStockError } = await supabase
    .from('vaccines')
    .update({ stock_quantity: nuevoStock.toFixed(4) }) // .toFixed(4) mantiene la precisión decimal
    .eq('id', turno.vaccine_id);

  if (updateStockError) {
    // Si esto falla, idealmente deberías revertir el estado del turno
    // o lanzar un alerta crítica al usuario.
    throw new Error("Stock no actualizado: " + updateStockError.message);
  }
  
  return { success: true };
}
// --- CRUD de Registros de Vacunación ---
export async function getVaccinationRecords(): Promise<VaccinationRecord[]> {
  const { data, error } = await supabase
    .from("vaccination_records")
    .select(`
      *,
      patients:patient_id(*),
      vaccines:vaccine_id(*),
      nurses:nurse_id(*)
    `)
    .order("vaccination_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getVaccinationRecordsByPatient(patientId: string): Promise<VaccinationRecord[]> {
  const { data, error } = await supabase
    .from("vaccination_records")
    .select(`
      *,
      vaccines:vaccine_id(*),
      nurses:nurse_id(*)
    `)
    .eq("patient_id", patientId)
    .order("vaccination_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createVaccinationRecord(
  record: Omit<VaccinationRecord, "id" | "created_at" | "updated_at">,
): Promise<VaccinationRecord> {
  const { data, error } = await supabase
    .from("vaccination_records")
    .insert([record])
    .select(`
      *,
      patients:patient_id(*),
      vaccines:vaccine_id(*),
      nurses:nurse_id(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

// lib/database.ts

/**
 * Elimina una orden de reposición programada por su ID de la tabla correspondiente
 */
export async function deleteReplenishmentSchedule(scheduleId: string): Promise<void> {
  const { data, error } = await supabase
    .from('replenishment_schedules') // 💡 Verifica si tu tabla en Supabase se llama exactamente así
    .delete()
    .eq('id', scheduleId);

  if (error) {
    console.error("Error al eliminar la reposición en Supabase:", error);
    throw new Error(error.message);
  }
}

// En lib/database.ts
export const updateVaccineStock = async (vaccineId: string, amount: number) => {
  // 1. Obtener stock actual
  const { data: vaccine, error: fetchError } = await supabase
    .from('vaccines')
    .select('stock_quantity')
    .eq('id', vaccineId)
    .single();

  if (fetchError) throw fetchError;

  // 2. Calcular nuevo stock (amount será negativo, ej: -0.5)
  const currentStock = vaccine.stock_quantity || 0;
  
  // Usamos Math.max(0, ...) para evitar que el stock sea negativo
  const newStock = Math.max(0, currentStock + amount);

  // 3. Actualizar
  const { data, error: updateError } = await supabase
    .from('vaccines')
    .update({ stock_quantity: newStock })
    .eq('id', vaccineId)
    .select(); // Agregamos .select() para que devuelva el dato actualizado
    
  if (updateError) throw updateError;
  return data;
};
/**
 * Elimina un incidente reportado por su ID de la tabla correspondiente
 */
export async function deleteVaccineIncident(incidentId: string): Promise<void> {
  const { data, error } = await supabase
    .from('incident_reports') // 💡 Verifica si tu tabla en Supabase se llama exactamente así
    .delete()
    .eq('id', incidentId);

  if (error) {
    console.error("Error al eliminar el incidente en Supabase:", error);
    throw new Error(error.message);
  }
}


// --- CRUD de Notificaciones ---
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createNotification(
  notification: Omit<Notification, "id" | "created_at" | "updated_at">,
): Promise<Notification> {
  const { data, error } = await supabase.from("notifications").insert([notification]).select().single();

  if (error) throw error;
  return data;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);

  if (error) throw error;
}
// --- Tipos de Datos para la tabla 'notifications' ---
// Omitimos id y created_at ya que Supabase los gestiona
export type NotificationInsert = {
    patient_id: string;
    type: 'EMAIL' | 'WHATSAPP'; // El tipo de notificación
    title: string;          // Usaremos esto para el Asunto/Subject
    message: string;        // Usaremos esto para los detalles del turno + mensaje
    sent_at: string;        // La fecha y hora de envío (usaremos la fecha actual)
    status: 'SENT' | 'FAILED';   // El estado del envío
};

// --- Función para Registrar la Notificación en la Base de Datos ---
export async function logNotification(
    log: NotificationInsert
): Promise<NotificationInsert> {
    
    // 🚨 USO DE LA TABLA CORRECTA: "notifications"
    const { data, error } = await supabase 
        .from('notifications') 
        .insert(log)
        .select('id, patient_id, type, title, message, sent_at, status, created_at')
        .single();

    if (error) {
        console.error("Supabase Error al registrar la notificación:", error.message);
        throw new Error(`Fallo en el registro de log: ${error.message}`);
    }
    
    // Devolvemos el registro insertado (o al menos un objeto que lo represente)
    // El "as any" ayuda a evitar errores de tipado por los campos auto-generados (id, created_at)
    return data as any; 
}
// Tipo para la información que necesitamos del paciente
// Incluye solo los campos necesarios para la notificación de whatsapp
export type PatientContactInfo = { 
    id: string; 
    phone: string | null; 
    full_name: string | null; 
    // Puedes agregar 'email' si lo necesitas en el futuro
};


// --- Función para Obtener Contactos de Múltiples Pacientes ---
export async function getPatientsContactInfo(patientIds: string[]): Promise<PatientContactInfo[]> {
    
    // Consulta la tabla 'patients' buscando los IDs proporcionados
    const { data, error } = await supabase
        .from('patients')    
        // 🚨 REVISA: Asegúrate que la columna del nombre completo sea 'full_name'
        .select('id, phone, full_name') 
        .in('id', patientIds); // Usa el operador 'in' para buscar múltiples IDs

    if (error) {
        console.error("Supabase Error al buscar contactos de pacientes:", error.message);
        return [];
    }
    
    // Devuelve el arreglo de objetos de contacto
    // La aserción 'as PatientContactInfo[]' tipa la respuesta correctamente
    return data as PatientContactInfo[]; 
}

// --- CRUD de Configuración del Sistema ---
// lib/database.ts
// 1. Función adaptada para la nueva estructura de registro único de system_config
export async function getConfigByCategory(category: string): Promise<any[]> {
  // Como tu tabla no tiene columnas 'category', traemos directamente la fila de configuración
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .limit(1); // Trae el único registro de configuración que existe

  console.log("🔍 [Debug system_config]:", { data, error, solicitado: category });

  if (error) {
    console.warn("⚠️ Error controlado al obtener system_config:", error.message);
    return []; 
  }

  // Si no hay filas creadas en la tabla todavía, evitamos que explote enviando un array vacío
  if (!data || data.length === 0) {
    return [];
  }

  // Extraemos la fila única
  const configRow = data[0];
  
  const isDark = configRow.modo_oscuro_activo === true || String(configRow.modo_oscuro_activo) === 'true';

  const mappedConfig = [
    // --- Categoría General ---
    { category: 'General', key: 'nombre_del_centro', value: configRow.nombre_del_centro },
    { category: 'General', key: 'idioma_sistema', value: configRow.idioma_sistema },
    { category: 'General', key: 'modo_oscuro_activo', value: isDark ? 'dark' : 'light' },
    
    // --- Categoría Theme ---
    { category: 'theme', key: 'modo_oscuro_activo', value: isDark ? 'dark' : 'light' },
    
    // --- Categoría Notificaciones (MAPEADO EXACTO CON TU COMPONENTE) ---
    { category: 'Notificaciones', key: 'email_notifications_active', value: 'true' },
    { category: 'Notificaciones', key: 'email_smtp_server', value: 'smtp.gmail.com' },
    { category: 'Notificaciones', key: 'email_smtp_user', value: configRow.email_contacto || 'salitafeliz8@gmail.com' },
    { category: 'Notificaciones', key: 'email_smtp_password', value: '••••••••••••' },
    
    { category: 'Notificaciones', key: 'sms_notifications_active', value: 'false' },
    { category: 'Notificaciones', key: 'sms_provider', value: 'twilio' }, // En minúscula para que coincida con el SelectItem
    { category: 'Notificaciones', key: 'sms_api_key', value: '' },
    
    { category: 'Notificaciones', key: 'appointment_reminders_active', value: 'true' },
    { category: 'Notificaciones', key: 'reminder_time_hours', value: '24' } // En string numérico como tu inicializador
  ];

  // Filtro inteligente para las solicitudes del sistema
  const requestedCategory = category.toLowerCase();
  
  if (requestedCategory === 'theme') {
    const themeItem = mappedConfig.find(item => item.category === 'theme');
    return themeItem ? [themeItem] : [];
  }

  return mappedConfig.filter(item => item.category.toLowerCase() === requestedCategory);
}
// 2. Función para GUARDAR (actualizar/insertar) múltiples configuraciones
// Recibe un array de objetos con { key, value }
export async function updateConfig(updates: Array<{ key: string; value: string; category: string }>): Promise<void> {
    const promises = updates.map(update => {
        // Al usar upsert, necesitamos todas las columnas requeridas (NOT NULL)
        return supabase
            .from('system_config')
            .upsert(
                { 
                    key: update.key, 
                    value: update.value,
                    category: update.category, // <-- 🚨 ASEGÚRATE DE INCLUIR LA CATEGORÍA
                    // Opcional: created_at, updated_at, si son requeridas por tu tabla.
                }, 
                { onConflict: 'key' } // <-- Y ESTO COINCIDE CON LA CLAVE ÚNICA/PRIMARIA
            );
    });

    const results = await Promise.all(promises);

    for (const result of results) {
        if (result.error) {
            // 🚨 Mejor manejo de error para ver el detalle
            console.error("Error al actualizar una configuración:", result.error.message || result.error);
            // Lanza un nuevo error con el mensaje de Supabase
            throw new Error(result.error.message || "Error desconocido al guardar configuración."); 
        }
    }
}

// --- Funciones de Estadísticas del Dashboard ---
export async function getDashboardStats() {
  const [patients, appointments, nurses, vaccines] = await Promise.all([
    getPatients(),
    getAppointments(),
    getNurses(),
    getVaccines(),
  ]);

  const today = getArgentinaTodayDateString();

  return {
    totalPatients: patients.length,
    totalNurses: nurses.length,
    totalVaccines: vaccines.length,
    totalAppointments: appointments.length,
    todayAppointments: appointments.filter((a) => a.appointment_date === today).length,
    completedAppointments: appointments.filter((a) => a.status === "completed").length,
    pendingAppointments: appointments.filter((a) => a.status === "scheduled").length,
    activeNurses: nurses.filter((n) => n.is_active).length,
  };
}

export async function getVaccineStats() {
  const { data: vStock, error } = await supabase
    .from("v_vaccines_stock")
    .select("*");

  if (!error && vStock && vStock.length > 0) {
    const mappedStock = vStock.map((v: any) => {
      const physicalVials = Number(v.physical_vials ?? v.current_stock_vials ?? v.physical_vials_for_repos ?? Math.ceil(Number(v.current_stock_fraction) || 0));
      const totalMl = Number(v.total_ml ?? v.current_stock_ml) || (physicalVials * (Number(v.dose_amount) || 0.5));

      return {
        id: v.vaccine_id,
        vaccine_id: v.vaccine_id,
        name: v.name,
        manufacturer: v.laboratory || "Laboratorio",
        laboratory: v.laboratory || "Laboratorio",
        type: v.type || "General",
        dose_amount: Number(v.dose_amount) || 0.5,
        net_content: Number(v.net_content) || 5.0,
        stock_quantity: physicalVials,
        physical_vials: physicalVials,
        current_stock_vials: physicalVials,
        current_stock_fraction: Number(v.current_stock_fraction ?? physicalVials),
        total_ml: totalMl,
        current_stock_ml: totalMl,
        available_doses_for_clinic: Number(v.available_doses_for_clinic) || Math.floor(totalMl / (Number(v.dose_amount) || 0.5)),
        min_stock_level: Number(v.min_stock_level) || 10,
        expiration_date: v.expiration_date,
        is_active: v.is_active ?? true,
        stock_status: v.stock_status || (physicalVials <= 0 ? 'OUT_OF_STOCK' : physicalVials <= (Number(v.min_stock_level) || 10) ? 'CRITICAL_LOW' : 'OPTIMAL'),
      } as any;
    });

    const lowStockVaccines = mappedStock.filter(
      (v: any) => v.stock_quantity <= v.min_stock_level
    );
    const expiringSoonVaccines = mappedStock.filter((v: any) => isExpiringSoon(v.expiration_date));
    const expiredVaccines = mappedStock.filter((v: any) => isExpired(v.expiration_date));

    return {
      total: mappedStock.length,
      lowStock: lowStockVaccines.length,
      expiringSoon: expiringSoonVaccines.length,
      expired: expiredVaccines.length,
      lowStockVaccines,
      expiringSoonVaccines,
      expiredVaccines,
      allVaccines: mappedStock,
    };
  }

  const vaccines = await getVaccines();

  const lowStockVaccines = vaccines.filter((v) => v.stock_quantity <= v.min_stock_level);
  const expiringSoonVaccines = vaccines.filter((v) => isExpiringSoon(v.expiration_date));
  const expiredVaccines = vaccines.filter((v) => isExpired(v.expiration_date));

  return {
    total: vaccines.length,
    lowStock: lowStockVaccines.length,
    expiringSoon: expiringSoonVaccines.length,
    expired: expiredVaccines.length,
    lowStockVaccines,
    expiringSoonVaccines,
    expiredVaccines,
    allVaccines: vaccines,
  };
}

export async function getPatientStats() {
  const patients = await getPatients();

  const activePatients = patients.filter((p) => p.is_active);
  const inactivePatients = patients.filter((p) => !p.is_active);
  const minors = patients.filter((p) => calculateAge(p.birth_date) < 18);
  const adults = patients.filter((p) => {
    const age = calculateAge(p.birth_date);
    return age >= 18 && age < 65;
  });
  const seniors = patients.filter((p) => calculateAge(p.birth_date) >= 65);

  return {
    total: patients.length,
    active: activePatients.length,
    inactive: inactivePatients.length,
    minors: minors.length,
    adults: adults.length,
    seniors: seniors.length,
    activePatients,
    inactivePatients,
    minorPatients: minors,
    adultPatients: adults,
    seniorPatients: seniors,
    allPatients: patients,
  };
}

// --- Renombrada para evitar conflicto
export async function getGeneralNurseStats() {
  const nurses = await getNurses();

  const activeNurses = nurses.filter((n) => n.is_active);
  const inactiveNurses = nurses.filter((n) => !n.is_active);
  const specialtyList = [...new Set(nurses.map((n) => n.specialty).filter(Boolean))];

  return {
    total: nurses.length,
    active: activeNurses.length,
    inactive: inactiveNurses.length,
    specialties: specialtyList.length,
    activeNurses,
    inactiveNurses,
    allNurses: nurses,
    specialtyList,
  };
}

export async function getAppointmentStats() {
  const appointments = await getAppointments();

  const scheduledAppointments = appointments.filter((a) => a.status === "scheduled");
  const completedAppointments = appointments.filter((a) => a.status === "completed");
  const cancelledAppointments = appointments.filter((a) => a.status === "cancelled");

  return {
    total: appointments.length,
    scheduled: scheduledAppointments.length,
    completed: completedAppointments.length,
    cancelled: cancelledAppointments.length,
    scheduledAppointments,
    completedAppointments,
    cancelledAppointments,
    allAppointments: appointments,
  };
}


