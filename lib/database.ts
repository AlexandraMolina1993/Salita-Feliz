// lib/database.ts

import type { Appointment } from "./types";
import { createClient } from "@supabase/supabase-js";
import {
  type Patient,
  type Nurse,
  type Vaccine,
  type VaccinationRecord,
  type Notification,
  type SystemConfig,
  Database,
  replenishment_schedules,
} from "./supabase";
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

// Crea y exporta el cliente de Supabase para que pueda ser usado en otros archivos.
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Funciones auxiliares (Helpers) ---
const isExpiringSoon = (expirationDate: string | null) => {
  if (!expirationDate) return false;
  const today = new Date();
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays > 0;
};

const isExpired = (expirationDate: string | null) => {
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
    // Conteo total de pacientes atendidos (únicos)
    const { data: totalPatientsData, error: totalPatientsError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('nurse_id', nurseId)
      .eq('status', 'completed');

    if (totalPatientsError) throw totalPatientsError;

    const uniquePatients = new Set(totalPatientsData.map(record => record.patient_id));
    const totalPatientsCount = uniquePatients.size;

    // Conteo de vacunas aplicadas
    const { count: totalVaccinesCount, error: totalVaccinesError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('nurse_id', nurseId)
      .eq('status', 'completed');

    if (totalVaccinesError) throw totalVaccinesError;

    // Conteo de vacunas del mes
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count: monthlyVaccinesCount, error: monthlyVaccinesError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('nurse_id', nurseId)
      .eq('status', 'completed')
      .gte('appointment_date', startOfMonth);

    if (monthlyVaccinesError) throw monthlyVaccinesError;

    // Conteo de vacunas de hoy
    const startOfDay = new Date().toISOString().split('T')[0];
    const { count: todayVaccinesCount, error: todayVaccinesError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('nurse_id', nurseId)
      .eq('status', 'completed')
      .eq('appointment_date', startOfDay);

    if (todayVaccinesError) throw todayVaccinesError;

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
    const { data, error } = await supabase
        .from('nurses') // Tu tabla de enfermeros
        .select('specialty, count') // Selecciona la especialidad y la cuenta
        .not('specialty', 'is', null) // Ignora las filas sin especialidad definida
        .not('specialty', 'eq', ''); // Ignora cadenas vacías si las hay
        
    if (error) {
        console.error("Error al obtener el conteo de especialidades:", error);
        throw new Error(error.message);
    }
    
    // Supabase (PostgREST) usa la sintaxis .select('col, count') para GROUP BY simple
    // El resultado debería ser un array de objetos con 'specialty' y 'count'.
    return data as SpecialtyCount[];
}

// --- CRUD de Vacunas ---
export async function getVaccines(): Promise<Vaccine[]> {
  const { data, error } = await supabase
    .from("vaccines")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getVaccineById(id: string): Promise<Vaccine | null> {
  const { data, error } = await supabase.from("vaccines").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
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
 * 1. Consulta el stock actual.
 * 2. Actualiza el stock, lote y vencimiento en una sola operación.
 * * @param vaccineId El ID de la vacuna.
 * @param stock_quantity La cantidad de unidades a agregar (debe ser > 0).
 * @param lot_number (Opcional) El nuevo número de lote si aplica.
 * @param expiration_date (Opcional) La nueva fecha de vencimiento si aplica.
 * @returns La vacuna actualizada.
 */
export async function addStockToVaccine(
    vaccineId: string, // Renombré 'Id' a 'vaccineId' para mayor claridad.
    stock_quantity: number, 
    lot_number?: string, 
    expiration_date?: Date | string | null
): Promise<Vaccine> {
    
    if (stock_quantity <= 0) {
        throw new Error("La cantidad de stock a agregar debe ser mayor a cero.");
    }
    
    // 1. Obtener el registro actual para conocer el stock_quantity
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
    const newStock = currentVaccine.stock_quantity + stock_quantity;

    // 2. Preparar los datos de actualización
    const updatedData: Partial<Vaccine> = { 
        stock_quantity: newStock 
    };

    // Agregar lote y fecha de vencimiento solo si se proporcionaron
    if (lot_number) {
        updatedData.lot_number = lot_number;
    }
    // Convertir Date a string si es necesario, y asegurarse de que null sea manejado
    if (expiration_date !== undefined) {
        updatedData.expiration_date = expiration_date;
    }

    // 3. Ejecutar la actualización en Supabase
    const { data, error: updateError } = await supabase
        .from("vaccines")
        .update(updatedData)
        .eq("id", vaccineId)
        .select() // Pide el registro actualizado completo
        .single();

    if (updateError) {
        console.error("Error al actualizar el stock en Supabase:", updateError);
        throw updateError;
    }

    // 4. Registrar la transacción de inventario (opcional pero recomendado)
    // NOTA: Si tienes una tabla 'inventory_transactions', aquí deberías insertarle un registro.
    
    console.log(`Stock de la vacuna ${vaccineId} actualizado. Nuevo stock: ${newStock}`);

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
  const { error } = await supabase.from("appointments").delete().eq("id", id);

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
    .order("appointment_date", { ascending: false });

  if (error) {
    console.error("Error fetching appointments:", error);
    return [];
  }
  return data as Appointment[];
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
// 1. Función para LEER la configuración por categoría
export async function getConfigByCategory(category: string): Promise<SystemConfig[]> {
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .eq('category', category); // Filtra por la columna 'category'

  if (error) {
    console.error("Error al obtener configuración por categoría:", error);
    throw error;
  }
  
  // Si no hay datos, devuelve un array vacío
  return (data as SystemConfig[]) || []; 
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

  const today = new Date().toISOString().split("T")[0];

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


