// lib/actions.ts
'use server';

export {
    addVaccineStockAction,
    scheduleReplenishmentAction,
    reportVaccineIncidentAction,
    deleteReplenishmentScheduleAction,
    deleteVaccineIncidentAction,
    type AddStockInput,
    type ScheduleReplenishmentInput,
    type ReportIncidentInput,
} from '@/app/actions/vaccines';
