// En lib/types.ts

// Define la estructura para una cita
export interface appointments {
  id: string;
  patient_id: string;
  vaccine_id: string;
  nurse_id: string;
  appointment_date: string;
  status: 'completed' | 'cancelled' | 'scheduled';
  notes?: string;
  deleted_at?: string | null;
}

// Puedes añadir más interfaces aquí según tus necesidades (ej. Patient, Nurse, Vaccine)
// export interface Patient { ... }
// export interface Nurse { ... }
// export interface Vaccine { ... }