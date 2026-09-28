// services/epidemiologyService.ts
import { supabase } from '@/lib/supabase';

export interface RegionalCoverageItem {
  vacuna: 'Antigripal (>65)' | 'VPH (11 años)' | 'Quíntuple (Lactantes)' | string;
  local: number;
  regional: number;
  sourcePeriod?: string;
  targetGroup?: string;
  totalTargetPatients?: number;
  vaccinatedPatients?: number;
  difference?: number;
  status?: 'above' | 'below' | 'equal';
  insight?: string;
}

export interface LocalCohortCoverage {
  local: number;
  totalTargetPatients: number;
  vaccinatedPatients: number;
}

// Lista oficial de las 24 jurisdicciones de la República Argentina
export const ARGENTINA_PROVINCES = [
  'Córdoba',
  'Buenos Aires',
  'CABA',
  'Santa Fe',
  'Mendoza',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán'
] as const;

export type ArgentinaProvince = typeof ARGENTINA_PROVINCES[number];

export const DEFAULT_VACCINE_TARGETS = [
  { vacuna: 'Antigripal (>65)', targetGroup: 'Adultos Mayores (≥65 años)' },
  { vacuna: 'VPH (11 años)', targetGroup: 'Adolescentes (cohorte 11 años)' },
  { vacuna: 'Quíntuple (Lactantes)', targetGroup: 'Lactantes (<2 años)' }
] as const;

function getDefaultRegionalItems(): RegionalCoverageItem[] {
  return DEFAULT_VACCINE_TARGETS.map((item) => ({
    vacuna: item.vacuna,
    local: 0,
    regional: 0,
    sourcePeriod: 'Sin registro cargado',
    targetGroup: item.targetGroup
  }));
}

/**
 * 1. Retorna los datos de cobertura regional NOMIVAC para una provincia consultando la tabla `regional_statistics`.
 * Si no hay datos cargados para la provincia o ocurre una falla en la consulta, retorna 0% y valores
 * por defecto seguros para garantizar que no se rompa la interfaz de usuario.
 */
export async function getRegionalCoverageData(provincia: string): Promise<RegionalCoverageItem[]> {
  const normalizedProvince = provincia.trim();

  try {
    const { data, error } = await supabase
      .from('regional_statistics')
      .select('province, vaccine_key, coverage_percentage, source_period')
      .ilike('province', normalizedProvince);

    if (error) {
      console.warn(`[epidemiologyService] Aviso al consultar regional_statistics para '${normalizedProvince}':`, error.message);
      return getDefaultRegionalItems();
    }

    if (!data || data.length === 0) {
      return getDefaultRegionalItems();
    }

    const statsMap = new Map<string, { coverage: number; sourcePeriod: string }>();
    data.forEach((row: any) => {
      statsMap.set(row.vaccine_key, {
        coverage: Number(row.coverage_percentage) || 0,
        sourcePeriod: row.source_period || 'Boletín Oficial'
      });
    });

    const generalSourcePeriod = data[0]?.source_period || 'Boletín Oficial';

    const result: RegionalCoverageItem[] = DEFAULT_VACCINE_TARGETS.map((item) => {
      const found = statsMap.get(item.vacuna);
      return {
        vacuna: item.vacuna,
        local: 0,
        regional: found ? found.coverage : 0,
        sourcePeriod: found ? found.sourcePeriod : generalSourcePeriod,
        targetGroup: item.targetGroup
      };
    });

    // Agregar vacunas adicionales si estuvieran cargadas en la base
    data.forEach((row: any) => {
      if (!DEFAULT_VACCINE_TARGETS.some((v) => v.vacuna === row.vaccine_key)) {
        result.push({
          vacuna: row.vaccine_key,
          local: 0,
          regional: Number(row.coverage_percentage) || 0,
          sourcePeriod: row.source_period || generalSourcePeriod,
          targetGroup: 'Población General'
        });
      }
    });

    return result;
  } catch (err) {
    console.error(`[epidemiologyService] Error inesperado en getRegionalCoverageData:`, err);
    return getDefaultRegionalItems();
  }
}

/**
 * Calcula la edad precisa en años a partir de una fecha de nacimiento (YYYY-MM-DD o ISO).
 */
export function calculatePatientAgeYears(birthDateStr: string | null | undefined): number {
  if (!birthDateStr) return -1;
  const parts = birthDateStr.split('T')[0].split('-');
  if (parts.length < 3) return -1;

  const bYear = parseInt(parts[0], 10);
  const bMonth = parseInt(parts[1], 10) - 1;
  const bDay = parseInt(parts[2], 10);

  if (isNaN(bYear) || isNaN(bMonth) || isNaN(bDay)) return -1;

  const today = new Date();
  let age = today.getFullYear() - bYear;
  const m = today.getMonth() - bMonth;

  if (m < 0 || (m === 0 && today.getDate() < bDay)) {
    age--;
  }

  return age;
}

/**
 * 2. Lógica de Cruce de Datos (Interno vs. Regional):
 * Calcula la cobertura real de Salita Feliz (`local`) cruzando:
 * - Total de pacientes activos en el rango de edad objetivo (Denominador)
 * - Pacientes únicos de esa cohorte con turnos en estado 'completed' para la vacuna (Numerador)
 */
export async function calculateSalitaFelizCoverage(): Promise<Record<string, LocalCohortCoverage>> {
  try {
    // 1. Obtener pacientes activos
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, birth_date, is_active');

    if (patientsError) {
      console.error('Error al obtener pacientes para epidemiología:', patientsError);
      return getEmptyCoverage();
    }

    const activePatients = (patients || []).filter(
      (p: any) => p.is_active !== false && p.birth_date
    );

    // Segmentación por cohorte etaria objetivo
    // Antigripal: >= 65 años (o >= 60 si no hay >= 65 en base reducida)
    let elderlyPatients = activePatients.filter(
      (p: any) => calculatePatientAgeYears(p.birth_date) >= 65
    );
    if (elderlyPatients.length === 0) {
      elderlyPatients = activePatients.filter(
        (p: any) => calculatePatientAgeYears(p.birth_date) >= 60
      );
    }

    // VPH: cohorte de 11 años (ampliado a 10-12 años, fallback 9-15 años)
    let hpvCohortPatients = activePatients.filter((p: any) => {
      const age = calculatePatientAgeYears(p.birth_date);
      return age >= 10 && age <= 12;
    });
    if (hpvCohortPatients.length === 0) {
      hpvCohortPatients = activePatients.filter((p: any) => {
        const age = calculatePatientAgeYears(p.birth_date);
        return age >= 9 && age <= 15;
      });
    }

    // Quíntuple: Lactantes (< 2 años, fallback a pediátricos <= 5 años)
    let infantPatients = activePatients.filter((p: any) => {
      const age = calculatePatientAgeYears(p.birth_date);
      return age >= 0 && age < 2;
    });
    if (infantPatients.length === 0) {
      infantPatients = activePatients.filter((p: any) => {
        const age = calculatePatientAgeYears(p.birth_date);
        return age >= 0 && age <= 5;
      });
    }

    const elderlyIds = new Set(elderlyPatients.map((p: any) => p.id));
    const hpvCohortIds = new Set(hpvCohortPatients.map((p: any) => p.id));
    const infantIds = new Set(infantPatients.map((p: any) => p.id));

    // 2. Obtener turnos completados con su vacuna asociada
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('patient_id, status, vaccines(name, type)')
      .eq('status', 'completed');

    if (apptError) {
      console.error('Error al obtener turnos para epidemiología:', apptError);
      return getEmptyCoverage();
    }

    const vaccinatedElderly = new Set<string>();
    const vaccinatedHpv = new Set<string>();
    const vaccinatedInfant = new Set<string>();

    (appointments || []).forEach((appt: any) => {
      const pId = appt.patient_id;
      if (!pId) return;

      const vName = (appt.vaccines?.name || '').toLowerCase();
      const vType = (appt.vaccines?.type || '').toLowerCase();
      const fullText = `${vName} ${vType}`;

      // A) Antigripal / Gripe
      const isAntigripal =
        fullText.includes('antigripal') ||
        fullText.includes('gripe') ||
        fullText.includes('influenza') ||
        fullText.includes('fluzone') ||
        fullText.includes('agripal');

      if (isAntigripal && elderlyIds.has(pId)) {
        vaccinatedElderly.add(pId);
      }

      // B) VPH
      const isVPH =
        fullText.includes('vph') ||
        fullText.includes('hpv') ||
        fullText.includes('papiloma') ||
        fullText.includes('gardasil') ||
        fullText.includes('cervarix');

      if (isVPH && hpvCohortIds.has(pId)) {
        vaccinatedHpv.add(pId);
      }

      // C) Quíntuple (Pentavalente)
      const isQuintuple =
        fullText.includes('quíntuple') ||
        fullText.includes('quintuple') ||
        fullText.includes('pentavalente') ||
        fullText.includes('pentaxim') ||
        fullText.includes('dpt-hb-hib');

      if (isQuintuple && infantIds.has(pId)) {
        vaccinatedInfant.add(pId);
      }
    });

    const calcCoverage = (vaccinated: number, total: number): number => {
      if (total <= 0) return 0;
      return Math.min(100, Math.round((vaccinated / total) * 100));
    };

    return {
      'Antigripal (>65)': {
        local: calcCoverage(vaccinatedElderly.size, elderlyPatients.length),
        totalTargetPatients: elderlyPatients.length,
        vaccinatedPatients: vaccinatedElderly.size
      },
      'VPH (11 años)': {
        local: calcCoverage(vaccinatedHpv.size, hpvCohortPatients.length),
        totalTargetPatients: hpvCohortPatients.length,
        vaccinatedPatients: vaccinatedHpv.size
      },
      'Quíntuple (Lactantes)': {
        local: calcCoverage(vaccinatedInfant.size, infantPatients.length),
        totalTargetPatients: infantPatients.length,
        vaccinatedPatients: vaccinatedInfant.size
      }
    };
  } catch (error) {
    console.error('Error calculando cobertura de Salita Feliz:', error);
    return getEmptyCoverage();
  }
}

function getEmptyCoverage(): Record<string, LocalCohortCoverage> {
  return {
    'Antigripal (>65)': { local: 0, totalTargetPatients: 0, vaccinatedPatients: 0 },
    'VPH (11 años)': { local: 0, totalTargetPatients: 0, vaccinatedPatients: 0 },
    'Quíntuple (Lactantes)': { local: 0, totalTargetPatients: 0, vaccinatedPatients: 0 }
  };
}

/**
 * Cruce integral de datos: obtiene los datos regionales del NOMIVAC para la provincia
 * y sustituye los valores `local: 0` con el cálculo de cobertura real de Salita Feliz,
 * calculando además insights y diferencias analíticas dinámicas.
 */
export async function getEpidemiologyComparisonData(
  provincia: string,
  cachedLocalCoverage?: Record<string, LocalCohortCoverage>
): Promise<RegionalCoverageItem[]> {
  const baseRegional = await getRegionalCoverageData(provincia);
  const localStats = cachedLocalCoverage || (await calculateSalitaFelizCoverage());

  return baseRegional.map((item) => {
    const stat = localStats[item.vacuna] || {
      local: 0,
      totalTargetPatients: 0,
      vaccinatedPatients: 0
    };

    const diff = stat.local - item.regional;
    let status: 'above' | 'below' | 'equal' = 'equal';
    let insight = `En paridad con la media de ${provincia} (${item.regional}%).`;

    if (diff > 0) {
      status = 'above';
      insight = `Supera la media de ${provincia} por +${diff}% puntos porcentuales.`;
    } else if (diff < 0) {
      status = 'below';
      insight = `Se ubica ${Math.abs(diff)}% por debajo del promedio de ${provincia}.`;
    }

    return {
      ...item,
      local: stat.local,
      totalTargetPatients: stat.totalTargetPatients,
      vaccinatedPatients: stat.vaccinatedPatients,
      difference: diff,
      status,
      insight,
      sourcePeriod: item.sourcePeriod
    };
  });
}
