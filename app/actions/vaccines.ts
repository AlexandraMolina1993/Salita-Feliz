'use server';

/**
 * Server Actions for Vaccine Management & Real-Time Stock View (v_vaccines_stock)
 * Salita Feliz - Enterprise Healthcare System
 */

import { supabase } from '@/lib/supabase';
import type { VaccineStockView, VaccineStockStatus } from '@/types/vaccine';
import type { Vaccine } from '@/lib/supabase';

export interface ExtendedVaccineItem extends Vaccine {
  physical_vials: number;
  physical_vials_for_repos: number;
  current_stock_fraction: number;
  total_ml: number;
  current_stock_ml: number;
  available_doses_for_clinic: number;
  stock_status: VaccineStockStatus;
  administration_route?: string;
  supplier?: string;
  net_content?: number;
}

export interface VaccineStatsResponse {
  total: number;
  lowStock: number;
  expiringSoon: number;
  expired: number;
  totalVials: number;
  totalMl: number;
  totalAvailableDoses: number;
  lowStockVaccines: ExtendedVaccineItem[];
  expiringSoonVaccines: ExtendedVaccineItem[];
  expiredVaccines: ExtendedVaccineItem[];
  allVaccines: ExtendedVaccineItem[];
}

export interface UpdateVaccineInput {
  name?: string;
  type?: string;
  manufacturer?: string;
  supplier?: string;
  administration_route?: string;
  net_content?: number | string;
  dose_amount?: number | string;
  lot_number?: string;
  expiration_date?: string | null;
  min_stock_level?: number | string;
  storage_temperature?: string;
  is_active?: boolean;
  stock_quantity?: number | string; // Cantidad deseada de viales físicos
}

/**
 * Helper to check if a date is within 30 days
 */
function isExpiringSoon(expirationDate?: string | null): boolean {
  if (!expirationDate) return false;
  const today = new Date();
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays > 0;
}

/**
 * Helper to check if a date is past today
 */
function isExpired(expirationDate?: string | null): boolean {
  if (!expirationDate) return false;
  const today = new Date();
  const expDate = new Date(expirationDate);
  return expDate < today;
}

/**
 * Server Action: Obtiene la lista completa de vacunas con su stock en tiempo real
 * exclusivamente desde la vista consolidada `v_vaccines_stock` y la enriquece con metadatos de `vaccines`.
 */
export async function getVaccinesStockAction(): Promise<ExtendedVaccineItem[]> {
  try {
    // 1. Consultar la vista de balance dinámico v_vaccines_stock
    const { data: vStock, error: stockErr } = await supabase
      .from('v_vaccines_stock')
      .select('*')
      .order('name', { ascending: true });

    if (stockErr) {
      console.error('[VaccineAction] Error al consultar v_vaccines_stock:', stockErr);
      throw new Error(`Error en vista v_vaccines_stock: ${stockErr.message}`);
    }

    // 2. Consultar metadatos adicionales (lote, precio, temperatura, proveedor, vía) desde tabla base vaccines
    const { data: rawVaccines } = await supabase
      .from('vaccines')
      .select('*');

    const rawMap = new Map<string, any>();
    if (rawVaccines) {
      rawVaccines.forEach((rv: any) => {
        rawMap.set(rv.id, rv);
      });
    }

    const list = (vStock || []).map((item: any) => {
      const raw = rawMap.get(item.vaccine_id) || {};
      const doseAmount = Number(item.dose_amount ?? raw.dose_amount) || 0.5;
      const netContent = Number(item.net_content ?? raw.net_content) || 5.0;
      const fraction = Number(item.current_stock_fraction ?? item.current_stock_vials ?? 0);
      const physicalVials = Number(
        item.physical_vials ?? 
        item.current_stock_vials ?? 
        item.physical_vials_for_repos ?? 
        Math.ceil(fraction)
      );
      const totalMl = Number(item.total_ml ?? item.current_stock_ml) || (fraction * netContent);
      const availableDoses = Number(item.available_doses_for_clinic) || Math.floor(totalMl / doseAmount);
      const minStock = Number(item.min_stock_level ?? raw.min_stock_level) || 10;
      
      let stockStatus: VaccineStockStatus = item.stock_status;
      if (!stockStatus) {
        if (fraction <= 0 || physicalVials <= 0) {
          stockStatus = 'OUT_OF_STOCK';
        } else if (physicalVials <= minStock) {
          stockStatus = 'CRITICAL_LOW';
        } else {
          stockStatus = 'OPTIMAL';
        }
      }

      return {
        id: item.vaccine_id,
        vaccine_id: item.vaccine_id,
        name: item.name,
        manufacturer: item.laboratory || raw.manufacturer || 'Laboratorio',
        laboratory: item.laboratory || raw.manufacturer || 'Laboratorio',
        supplier: raw.supplier || '',
        administration_route: raw.administration_route || 'Intramuscular (IM)',
        type: item.type || raw.type || 'General',
        dose_amount: doseAmount,
        net_content: netContent,
        min_stock_level: minStock,
        storage_temperature: raw.storage_temperature || '2°C a 8°C',
        lot_number: raw.lot_number || 'LOTE-GENERAL',
        price: raw.price ? Number(raw.price) : undefined,
        expiration_date: item.expiration_date || raw.expiration_date || null,
        is_active: item.is_active !== undefined ? Boolean(item.is_active) : (raw.is_active !== undefined ? Boolean(raw.is_active) : true),
        // Stock Ledger Mapping
        stock_quantity: physicalVials,
        physical_vials: physicalVials,
        physical_vials_for_repos: physicalVials,
        current_stock_vials: physicalVials,
        current_stock_fraction: fraction,
        total_ml: Number(totalMl.toFixed(2)),
        current_stock_ml: Number(totalMl.toFixed(2)),
        available_doses_for_clinic: availableDoses,
        stock_status: stockStatus,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
      } as ExtendedVaccineItem;
    });

    return list;
  } catch (error) {
    console.error('[VaccineAction] getVaccinesStockAction falló:', error);
    throw error;
  }
}

/**
 * Server Action: Obtiene las estadísticas agregadas de vacunas para el dashboard y los modales.
 */
export async function getVaccineStatsAction(): Promise<VaccineStatsResponse> {
  const vaccines = await getVaccinesStockAction();

  const lowStockVaccines = vaccines.filter(
    (v) => v.stock_status === 'CRITICAL_LOW' || v.physical_vials <= v.min_stock_level
  );
  const expiringSoonVaccines = vaccines.filter((v) => isExpiringSoon(v.expiration_date));
  const expiredVaccines = vaccines.filter((v) => isExpired(v.expiration_date));

  const totalVials = vaccines.reduce((acc, v) => acc + (v.physical_vials || 0), 0);
  const totalMl = Number(vaccines.reduce((acc, v) => acc + (v.total_ml || 0), 0).toFixed(2));
  const totalAvailableDoses = vaccines.reduce((acc, v) => acc + (v.available_doses_for_clinic || 0), 0);

  return {
    total: vaccines.length,
    lowStock: lowStockVaccines.length,
    expiringSoon: expiringSoonVaccines.length,
    expired: expiredVaccines.length,
    totalVials,
    totalMl,
    totalAvailableDoses,
    lowStockVaccines,
    expiringSoonVaccines,
    expiredVaccines,
    allVaccines: vaccines,
  };
}

/**
 * Server Action: Obtiene el detalle de una vacuna por ID consultando exclusivamente `v_vaccines_stock`
 * y enriqueciendo con metadatos técnicos de `vaccines`.
 */
export async function getVaccineStockByIdAction(vaccineId: string): Promise<ExtendedVaccineItem | null> {
  if (!vaccineId) return null;
  try {
    // 1. Consultar directamente la vista de balance v_vaccines_stock
    const { data: vStock, error: stockErr } = await supabase
      .from('v_vaccines_stock')
      .select('*')
      .eq('vaccine_id', vaccineId)
      .maybeSingle();

    if (stockErr) {
      console.warn('[VaccineAction] Error consultando v_vaccines_stock por ID:', stockErr);
    }

    // 2. Consultar metadatos base
    const { data: rawVaccine } = await supabase
      .from('vaccines')
      .select('*')
      .eq('id', vaccineId)
      .maybeSingle();

    if (!vStock && !rawVaccine) {
      // Fallback a buscar en la lista completa
      const all = await getVaccinesStockAction();
      return all.find((v) => v.id === vaccineId || v.vaccine_id === vaccineId) || null;
    }

    const raw = rawVaccine || {};
    const stock = vStock || {};

    const doseAmount = Number(stock.dose_amount ?? raw.dose_amount) || 0.5;
    const netContent = Number(stock.net_content ?? raw.net_content) || 5.0;
    const fraction = Number(stock.current_stock_fraction ?? stock.current_stock_vials ?? 0);
    const physicalVials = Number(
      stock.physical_vials ?? 
      stock.current_stock_vials ?? 
      stock.physical_vials_for_repos ?? 
      Math.ceil(fraction)
    );
    const totalMl = Number(stock.total_ml ?? stock.current_stock_ml) || (fraction * netContent);
    const availableDoses = Number(stock.available_doses_for_clinic) || Math.floor(totalMl / doseAmount);
    const minStock = Number(stock.min_stock_level ?? raw.min_stock_level) || 10;

    let stockStatus: VaccineStockStatus = stock.stock_status;
    if (!stockStatus) {
      if (fraction <= 0 || physicalVials <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (physicalVials <= minStock) {
        stockStatus = 'CRITICAL_LOW';
      } else {
        stockStatus = 'OPTIMAL';
      }
    }

    return {
      id: raw.id || stock.vaccine_id || vaccineId,
      vaccine_id: stock.vaccine_id || raw.id || vaccineId,
      name: stock.name || raw.name || 'Vacuna',
      manufacturer: stock.laboratory || raw.manufacturer || 'Laboratorio',
      laboratory: stock.laboratory || raw.manufacturer || 'Laboratorio',
      supplier: raw.supplier || '',
      administration_route: raw.administration_route || 'Intramuscular (IM)',
      type: stock.type || raw.type || 'General',
      dose_amount: doseAmount,
      net_content: netContent,
      min_stock_level: minStock,
      storage_temperature: raw.storage_temperature || '2°C a 8°C',
      lot_number: raw.lot_number || 'LOTE-GENERAL',
      price: raw.price ? Number(raw.price) : undefined,
      expiration_date: stock.expiration_date || raw.expiration_date || null,
      is_active: stock.is_active !== undefined ? Boolean(stock.is_active) : (raw.is_active !== undefined ? Boolean(raw.is_active) : true),
      stock_quantity: physicalVials,
      physical_vials: physicalVials,
      physical_vials_for_repos: physicalVials,
      current_stock_vials: physicalVials,
      current_stock_fraction: fraction,
      total_ml: Number(totalMl.toFixed(2)),
      current_stock_ml: Number(totalMl.toFixed(2)),
      available_doses_for_clinic: availableDoses,
      stock_status: stockStatus,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    } as ExtendedVaccineItem;
  } catch (error) {
    console.error('[VaccineAction] getVaccineStockByIdAction falló:', error);
    return null;
  }
}

/**
 * Server Action: Actualiza los metadatos de una vacuna y gestiona ajustes de inventario.
 * - Modifica únicamente metadatos en la tabla `vaccines` (nombre, lote, vencimiento, min_stock, etc.).
 * - Si se modifica la cantidad de viales, inserta un movimiento `ADJUSTMENT` en `stock_movements`.
 */
export async function updateVaccineAction(
  id: string,
  input: UpdateVaccineInput
): Promise<ExtendedVaccineItem | null> {
  if (!id) {
    throw new Error('ID de vacuna requerido para la actualización.');
  }

  try {
    // 1. Preparar campos de metadatos exclusivamente para la tabla `vaccines`
    const metadataUpdates: Record<string, any> = {};

    if (input.name !== undefined) metadataUpdates.name = input.name;
    if (input.type !== undefined) metadataUpdates.type = input.type;
    if (input.manufacturer !== undefined) metadataUpdates.manufacturer = input.manufacturer;
    if (input.supplier !== undefined) metadataUpdates.supplier = input.supplier;
    if (input.administration_route !== undefined) metadataUpdates.administration_route = input.administration_route;
    if (input.net_content !== undefined) metadataUpdates.net_content = Number(input.net_content) || 5.0;
    if (input.dose_amount !== undefined) metadataUpdates.dose_amount = Number(input.dose_amount) || 0.5;
    if (input.lot_number !== undefined) metadataUpdates.lot_number = input.lot_number;
    if (input.expiration_date !== undefined) metadataUpdates.expiration_date = input.expiration_date || null;
    if (input.min_stock_level !== undefined) metadataUpdates.min_stock_level = Number(input.min_stock_level);
    if (input.storage_temperature !== undefined) metadataUpdates.storage_temperature = input.storage_temperature;
    if (input.is_active !== undefined) metadataUpdates.is_active = input.is_active;

    // Actualizar metadatos en `vaccines`
    if (Object.keys(metadataUpdates).length > 0) {
      const { error: metaError } = await supabase
        .from('vaccines')
        .update(metadataUpdates)
        .eq('id', id);

      if (metaError) {
        console.error('[VaccineAction] Error al actualizar metadatos en vaccines:', metaError);
        throw new Error(`Error al actualizar vacuna: ${metaError.message}`);
      }
    }

    // 2. Gestión de Stock en Edición:
    // Si se especifica una nueva cantidad de viales, calcular la diferencia respecto al balance real
    if (input.stock_quantity !== undefined && input.stock_quantity !== null && input.stock_quantity !== '') {
      const targetVials = Number(input.stock_quantity);

      if (!isNaN(targetVials) && targetVials >= 0) {
        // Consultar stock actual de v_vaccines_stock
        const { data: currentStockData } = await supabase
          .from('v_vaccines_stock')
          .select('physical_vials, current_stock_fraction')
          .eq('vaccine_id', id)
          .maybeSingle();

        const currentVials = Number(
          currentStockData?.physical_vials ?? 
          currentStockData?.current_stock_fraction ?? 
          0
        );

        const diff = Number((targetVials - currentVials).toFixed(2));

        // Si hay una diferencia entre el stock deseado y el stock real actual, registrar ADJUSTMENT en el Ledger
        if (diff !== 0) {
          const { error: smError } = await supabase
            .from('stock_movements')
            .insert([
              {
                vaccine_id: id,
                type: 'ADJUSTMENT',
                quantity_vials: diff,
                description: `Ajuste manual de inventario en edición: de ${currentVials} a ${targetVials} viales (${diff > 0 ? `+${diff}` : diff} viales)`,
                metadata: {
                  source: 'edit_vaccine_form',
                  previous_vials: currentVials,
                  target_vials: targetVials,
                  adjustment_diff: diff,
                  adjusted_at: new Date().toISOString(),
                },
                created_at: new Date().toISOString(),
              },
            ]);

          if (smError) {
            console.error('[VaccineAction] Error al insertar movimiento de ajuste en stock_movements:', smError);
            throw new Error(`Error al registrar ajuste de inventario: ${smError.message}`);
          }
        }
      }
    }

    // 3. Retornar el estado actualizado consolidado desde la vista
    return await getVaccineStockByIdAction(id);
  } catch (error) {
    console.error('[VaccineAction] updateVaccineAction falló:', error);
    throw error;
  }
}

export interface VaccinationRhythmStats {
  totalDoses: number;
  topVaccineName: string;
  topVaccineCount: number;
  periodDays: number;
  breakdown: Array<{
    vaccineId: string;
    name: string;
    count: number;
  }>;
  completedAppointments: any[];
}

/**
 * Server Action: Calcula el ritmo de vacunación y la vacuna más solicitada en los últimos N días.
 * Consulta la tabla `appointments` con status = 'COMPLETED' (o 'completed') y une con `vaccines`
 * para obtener métricas operativas reales de la clínica.
 */
export async function getVaccinationRhythmAction(days: number = 30): Promise<VaccinationRhythmStats> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = cutoffDate.getTime();

    // Consultar turnos completados uniendo con vacunas y pacientes (usando full_name)
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        vaccines:vaccine_id (
          id,
          name,
          manufacturer
        ),
        patients:patient_id (
          id,
          full_name,
          dni
        )
      `)
      .is('deleted_at', null)
      .in('status', ['COMPLETED', 'completed']);

    if (error) {
      console.error('[VaccineAction] Error al consultar appointments para ritmo de vacunación:', error);
      throw new Error(`Error al consultar ritmo de vacunación: ${error.message}`);
    }

    // Filtrar por fecha en el rango de los últimos 'days' días
    const completedInPeriod = (appointments || []).filter((apt: any) => {
      const rawDate = apt.vaccination_date || apt.appointment_date || apt.updated_at || apt.created_at;
      if (!rawDate) return true;
      const aptTime = new Date(rawDate).getTime();
      if (isNaN(aptTime)) return true;
      return aptTime >= cutoffTimestamp;
    });

    const totalDoses = completedInPeriod.length;

    // Agrupar por vaccine_id para calcular la vacuna más solicitada
    const vaccineCountsMap = new Map<string, { name: string; count: number }>();

    for (const apt of completedInPeriod) {
      const vId = apt.vaccine_id || 'unassigned';
      const vName = apt.vaccines?.name || apt.vaccine_name || 'Vacuna no especificada';

      const current = vaccineCountsMap.get(vId) || { name: vName, count: 0 };
      current.count += 1;
      if (vName && vName !== 'Vacuna no especificada') {
        current.name = vName;
      }
      vaccineCountsMap.set(vId, current);
    }

    const breakdown = Array.from(vaccineCountsMap.entries()).map(([vaccineId, val]) => ({
      vaccineId,
      name: val.name,
      count: val.count,
    })).sort((a, b) => b.count - a.count);

    const topVaccine = breakdown[0];

    return {
      totalDoses,
      topVaccineName: topVaccine ? topVaccine.name : 'Sin aplicaciones recientes',
      topVaccineCount: topVaccine ? topVaccine.count : 0,
      periodDays: days,
      breakdown,
      completedAppointments: completedInPeriod,
    };
  } catch (error) {
    console.error('[VaccineAction] getVaccinationRhythmAction falló:', error);
    return {
      totalDoses: 0,
      topVaccineName: 'Sin datos',
      topVaccineCount: 0,
      periodDays: days,
      breakdown: [],
      completedAppointments: [],
    };
  }
}

