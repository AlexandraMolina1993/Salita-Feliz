'use server';

/**
 * Server Actions for Patients Management
 * Salita Feliz - Enterprise Healthcare System
 */

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import type { Patient } from '@/lib/supabase';

export interface CreatePatientResult {
  success: boolean;
  data?: Patient;
  error?: string;
}

/**
 * Normaliza un número telefónico de Argentina al estándar internacional E.164 (+549XXXXXXXXXX).
 * - Limpia espacios, guiones y caracteres no numéricos.
 * - Remueve prefijos de país iniciales (549, 54).
 * - Remueve el prefijo interurbano '0'.
 * - Remueve el prefijo móvil local '15' si está después del código de área (2, 3 o 4 dígitos).
 * - Ajusta para que siempre comience con '+549' seguido de los 10 dígitos.
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // 1. Remover prefijo de país 549 o 54 si ya fue ingresado
  if (digits.startsWith('549')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('54')) {
    digits = digits.slice(2);
    if (digits.startsWith('9')) {
      digits = digits.slice(1);
    }
  }

  // 2. Remover prefijo interurbano '0' al inicio
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }

  // 3. Remover el prefijo móvil local '15' luego del código de área
  // En Argentina: código de área (2 a 4 dígitos) + número local = 10 dígitos.
  // Con el '15' incluido, la cadena suma 12 dígitos.
  if (digits.length === 12 || digits.length > 10) {
    // Área de 2 dígitos (ej. 11 AMBA/Buenos Aires)
    if (digits.startsWith('11') && digits.slice(2, 4) === '15') {
      digits = digits.slice(0, 2) + digits.slice(4);
    }
    // Área de 3 dígitos (ej. 387 Salta, 351 Córdoba, 341 Rosario)
    else if (digits.slice(3, 5) === '15') {
      digits = digits.slice(0, 3) + digits.slice(5);
    }
    // Área de 4 dígitos (ej. 2966 Río Gallegos, 2302 General Pico)
    else if (digits.slice(4, 6) === '15') {
      digits = digits.slice(0, 4) + digits.slice(6);
    }
  }

  return `+549${digits}`;
}

export async function createPatientAction(
  patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>
): Promise<CreatePatientResult> {
  try {
    const trimmedDni = patientData.dni?.toString().trim();
    const normalizedPhone = patientData.phone ? normalizePhone(patientData.phone.toString()) : '';
    const trimmedEmail = patientData.email ? patientData.email.toString().trim() : null;
    const trimmedInsuranceNumber = patientData.insurance_number ? patientData.insurance_number.toString().trim() : null;

    // 1. Validación de DNI (Validar siempre)
    if (trimmedDni) {
      const { data: existingDni, error: dniError } = await supabase
        .from('patients')
        .select('id, dni')
        .eq('dni', trimmedDni)
        .maybeSingle();

      if (dniError) {
        console.error('[createPatientAction] Error verificando DNI:', dniError);
      } else if (existingDni) {
        return {
          success: false,
          error: 'Ya existe un paciente con este DNI.',
        };
      }
    }

    // 2. Validación de Teléfono (Validar con número normalizado E.164)
    if (normalizedPhone) {
      const { data: existingPhone, error: phoneError } = await supabase
        .from('patients')
        .select('id, phone')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (phoneError) {
        console.error('[createPatientAction] Error verificando Teléfono:', phoneError);
      } else if (existingPhone) {
        return {
          success: false,
          error: 'Ya existe un paciente con este teléfono.',
        };
      }
    }

    // 3. Validación de Email (Validar SOLO si no viene vacío)
    if (trimmedEmail) {
      const { data: existingEmail, error: emailError } = await supabase
        .from('patients')
        .select('id, email')
        .ilike('email', trimmedEmail)
        .maybeSingle();

      if (emailError) {
        console.error('[createPatientAction] Error verificando Email:', emailError);
      } else if (existingEmail) {
        return {
          success: false,
          error: 'Ya existe un paciente con este correo electrónico.',
        };
      }
    }

    // 4. Validación de Número de Afiliado (Validar SOLO si no viene vacío)
    if (trimmedInsuranceNumber) {
      const { data: existingInsurance, error: insuranceError } = await supabase
        .from('patients')
        .select('id, insurance_number')
        .eq('insurance_number', trimmedInsuranceNumber)
        .maybeSingle();

      if (insuranceError) {
        console.error('[createPatientAction] Error verificando Afiliado:', insuranceError);
      } else if (existingInsurance) {
        return {
          success: false,
          error: 'Ya existe un paciente con este número de afiliado.',
        };
      }
    }

    // 5. Preparar payload con valores normalizados
    const payload: Omit<Patient, 'id' | 'created_at' | 'updated_at'> = {
      ...patientData,
      dni: trimmedDni,
      phone: normalizedPhone || patientData.phone,
      emergency_phone: patientData.emergency_phone ? normalizePhone(patientData.emergency_phone) : patientData.emergency_phone,
      email: trimmedEmail || undefined,
      insurance_number: trimmedInsuranceNumber || undefined,
    };

    // 6. Inserción en la base de datos
    const { data, error: insertError } = await supabase
      .from('patients')
      .insert([payload])
      .select()
      .single();

    if (insertError) {
      console.error('[createPatientAction] Error insertando paciente:', insertError);

      // Manejo de contingencia por colisión única a nivel Postgres (código 23505)
      if (insertError.code === '23505') {
        const errorDetail = `${insertError.message || ''} ${insertError.details || ''}`.toLowerCase();
        if (errorDetail.includes('dni')) {
          return {
            success: false,
            error: 'Ya existe un paciente con este DNI.',
          };
        }
        if (errorDetail.includes('phone') || errorDetail.includes('telefono')) {
          return {
            success: false,
            error: 'Ya existe un paciente con este teléfono.',
          };
        }
        if (errorDetail.includes('email') || errorDetail.includes('correo')) {
          return {
            success: false,
            error: 'Ya existe un paciente con este correo electrónico.',
          };
        }
        if (errorDetail.includes('insurance_number') || errorDetail.includes('afiliado')) {
          return {
            success: false,
            error: 'Ya existe un paciente con este número de afiliado.',
          };
        }
        return {
          success: false,
          error: 'Ya existe un paciente con estos datos de identificación.',
        };
      }

      return {
        success: false,
        error: insertError.message || 'No se pudo registrar el paciente en el sistema.',
      };
    }

    revalidatePath('/dashboard/pacientes');

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('[createPatientAction] Excepción inesperada:', error);
    return {
      success: false,
      error: error?.message || 'Ocurrió un error inesperado al procesar la solicitud.',
    };
  }
}

export async function updatePatientAction(
  patientId: string,
  patientData: Partial<Patient>
): Promise<CreatePatientResult> {
  try {
    if (!patientId) {
      return {
        success: false,
        error: 'Identificador de paciente requerido para la actualización.',
      };
    }

    const trimmedDni = patientData.dni !== undefined ? patientData.dni?.toString().trim() : undefined;
    const normalizedPhone = patientData.phone !== undefined && patientData.phone !== null && patientData.phone !== ''
      ? normalizePhone(patientData.phone.toString())
      : undefined;
    const trimmedEmail = patientData.email ? patientData.email.toString().trim() : (patientData.email === '' ? null : undefined);
    const trimmedInsuranceNumber = patientData.insurance_number
      ? patientData.insurance_number.toString().trim()
      : (patientData.insurance_number === '' ? null : undefined);

    // 1. Validación de DNI (excluyendo al paciente actual)
    if (trimmedDni) {
      const { data: existingDni, error: dniError } = await supabase
        .from('patients')
        .select('id, dni')
        .eq('dni', trimmedDni)
        .neq('id', patientId)
        .maybeSingle();

      if (dniError) {
        console.error('[updatePatientAction] Error verificando DNI:', dniError);
      } else if (existingDni) {
        return {
          success: false,
          error: 'Ya existe un paciente con este DNI.',
        };
      }
    }

    // 2. Validación de Teléfono normalizado (excluyendo al paciente actual)
    if (normalizedPhone) {
      const { data: existingPhone, error: phoneError } = await supabase
        .from('patients')
        .select('id, phone')
        .eq('phone', normalizedPhone)
        .neq('id', patientId)
        .maybeSingle();

      if (phoneError) {
        console.error('[updatePatientAction] Error verificando Teléfono:', phoneError);
      } else if (existingPhone) {
        return {
          success: false,
          error: 'Ya existe un paciente con este teléfono.',
        };
      }
    }

    // 3. Validación de Email (SOLO si no viene vacío, excluyendo al paciente actual)
    if (trimmedEmail) {
      const { data: existingEmail, error: emailError } = await supabase
        .from('patients')
        .select('id, email')
        .ilike('email', trimmedEmail)
        .neq('id', patientId)
        .maybeSingle();

      if (emailError) {
        console.error('[updatePatientAction] Error verificando Email:', emailError);
      } else if (existingEmail) {
        return {
          success: false,
          error: 'Ya existe un paciente con este correo electrónico.',
        };
      }
    }

    // 4. Validación de Número de Afiliado (SOLO si no viene vacío, excluyendo al paciente actual)
    if (trimmedInsuranceNumber) {
      const { data: existingInsurance, error: insuranceError } = await supabase
        .from('patients')
        .select('id, insurance_number')
        .eq('insurance_number', trimmedInsuranceNumber)
        .neq('id', patientId)
        .maybeSingle();

      if (insuranceError) {
        console.error('[updatePatientAction] Error verificando Afiliado:', insuranceError);
      } else if (existingInsurance) {
        return {
          success: false,
          error: 'Ya existe un paciente con este número de afiliado.',
        };
      }
    }

    // 5. Preparar payload de actualización
    const payload: Partial<Patient> = {
      ...patientData,
      ...(trimmedDni !== undefined && { dni: trimmedDni }),
      ...(normalizedPhone !== undefined && { phone: normalizedPhone }),
      ...(patientData.emergency_phone ? { emergency_phone: normalizePhone(patientData.emergency_phone) } : {}),
      ...(trimmedEmail !== undefined && { email: trimmedEmail || undefined }),
      ...(trimmedInsuranceNumber !== undefined && { insurance_number: trimmedInsuranceNumber || undefined }),
      updated_at: new Date().toISOString(),
    };

    // 6. Actualizar registro en Supabase
    const { data, error: updateError } = await supabase
      .from('patients')
      .update(payload)
      .eq('id', patientId)
      .select()
      .single();

    if (updateError) {
      console.error('[updatePatientAction] Error actualizando paciente:', updateError);

      if (updateError.code === '23505') {
        const errorDetail = `${updateError.message || ''} ${updateError.details || ''}`.toLowerCase();
        if (errorDetail.includes('dni')) {
          return {
            success: false,
            error: 'Ya existe un paciente con este DNI.',
          };
        }
        if (errorDetail.includes('phone') || errorDetail.includes('telefono')) {
          return {
            success: false,
            error: 'Ya existe un paciente con este teléfono.',
          };
        }
        if (errorDetail.includes('email') || errorDetail.includes('correo')) {
          return {
            success: false,
            error: 'Ya existe un paciente con este correo electrónico.',
          };
        }
        if (errorDetail.includes('insurance_number') || errorDetail.includes('afiliado')) {
          return {
            success: false,
            error: 'Ya existe un paciente con este número de afiliado.',
          };
        }
        return {
          success: false,
          error: 'Ya existe un paciente con estos datos de identificación.',
        };
      }

      return {
        success: false,
        error: updateError.message || 'No se pudo actualizar el paciente en el sistema.',
      };
    }

    revalidatePath('/dashboard/pacientes');
    revalidatePath(`/dashboard/pacientes/${patientId}`);

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('[updatePatientAction] Excepción inesperada:', error);
    return {
      success: false,
      error: error?.message || 'Ocurrió un error inesperado al procesar la actualización.',
    };
  }
}
