// lib/supabase.ts


// Database types


export interface UserProfile {
    id: string;
    email: string;
    role: string;
    full_name: string; // Columna de la tabla 'users'
    phone: string;
    is_active: boolean;
    center_id: string | null; // Debe aceptar null si la DB lo permite
    created_at?: string;
    updated_at?: string;
}

export interface admin_profiles {
    // Campos de la base de datos
    id: string; // La clave primaria (usaremos el email para simplificar)
    email: string;
    role: string;
    name: string;
    idNumber: string;
    phone: string;
    address: string;
    birthDate: string;
    gender: string;
    hireDate: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    created_at: string; // Lo dejamos, aunque no se use en el formulario
}

export interface Patient {
  id?: string
  full_name: string
  dni: string
  birth_date: string
  gender?: string
  address?: string
  phone?: string
  email?: string
  emergency_contact?: string
  emergency_phone?: string
  blood_type?: string
  allergies?: string
  medical_conditions?: string
  health_insurance?: string
  insurance_number?: string
  notes?: string
  created_at?: string
  updated_at?: string
  is_active?: boolean
}

export interface Nurse {
  id?: string
  full_name: string
  license_number: string
  specialty?: string
  phone?: string
  email?: string
  hire_date?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
  center_id: string
  user_id: string | null
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  start_date?:string
  image_url?:string
  birth_date: string
  dni: string | null
}

export interface Vaccine {
  id?: string
  name: string
  type?: string
  manufacturer?: string
  lot_number?: string
  expiration_date?: string
  stock_quantity: number
  min_stock_level: number
  storage_temperature?: string
  price?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface Appointment {
  id?: string
  patient_id: string
  vaccine_id: string
  nurse_id?: string
  appointment_date: string
  appointment_time: string
  status: string
  notes?: string
  vaccination_date?: string
  side_effects?: string
  created_at?: string
  updated_at?: string
  patients?: Patient
  vaccines?: Vaccine
  nurses?: Nurse
}

export interface VaccinationRecord {
  id?: string
  patient_id: string
  vaccine_id: string
  nurse_id?: string
  appointment_id?: string
  vaccination_date: string
  dose_number?: number
  lot_number?: string
  expiration_date?: string
  site_of_injection?: string
  side_effects?: string
  notes?: string
  created_at?: string
  updated_at?: string
  patients?: Patient
  vaccines?: Vaccine
  nurses?: Nurse
}

export interface Notification {
  id?: string
  title: string
  message: string
  type?: string
  recipient_type?: string
  recipient_id?: string
  is_read?: boolean
  scheduled_for?: string
  sent_at?: string
  created_at?: string
  updated_at?: string
}

export interface SystemConfig {
  id?: string
  key: string
  value?: string
  description?: string
  category?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}
export interface replenishment_schedules {
  id?: string
  vaccine_id: string
  scheduled_date: string // Fecha en que se espera recibir el pedido
  quantity_to_order: number
  notes?: string
  status: 'pending' | 'ordered' | 'received' | 'cancelled' // Tipo de estado más probable
  created_at?: string 
  updated_at?: string
}
export interface IncidentReport {
    id: string;
    vaccine_id: string; 
    incident_type: IncidentType;
    description: string;
    reported_by: string;
    created_at: string; // Usamos created_at para la marca de tiempo
    quantity_affected: number | null;
    status: IncidentStatus;
}
// Define la estructura completa de tu base de datos para tipar el cliente.
export type IncidentType = 'damage' | 'cold_chain_failure' | 'stock_error' | 'other';
export type IncidentStatus = 'new' | 'in_review' | 'resolved';
export type Database = {
  public: {
    Tables: {
      users: { // Si tu tabla de perfiles de administrador es 'users'
                Row: UserProfile; 
                Insert: Omit<UserProfile, "id" | "created_at" | "updated_at">;
                Update: Partial<Omit<UserProfile, "id" | "created_at" | "updated_at">>;
            };
            admin_profiles: { // Si tienes una tabla separada 'admin_profiles'
                Row: admin_profiles;
                Insert: Omit<admin_profiles, "id" | "created_at">;
                Update: Partial<Omit<admin_profiles, "id" | "created_at">>;
            };
      patients: {
        Row: Patient;
        Insert: Omit<Patient, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Patient, "id" | "created_at" | "updated_at">>;
      };
      nurses: {
        Row: Nurse;
        Insert: Omit<Nurse, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Nurse, "id" | "created_at" | "updated_at">>;
      };
      vaccines: {
        Row: Vaccine;
        Insert: Omit<Vaccine, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Vaccine, "id" | "created_at" | "updated_at">>;
      };
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Appointment, "id" | "created_at" | "updated_at">>;
      };
      vaccination_records: {
        Row: VaccinationRecord;
        Insert: Omit<VaccinationRecord, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<VaccinationRecord, "id" | "created_at" | "updated_at">>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Notification, "id" | "created_at" | "updated_at">>;
      };
      system_config: {
        Row: SystemConfig;
        Insert: Omit<SystemConfig, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SystemConfig, "id" | "created_at" | "updated_at">>;
      };
      replenishment_schedules: {
        Row: replenishment_schedules;
        Insert: Omit<replenishment_schedules, "id" | "created_at" | "updated_at" | "status"> & { 
            status?: 'pending' | 'ordered' | 'received' | 'cancelled' 
        };
        Update: Partial<Omit<replenishment_schedules, "id" | "created_at" | "updated_at">>;
      }
    };
  };
};
// Lee las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// ...
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

if (!supabaseUrl || !supabaseAnonKey) {
  // En Next.js (Client Components), si esto falla,
  // significa que las variables .env no se cargaron o no tienen el prefijo NEXT_PUBLIC_.
  throw new Error('Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

// Inicializa y exporta el cliente de Supabase tipado para usarlo en el cliente (Browser)
export const supabase: TypedSupabaseClient = createClient<Database>(
  supabaseUrl, // Usando la variable LEÍDA
  supabaseAnonKey // Usando la variable LEÍDA
);