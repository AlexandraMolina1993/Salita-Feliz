'use server';

/**
 * Server Actions for Vaccine Management & Real-Time Stock View (v_vaccines_stock)
 * Salita Feliz - Enterprise Healthcare System
 */

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import type { VaccineStockView, VaccineStockStatus } from '@/types/vaccine';
import type { Vaccine } from '@/lib/supabase';

export interface ExtendedVaccineItem extends Vaccine {
  id: string;
  vaccine_id?: string;
  laboratory?: string;
  physical_vials: number;
  physical_vials_for_repos: number;
  current_stock_fraction: number;
  current_stock_vials: number;
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

import { formatDateToISO, isVaccineExpiringSoon as isExpiringSoon, isVaccineExpired as isExpired } from '@/lib/dateUtils';

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
      console.warn('[VaccineAction] Error al consultar v_vaccines_stock, usando fallback de tabla vaccines:', stockErr.message);
    }

    // 2. Consultar metadatos adicionales desde tabla base vaccines
    const { data: rawVaccines } = await supabase
      .from('vaccines')
      .select('*')
      .order('name', { ascending: true });

    const rawMap = new Map<string, any>();
    if (rawVaccines) {
      rawVaccines.forEach((rv: any) => {
        rawMap.set(rv.id, rv);
      });
    }

    // Si v_vaccines_stock tiene datos, usarlos mapeados con raw
    if (vStock && vStock.length > 0) {
      return vStock.map((item: any) => {
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
    }

    // Fallback si la vista no tiene registros pero la tabla vaccines sí
    if (rawVaccines && rawVaccines.length > 0) {
      return rawVaccines.map((raw: any) => {
        const doseAmount = Number(raw.dose_amount) || 0.5;
        const netContent = Number(raw.net_content) || 5.0;
        const physicalVials = Number(raw.stock_quantity) || 0;
        const totalMl = physicalVials * netContent;
        const availableDoses = Math.floor(totalMl / doseAmount);
        const minStock = Number(raw.min_stock_level) || 10;
        const stockStatus: VaccineStockStatus = physicalVials <= 0 ? 'OUT_OF_STOCK' : physicalVials <= minStock ? 'CRITICAL_LOW' : 'OPTIMAL';

        return {
          id: raw.id,
          vaccine_id: raw.id,
          name: raw.name,
          manufacturer: raw.manufacturer || 'Laboratorio',
          laboratory: raw.manufacturer || 'Laboratorio',
          supplier: raw.supplier || '',
          administration_route: raw.administration_route || 'Intramuscular (IM)',
          type: raw.type || 'General',
          dose_amount: doseAmount,
          net_content: netContent,
          min_stock_level: minStock,
          storage_temperature: raw.storage_temperature || '2°C a 8°C',
          lot_number: raw.lot_number || 'LOTE-GENERAL',
          price: raw.price ? Number(raw.price) : undefined,
          expiration_date: raw.expiration_date || null,
          is_active: raw.is_active !== undefined ? Boolean(raw.is_active) : true,
          stock_quantity: physicalVials,
          physical_vials: physicalVials,
          physical_vials_for_repos: physicalVials,
          current_stock_vials: physicalVials,
          current_stock_fraction: physicalVials,
          total_ml: Number(totalMl.toFixed(2)),
          current_stock_ml: Number(totalMl.toFixed(2)),
          available_doses_for_clinic: availableDoses,
          stock_status: stockStatus,
          created_at: raw.created_at,
          updated_at: raw.updated_at,
        } as ExtendedVaccineItem;
      });
    }

    return [];
  } catch (error) {
    console.error('[VaccineAction] getVaccinesStockAction falló:', error);
    return [];
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

export interface AddStockInput {
  vaccineId: string;
  quantityVials: number;
  lotNumber?: string | null;
  expirationDate?: string | Date | null;
  notes?: string | null;
}

/**
 * Server Action 1: Añadir Stock (Viales Físicos)
 * - Inserta un movimiento 'REPLENISHMENT' (con dirección IN) en la tabla inmutable `stock_movements`.
 * - Sincroniza metadatos de lote y fecha de vencimiento en `vaccines`.
 * - Invalida la caché de Next.js para que la vista `v_vaccines_stock` se actualice de inmediato en UI.
 */
export async function addVaccineStockAction(input: AddStockInput): Promise<ExtendedVaccineItem | null> {
  const { vaccineId, quantityVials, lotNumber, expirationDate, notes } = input;
  
  if (!vaccineId) {
    throw new Error('ID de vacuna requerido para añadir stock.');
  }

  const vials = Number(quantityVials);
  if (isNaN(vials) || vials <= 0) {
    throw new Error('La cantidad de viales a ingresar debe ser mayor a 0.');
  }

  try {
    const formattedExpDate = expirationDate ? (formatDateToISO(expirationDate) || null) : null;

    // 1. Insertar movimiento inmutable en stock_movements (tipo REPLENISHMENT, dirección IN)
    const { data: movement, error: movError } = await supabase
      .from('stock_movements')
      .insert([
        {
          vaccine_id: vaccineId,
          type: 'REPLENISHMENT',
          quantity_vials: Math.abs(vials),
          description: `Ingreso de stock (IN): +${vials} viales${lotNumber ? ` | Lote: ${lotNumber}` : ''}`,
          metadata: {
            direction: 'IN',
            action: 'ADD_STOCK',
            quantity_vials: vials,
            lot_number: lotNumber || null,
            expiration_date: formattedExpDate,
            notes: notes || null,
            source: 'quick_action_add_stock',
            added_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (movError) {
      console.error('[VaccineAction] Error al registrar movimiento en stock_movements:', movError);
      throw new Error(`Error al registrar en stock_movements: ${movError.message}`);
    }

    // 2. Si se especificó un nuevo lote o fecha de vencimiento, actualizar metadatos en la tabla `vaccines`
    const metaUpdates: Record<string, any> = {};
    if (lotNumber && lotNumber.trim() !== '') {
      metaUpdates.lot_number = lotNumber.trim();
    }
    if (formattedExpDate) {
      metaUpdates.expiration_date = formattedExpDate;
    }

    if (Object.keys(metaUpdates).length > 0) {
      const { error: metaErr } = await supabase
        .from('vaccines')
        .update(metaUpdates)
        .eq('id', vaccineId);

      if (metaErr) {
        console.warn('[VaccineAction] Advertencia al actualizar metadatos de lote/vencimiento en vaccines:', metaErr);
      }
    }

    // 3. Invalidar la caché de la vista de stock en Next.js
    revalidatePath('/dashboard/vacunas');
    revalidatePath(`/dashboard/vacunas/${vaccineId}`);
    revalidatePath('/dashboard');

    // 4. Retornar el registro consolidado actualizado desde v_vaccines_stock
    return await getVaccineStockByIdAction(vaccineId);
  } catch (error) {
    console.error('[VaccineAction] addVaccineStockAction falló:', error);
    throw error;
  }
}

export interface ScheduleReplenishmentInput {
  vaccineId: string;
  scheduledDate: string; // 'YYYY-MM-DD'
  quantityToOrder: number;
  notes?: string | null;
}

/**
 * Server Action 2: Programar Reposición
 * - Inserta el pedido programado en la tabla `replenishment_schedules` con estado 'pending'.
 * - Invalida la caché del panel de vacunas.
 */
export async function scheduleReplenishmentAction(input: ScheduleReplenishmentInput) {
  const { vaccineId, scheduledDate, quantityToOrder, notes } = input;

  if (!vaccineId || !scheduledDate || !quantityToOrder) {
    throw new Error('Vacuna, fecha estimada y cantidad son requeridas.');
  }

  try {
    const { data, error } = await supabase
      .from('replenishment_schedules')
      .insert([
        {
          vaccine_id: vaccineId,
          scheduled_date: scheduledDate,
          quantity_to_order: Number(quantityToOrder),
          status: 'pending',
          notes: notes || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[VaccineAction] Error al programar reposición en replenishment_schedules:', error);
      throw new Error(`Error en replenishment_schedules: ${error.message}`);
    }

    revalidatePath('/dashboard/vacunas');
    revalidatePath(`/dashboard/vacunas/${vaccineId}`);

    return data;
  } catch (error) {
    console.error('[VaccineAction] scheduleReplenishmentAction falló:', error);
    throw error;
  }
}

export interface ReportIncidentInput {
  vaccineId: string;
  type: 'damage' | 'cold_chain_failure' | 'stock_error' | 'other';
  description: string;
  quantityAffected?: number | null;
  reportedBy?: string;
  deductFromStock?: boolean;
}

/**
 * Server Action 3: Reportar un Incidente
 * - Guarda el reporte formal en `incident_reports`.
 * - Si afecta físicamente al inventario (deductFromStock = true y quantityAffected > 0), 
 *   inserta un movimiento de merma/pérdida negativo en `stock_movements`.
 * - Invalida la caché para refrescar el balance dinámico.
 */
export async function reportVaccineIncidentAction(input: ReportIncidentInput) {
  const { vaccineId, type, description, quantityAffected, reportedBy, deductFromStock = true } = input;

  if (!vaccineId || !type || !description) {
    throw new Error('Vacuna, tipo de incidente y descripción son requeridos.');
  }

  const affected = Number(quantityAffected || 0);

  try {
    const reporterName = (reportedBy && reportedBy.trim() && reportedBy !== 'current_user_id' && reportedBy !== 'unknown_user') 
      ? reportedBy.trim() 
      : 'Administrador';

    // 1. Insertar el reporte en `incident_reports`
    const { data: incident, error: incError } = await supabase
      .from('incident_reports')
      .insert([
        {
          vaccine_id: vaccineId,
          incident_type: type,
          description: description,
          quantity_affected: affected > 0 ? affected : null,
          reported_by: reporterName,
          status: 'new',
        },
      ])
      .select()
      .single();

    if (incError) {
      console.error('[VaccineAction] Error al registrar incidente en incident_reports:', incError);
      throw new Error(`Error al registrar en incident_reports: ${incError.message}`);
    }

    // 2. Si el incidente afecta físicamente al inventario, registrar merma en stock_movements
    if (deductFromStock && affected > 0) {
      const { error: smError } = await supabase
        .from('stock_movements')
        .insert([
          {
            vaccine_id: vaccineId,
            type: 'INCIDENT',
            quantity_vials: -Math.abs(affected),
            description: `Merma/Pérdida por incidente (${type}): -${affected} viales. Motivo: ${description}`,
            metadata: {
              incident_id: incident.id,
              incident_type: type,
              quantity_affected: affected,
              reported_by: reporterName,
              source: 'quick_action_incident_report',
              reported_at: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
          },
        ]);

      if (smError) {
        console.error('[VaccineAction] Error al registrar merma en stock_movements:', smError);
        throw new Error(`Incidente registrado, pero falló el ajuste en stock_movements: ${smError.message}`);
      }
    }

    // 3. Invalidar la caché de la vista de stock en Next.js
    revalidatePath('/dashboard/vacunas');
    revalidatePath(`/dashboard/vacunas/${vaccineId}`);
    revalidatePath('/dashboard');

    const updatedStock = await getVaccineStockByIdAction(vaccineId);

    return {
      incident,
      updatedStock,
    };
  } catch (error) {
    console.error('[VaccineAction] reportVaccineIncidentAction falló:', error);
    throw error;
  }
}

/**
 * Server Action: Elimina una orden de reposición por ID y revalida la caché.
 */
export async function deleteReplenishmentScheduleAction(scheduleId: string, vaccineId?: string) {
  if (!scheduleId) return;
  const { error } = await supabase
    .from('replenishment_schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) {
    console.error('[VaccineAction] Error al eliminar reposición:', error);
    throw new Error(error.message);
  }

  if (vaccineId) {
    revalidatePath(`/dashboard/vacunas/${vaccineId}`);
  }
  revalidatePath('/dashboard/vacunas');
}

/**
 * Server Action: Elimina un reporte de incidente por ID y revalida la caché.
 */
export async function deleteVaccineIncidentAction(incidentId: string, vaccineId?: string) {
  if (!incidentId) return;
  const { error } = await supabase
    .from('incident_reports')
    .delete()
    .eq('id', incidentId);

  if (error) {
    console.error('[VaccineAction] Error al eliminar incidente:', error);
    throw new Error(error.message);
  }

  if (vaccineId) {
    revalidatePath(`/dashboard/vacunas/${vaccineId}`);
  }
  revalidatePath('/dashboard/vacunas');
}


