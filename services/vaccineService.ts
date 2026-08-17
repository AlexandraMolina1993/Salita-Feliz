/**
 * Vaccine Inventory & Appointment Transaction Service
 * Salita Feliz - Enterprise Healthcare System
 *
 * Conecta el frontend con la arquitectura Event-Driven Inventory
 * y la función RPC atómica de PostgreSQL en Supabase.
 */

import { supabase } from '@/lib/supabase';
import type {
  VaccineStockView,
  CompleteAppointmentParams,
  ProcessAppointmentCompletionRPCParams,
  AppointmentCompletionResult,
  GetVaccineStockOptions,
} from '@/types/vaccine';

/**
 * Clase de error personalizada para operaciones del servicio de vacunas.
 */
export class VaccineServiceError extends Error {
  public code?: string;
  public details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'VaccineServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Clase de error específica para fallos transaccionales en la RPC.
 */
export class VaccineTransactionError extends VaccineServiceError {
  constructor(message: string, details?: unknown) {
    super(message, 'TRANSACTION_FAILED', details);
    this.name = 'VaccineTransactionError';
  }
}

/**
 * Normaliza los parámetros recibidos (soporta formato camelCase de aplicación o snake_case / p_* de RPC).
 */
function normalizeRPCParams(
  params: CompleteAppointmentParams | ProcessAppointmentCompletionRPCParams
): ProcessAppointmentCompletionRPCParams {
  if ('p_appointment_id' in params) {
    return params;
  }

  return {
    p_appointment_id: params.appointmentId,
    p_dose_ml: params.doseMl,
    p_nurse_id: params.nurseId ?? null,
    p_notes: params.notes ?? null,
    p_side_effects: params.sideEffects ?? null,
    p_lot_number: params.lotNumber ?? null,
    p_site_of_injection: params.siteOfInjection ?? null,
  };
}

/**
 * Consulta la vista optimizada `v_vaccines_stock` en Supabase con soporte para filtros y ordenamiento.
 *
 * @param options Opciones de filtrado y ordenamiento.
 * @returns Lista de vacunas con su balance de stock en viales, mililitros y estado calculado.
 */
export async function getVaccineStockList(
  options: GetVaccineStockOptions = {}
): Promise<VaccineStockView[]> {
  try {
    const {
      onlyActive = true,
      status,
      searchTerm,
      orderBy = 'name',
      ascending = true,
    } = options;

    let query = supabase
      .from('v_vaccines_stock')
      .select('*');

    // Filtro por estado activo de la vacuna
    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    // Filtro por estado de stock (OPTIMAL, CRITICAL_LOW, OUT_OF_STOCK)
    if (status) {
      query = query.eq('stock_status', status);
    }

    // Filtro de búsqueda por texto (nombre o laboratorio)
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.trim();
      query = query.or(`name.ilike.%${term}%,laboratory.ilike.%${term}%`);
    }

    // Ordenamiento
    query = query.order(orderBy, { ascending });

    const { data, error } = await query;

    if (error) {
      console.error('[VaccineService] Error al consultar v_vaccines_stock:', error);
      throw new VaccineServiceError(
        `Error al obtener el stock de vacunas: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      return [];
    }

    return data.map((item: any) => {
      const physicalVials = Number(item.physical_vials ?? item.current_stock_vials ?? item.physical_vials_for_repos ?? Math.ceil(Number(item.current_stock_fraction) || 0));
      const totalMl = Number(item.total_ml ?? item.current_stock_ml) || (physicalVials * (Number(item.dose_amount) || 0.5));

      return {
        vaccine_id: item.vaccine_id,
        name: item.name,
        laboratory: item.laboratory || null,
        type: item.type || null,
        dose_amount: Number(item.dose_amount) || 0.5,
        net_content: Number(item.net_content) || 5.0,
        min_stock_level: Number(item.min_stock_level) || 10,
        is_active: Boolean(item.is_active),
        expiration_date: item.expiration_date || null,
        current_stock_fraction: Number(item.current_stock_fraction) || 0,
        total_ml: totalMl,
        physical_vials: physicalVials,
        physical_vials_for_repos: physicalVials,
        available_doses_for_clinic: Number(item.available_doses_for_clinic) || Math.floor(totalMl / (Number(item.dose_amount) || 0.5)),
        current_stock_vials: physicalVials,
        current_stock_ml: totalMl,
        stock_status: item.stock_status || (physicalVials <= 0 ? 'OUT_OF_STOCK' : physicalVials <= (Number(item.min_stock_level) || 10) ? 'CRITICAL_LOW' : 'OPTIMAL'),
      };
    }) as VaccineStockView[];
  } catch (error) {
    if (error instanceof VaccineServiceError) {
      throw error;
    }
    console.error('[VaccineService] Error inesperado en getVaccineStockList:', error);
    throw new VaccineServiceError(
      'Error de conexión o lectura al consultar el inventario de vacunas.',
      'UNEXPECTED_ERROR',
      error
    );
  }
}

/**
 * Consulta la vista maestra `v_vaccines_stock` filtrando estrictamente opciones clínicamente viables para nuevos turnos:
 * - Fecha de vencimiento hoy o en el futuro (.gte('expiration_date', today))
 * - Vacuna activa (.eq('is_active', true))
 * - Stock real disponible para el paciente (.gt('available_doses_for_clinic', 0))
 *
 * @returns Lista de vacunas clínicamente aptas para aplicación.
 */
export async function getClinicallyAvailableVaccines(): Promise<VaccineStockView[]> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('v_vaccines_stock')
      .select('*')
      .gte('expiration_date', today)
      .eq('is_active', true)
      .gt('available_doses_for_clinic', 0)
      .order('name', { ascending: true });

    if (error) {
      console.error('[VaccineService] Error al consultar vacunas clínicamente viables en v_vaccines_stock:', error);
      throw new VaccineServiceError(
        `Error al obtener vacunas clínicamente viables: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      return [];
    }

    return data.map((item: any) => {
      const physicalVials = Number(item.physical_vials ?? item.current_stock_vials ?? item.physical_vials_for_repos ?? Math.ceil(Number(item.current_stock_fraction) || 0));
      const totalMl = Number(item.total_ml ?? item.current_stock_ml) || (physicalVials * (Number(item.dose_amount) || 0.5));

      return {
        vaccine_id: item.vaccine_id,
        name: item.name,
        laboratory: item.laboratory || null,
        type: item.type || null,
        dose_amount: Number(item.dose_amount) || 0.5,
        net_content: Number(item.net_content) || 5.0,
        min_stock_level: Number(item.min_stock_level) || 10,
        is_active: Boolean(item.is_active),
        expiration_date: item.expiration_date || null,
        current_stock_fraction: Number(item.current_stock_fraction) || 0,
        total_ml: totalMl,
        physical_vials: physicalVials,
        physical_vials_for_repos: physicalVials,
        available_doses_for_clinic: Number(item.available_doses_for_clinic) || Math.floor(totalMl / (Number(item.dose_amount) || 0.5)),
        current_stock_vials: physicalVials,
        current_stock_ml: totalMl,
        stock_status: item.stock_status || (physicalVials <= 0 ? 'OUT_OF_STOCK' : physicalVials <= (Number(item.min_stock_level) || 10) ? 'CRITICAL_LOW' : 'OPTIMAL'),
      };
    }) as VaccineStockView[];
  } catch (error) {
    if (error instanceof VaccineServiceError) {
      throw error;
    }
    console.error('[VaccineService] Error inesperado en getClinicallyAvailableVaccines:', error);
    throw new VaccineServiceError(
      'Error de conexión al consultar vacunas viables para turnos.',
      'UNEXPECTED_ERROR',
      error
    );
  }
}

/**
 * Obtiene el detalle de stock de una vacuna específica por su ID desde la vista `v_vaccines_stock`.
 *
 * @param vaccineId UUID de la vacuna a consultar.
 * @returns Datos consolidados de stock o null si no se encuentra.
 */
export async function getVaccineStockById(
  vaccineId: string
): Promise<VaccineStockView | null> {
  if (!vaccineId) {
    throw new VaccineServiceError('El parámetro vaccineId es obligatorio.', 'INVALID_ARGUMENT');
  }

  try {
    const { data, error } = await supabase
      .from('v_vaccines_stock')
      .select('*')
      .eq('vaccine_id', vaccineId)
      .maybeSingle();

    if (error) {
      console.error(`[VaccineService] Error al consultar vacuna con ID ${vaccineId}:`, error);
      throw new VaccineServiceError(
        `Error al obtener la vacuna: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      return null;
    }

    const physicalVials = Number(data.physical_vials ?? data.current_stock_vials ?? data.physical_vials_for_repos ?? Math.ceil(Number(data.current_stock_fraction) || 0));
    const totalMl = Number(data.total_ml ?? data.current_stock_ml) || (physicalVials * (Number(data.dose_amount) || 0.5));

    return {
      vaccine_id: data.vaccine_id,
      name: data.name,
      laboratory: data.laboratory || null,
      type: data.type || null,
      dose_amount: Number(data.dose_amount) || 0.5,
      net_content: Number(data.net_content) || 5.0,
      min_stock_level: Number(data.min_stock_level) || 10,
      is_active: Boolean(data.is_active),
      expiration_date: data.expiration_date || null,
      current_stock_fraction: Number(data.current_stock_fraction) || 0,
      total_ml: totalMl,
      physical_vials: physicalVials,
      physical_vials_for_repos: physicalVials,
      available_doses_for_clinic: Number(data.available_doses_for_clinic) || Math.floor(totalMl / (Number(data.dose_amount) || 0.5)),
      current_stock_vials: physicalVials,
      current_stock_ml: totalMl,
      stock_status: data.stock_status || (physicalVials <= 0 ? 'OUT_OF_STOCK' : physicalVials <= (Number(data.min_stock_level) || 10) ? 'CRITICAL_LOW' : 'OPTIMAL'),
    };
  } catch (error) {
    if (error instanceof VaccineServiceError) {
      throw error;
    }
    throw new VaccineServiceError(
      `Error inesperado al buscar la vacuna ${vaccineId}.`,
      'UNEXPECTED_ERROR',
      error
    );
  }
}

/**
 * Ejecuta de forma atómica y segura la transacción de completado de turno y deducción de stock
 * invocando la función RPC de PostgreSQL `process_appointment_completion`.
 *
 * Realiza validaciones previas de integridad y maneja excepciones transaccionales con rollback garantizado.
 *
 * @param params Parámetros para completar el turno (formato DTO o PostgreSQL RPC).
 * @returns Resultado estructurado con los detalles del consumo y stock remanente.
 */
export async function completeAppointmentTransaction(
  params: CompleteAppointmentParams | ProcessAppointmentCompletionRPCParams
): Promise<AppointmentCompletionResult> {
  const rpcPayload = normalizeRPCParams(params);

  // 1. Validaciones previas en la capa de servicio
  if (!rpcPayload.p_appointment_id || rpcPayload.p_appointment_id.trim() === '') {
    throw new VaccineTransactionError('El ID del turno (p_appointment_id) es obligatorio.');
  }

  if (rpcPayload.p_dose_ml === undefined || rpcPayload.p_dose_ml === null || rpcPayload.p_dose_ml <= 0) {
    throw new VaccineTransactionError(
      `La dosis aplicada (${rpcPayload.p_dose_ml}) debe ser un número mayor a 0 ml.`
    );
  }

  try {
    // 2. Invocación de la función RPC atómica en Supabase
    const { data, error } = await supabase.rpc('process_appointment_completion', rpcPayload);

    // 3. Manejo de fallos transaccionales o de base de datos
    if (error) {
      console.error('[VaccineService] Error transaccional en process_appointment_completion:', error);

      // Tratamiento de mensajes específicos lanzados por PostgreSQL RAISE EXCEPTION
      const errorMessage = error.message || 'Error al procesar la finalización del turno.';
      throw new VaccineTransactionError(errorMessage, error);
    }

    if (!data) {
      throw new VaccineTransactionError(
        'La transacción finalizó pero no se recibió respuesta de confirmación.'
      );
    }

    // 4. Parseo y retorno del resultado estructurado
    const result = (typeof data === 'string' ? JSON.parse(data) : data) as AppointmentCompletionResult;

    if (!result.success) {
      throw new VaccineTransactionError(
        'La base de datos reportó un fallo no exitoso en la operación.',
        result
      );
    }

    return result;
  } catch (error) {
    if (error instanceof VaccineTransactionError) {
      throw error;
    }
    console.error('[VaccineService] Error inesperado en completeAppointmentTransaction:', error);
    throw new VaccineTransactionError(
      error instanceof Error ? error.message : 'Error inesperado durante la transacción clínica.',
      error
    );
  }
}
