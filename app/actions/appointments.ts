'use server';

/**
 * Server Actions for Appointments & Clinical Vaccine Inventory Operations
 * Salita Feliz - Enterprise Healthcare System
 */

import { revalidatePath } from 'next/cache';
import { completeAppointmentTransaction } from '@/services/vaccineService';
import { updateAppointmentStatus } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import type { CompleteAppointmentParams, AppointmentCompletionResult } from '@/types/vaccine';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Monitoreo autónomo post-transacción (Notificaciones In-App):
 * Consulta la vista `v_vaccines_stock` y genera una notificación interna en la tabla
 * `system_notifications` de forma asíncrona si el stock pasa a estado 'CRITICAL_LOW' o 'OUT_OF_STOCK'.
 */
async function checkAndAlertCriticalStock(vaccineId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('v_vaccines_stock')
      .select('name, available_doses_for_clinic, stock_status')
      .eq('vaccine_id', vaccineId)
      .maybeSingle();

    if (error) {
      console.error('[AutonomousStockMonitor] Error consultando v_vaccines_stock:', error);
      return;
    }

    if (!data) {
      console.warn(`[AutonomousStockMonitor] No se encontró stock para vaccine_id: ${vaccineId}`);
      return;
    }

    const { name, available_doses_for_clinic, stock_status } = data;

    if (stock_status === 'CRITICAL_LOW' || stock_status === 'OUT_OF_STOCK') {
      const isOutOfStock = stock_status === 'OUT_OF_STOCK';
      const title = isOutOfStock ? 'Stock Agotado' : 'Stock Crítico';
      const notificationType = isOutOfStock ? 'CRITICAL' : 'WARNING';
      const message = `El stock de la vacuna ${name} ha llegado a un nivel crítico. Dosis restantes: ${available_doses_for_clinic}.`;

      const { error: insertError } = await supabase
        .from('system_notifications')
        .insert({
          title,
          message,
          type: notificationType,
          is_read: false,
          created_at: new Date().toISOString(),
          metadata: {
            source: 'APPOINTMENT_COMPLETION',
            vaccine_id: vaccineId,
            vaccine_name: name,
            stock_status,
            available_doses_for_clinic,
          },
        });

      if (insertError) {
        console.error('[AutonomousStockMonitor] Error al registrar notificación in-app en system_notifications:', insertError);
      } else {
        console.log(`[AutonomousStockMonitor] Notificación In-App registrada para ${name} (${title})`);
      }
    }
  } catch (err) {
    console.error('[AutonomousStockMonitor] Error inesperado en monitoreo autónomo:', err);
  }
}

/**
 * Server Action: Finaliza un turno clínico invocando la función RPC atómica
 * de PostgreSQL `process_appointment_completion` que deduce inventario en viales y ml
 * de forma atómica en el ledger de movimientos inmutables (stock_movements).
 */
export async function completeAppointmentAction(
  params: CompleteAppointmentParams
): Promise<ActionResponse<AppointmentCompletionResult>> {
  try {
    if (!params.appointmentId) {
      return {
        success: false,
        error: 'El ID del turno es obligatorio.',
        timestamp: new Date().toISOString(),
      };
    }

    if (!params.doseMl || params.doseMl <= 0) {
      return {
        success: false,
        error: 'La dosis aplicada debe ser mayor a 0 ml.',
        timestamp: new Date().toISOString(),
      };
    }

    const result = await completeAppointmentTransaction(params);

    // Disparar monitoreo y alerta autónoma en background sin bloquear la respuesta
    if (result.vaccine_id) {
      checkAndAlertCriticalStock(result.vaccine_id).catch((err) => {
        console.error('[completeAppointmentAction] Error en verificación de stock autónoma:', err);
      });
    }

    // Revalidar las rutas del dashboard para actualizar métricas e inventario en tiempo real
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/turnos');
    revalidatePath('/dashboard/vacunas');
    revalidatePath(`/dashboard/vacunas/${result.vaccine_id}`);

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ServerAction: completeAppointmentAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al procesar el cierre del turno.',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Server Action: Cancela un turno clínico y revalida los datos del dashboard.
 * Omite cualquier validación de vencimiento y retorna el mensaje exacto de Supabase en caso de error.
 */
export async function cancelAppointmentAction(
  appointmentId: string
): Promise<ActionResponse<{ id: string; status: string }>> {
  try {
    if (!appointmentId) {
      return {
        success: false,
        error: 'El ID del turno es requerido.',
        timestamp: new Date().toISOString(),
      };
    }

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId);

    if (error) {
      console.error('[Supabase Error en Cancelación]:', error);
      return {
        success: false,
        error: error.message || 'Error al cancelar el turno en la base de datos.',
        timestamp: new Date().toISOString(),
      };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/turnos');

    return {
      success: true,
      data: { id: appointmentId, status: 'cancelled' },
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[Supabase Error en Cancelación]:', error);
    const errorMessage =
      error?.message ||
      (typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : null) ||
      (typeof error === 'string' ? error : 'Error inesperado al cancelar el turno.');
    return {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Server Action: Realiza el borrado lógico (Soft Delete) de un turno clínico.
 * En lugar de eliminar físicamente la fila, establece la columna `deleted_at`
 * con el timestamp actual, manteniendo la integridad referencial.
 * No valida ni bloquea por fechas de vencimiento de la vacuna.
 */
export async function deleteAppointmentAction(
  appointmentId: string
): Promise<ActionResponse<{ id: string; deleted_at: string }>> {
  try {
    if (!appointmentId) {
      return {
        success: false,
        error: 'El ID del turno es obligatorio.',
        timestamp: new Date().toISOString(),
      };
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .update({ deleted_at: now })
      .eq('id', appointmentId)
      .select('id, deleted_at');

    if (error) {
      console.error('[ServerAction: deleteAppointmentAction] Supabase error:', error);
      return {
        success: false,
        error: error.message || 'Error al eliminar el turno en la base de datos.',
        timestamp: new Date().toISOString(),
      };
    }

    if (!data || data.length === 0) {
      console.error('[ServerAction: deleteAppointmentAction] No se actualizó ninguna fila. ID:', appointmentId);
      return {
        success: false,
        error: 'No se pudo eliminar el turno. Verifique los permisos RLS en Supabase o que el ID exista.',
        timestamp: new Date().toISOString(),
      };
    }

    // Revalidar las rutas del dashboard para reflejar la eliminación lógica inmediatamente
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/turnos');

    return {
      success: true,
      data: { id: appointmentId, deleted_at: now },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ServerAction: deleteAppointmentAction] Error inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al eliminar el turno.',
      timestamp: new Date().toISOString(),
    };
  }
}

export interface CreateAppointmentInput {
  patient_id: string;
  nurse_id?: string;
  vaccine_id: string;
  appointment_date: string;
  appointment_time: string;
  dose_to_apply?: number;
  notes?: string;
  status?: string;
}

/**
 * Server Action: Programa un nuevo turno clínico con validaciones estrictas
 * de fecha de vencimiento y disponibilidad de stock clínico.
 */
export async function createAppointmentAction(
  input: CreateAppointmentInput
): Promise<ActionResponse<any>> {
  try {
    if (!input.patient_id || !input.vaccine_id || !input.appointment_date || !input.appointment_time) {
      return {
        success: false,
        error: 'Paciente, vacuna, fecha y hora son campos obligatorios.',
        timestamp: new Date().toISOString(),
      };
    }

    // 1. Validación estricta de vigencia y stock de la vacuna seleccionada
    const { data: vaccineStock, error: stockErr } = await supabase
      .from('v_vaccines_stock')
      .select('name, expiration_date, available_doses_for_clinic, is_active')
      .eq('vaccine_id', input.vaccine_id)
      .maybeSingle();

    if (stockErr) {
      console.error('[createAppointmentAction] Error consultando stock:', stockErr);
    }

    if (vaccineStock) {
      if (vaccineStock.is_active === false) {
        return {
          success: false,
          error: `ALERTA CLÍNICA: La vacuna "${vaccineStock.name}" se encuentra desactivada en el sistema.`,
          timestamp: new Date().toISOString(),
        };
      }

      // Validar caducidad
      if (vaccineStock.expiration_date) {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (vaccineStock.expiration_date < todayStr) {
          return {
            success: false,
            error: `ALERTA CLÍNICA: La vacuna "${vaccineStock.name}" está VENCIDA desde el ${vaccineStock.expiration_date}. No es posible programar turnos con vacunas caducadas.`,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // Validar stock disponible
      if ((vaccineStock.available_doses_for_clinic ?? 0) <= 0) {
        return {
          success: false,
          error: `ALERTA DE INVENTARIO: La vacuna "${vaccineStock.name}" no tiene dosis clínicas disponibles en este momento.`,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // 2. Inserción del turno en la base de datos
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        patient_id: input.patient_id,
        nurse_id: input.nurse_id || null,
        vaccine_id: input.vaccine_id,
        appointment_date: input.appointment_date,
        appointment_time: input.appointment_time,
        dose_to_apply: input.dose_to_apply ?? 0.5,
        notes: input.notes || '',
        status: input.status || 'scheduled',
      }])
      .select(`
        *,
        patients:patient_id(*),
        vaccines:vaccine_id(*),
        nurses:nurse_id(*)
      `)
      .single();

    if (error) {
      console.error('[createAppointmentAction] Error en inserción:', error);
      return {
        success: false,
        error: error.message || 'Error al programar el turno en la base de datos.',
        timestamp: new Date().toISOString(),
      };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/turnos');

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ServerAction: createAppointmentAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al programar el turno.',
      timestamp: new Date().toISOString(),
    };
  }
}

export interface UpdateAppointmentInput {
  patient_id?: string;
  nurse_id?: string;
  vaccine_id?: string;
  appointment_date?: string;
  appointment_time?: string;
  dose_to_apply?: number;
  notes?: string;
  status?: string;
}

/**
 * Server Action: Actualiza un turno clínico existente.
 * Si se reasigna la vacuna (`vaccine_id`), aplica validación estricta de vencimiento y stock.
 * Si no se cambia la vacuna, permite editar detalles operativos sin bloquear por historial.
 */
export async function updateAppointmentAction(
  appointmentId: string,
  input: UpdateAppointmentInput
): Promise<ActionResponse<any>> {
  try {
    if (!appointmentId) {
      return {
        success: false,
        error: 'El ID del turno es obligatorio.',
        timestamp: new Date().toISOString(),
      };
    }

    // 1. Obtener estado actual del turno
    const { data: currentAppointment, error: fetchErr } = await supabase
      .from('appointments')
      .select('id, vaccine_id, status')
      .eq('id', appointmentId)
      .single();

    if (fetchErr || !currentAppointment) {
      return {
        success: false,
        error: 'No se encontró el turno a actualizar.',
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Si se cambia de vacuna, validar que la nueva no esté vencida ni sin stock
    if (input.vaccine_id && input.vaccine_id !== currentAppointment.vaccine_id) {
      const { data: newVaccineStock } = await supabase
        .from('v_vaccines_stock')
        .select('name, expiration_date, available_doses_for_clinic, is_active')
        .eq('vaccine_id', input.vaccine_id)
        .maybeSingle();

      if (newVaccineStock) {
        if (newVaccineStock.is_active === false) {
          return {
            success: false,
            error: `ALERTA CLÍNICA: La vacuna reasignada "${newVaccineStock.name}" se encuentra inactiva.`,
            timestamp: new Date().toISOString(),
          };
        }

        const todayStr = new Date().toISOString().slice(0, 10);
        if (newVaccineStock.expiration_date && newVaccineStock.expiration_date < todayStr) {
          return {
            success: false,
            error: `ALERTA CLÍNICA: No se puede reasignar a la vacuna "${newVaccineStock.name}" porque está VENCIDA desde el ${newVaccineStock.expiration_date}.`,
            timestamp: new Date().toISOString(),
          };
        }

        if ((newVaccineStock.available_doses_for_clinic ?? 0) <= 0) {
          return {
            success: false,
            error: `ALERTA DE INVENTARIO: La vacuna "${newVaccineStock.name}" no tiene dosis clínicas disponibles en stock.`,
            timestamp: new Date().toISOString(),
          };
        }
      }
    }

    // 3. Construir payload de actualización
    const updatePayload: Record<string, any> = {};
    if (input.patient_id !== undefined) updatePayload.patient_id = input.patient_id;
    if (input.nurse_id !== undefined) updatePayload.nurse_id = input.nurse_id || null;
    if (input.vaccine_id !== undefined) updatePayload.vaccine_id = input.vaccine_id;
    if (input.appointment_date !== undefined) updatePayload.appointment_date = input.appointment_date;
    if (input.appointment_time !== undefined) updatePayload.appointment_time = input.appointment_time;
    if (input.dose_to_apply !== undefined) updatePayload.dose_to_apply = input.dose_to_apply;
    if (input.notes !== undefined) updatePayload.notes = input.notes;
    if (input.status !== undefined) updatePayload.status = input.status;

    const { data, error } = await supabase
      .from('appointments')
      .update(updatePayload)
      .eq('id', appointmentId)
      .select(`
        *,
        patients:patient_id(*),
        vaccines:vaccine_id(*),
        nurses:nurse_id(*)
      `)
      .single();

    if (error) {
      console.error('[updateAppointmentAction] Error en actualización:', error);
      return {
        success: false,
        error: error.message || 'Error al actualizar el turno en la base de datos.',
        timestamp: new Date().toISOString(),
      };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/turnos');
    revalidatePath(`/dashboard/turnos/${appointmentId}`);
    revalidatePath(`/dashboard/turnos/${appointmentId}/editar`);

    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[ServerAction: updateAppointmentAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado al actualizar el turno.',
      timestamp: new Date().toISOString(),
    };
  }
}



