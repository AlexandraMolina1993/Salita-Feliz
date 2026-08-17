// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// ==========================================
// 🗂️ Database Types & Interfaces
// ==========================================

export interface UserProfile {
    id: string;
    email: string;
    role: string;
    full_name: string; 
    phone: string;
    is_active: boolean;
    center_id: string | null; 
    created_at?: string;
    updated_at?: string;
}

export interface admin_profiles {
    id: string; 
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
    created_at: string; 
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
  dose_amount: number
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
  dose_to_apply?: number;
  dose_applied?: number;
  deleted_at?: string | null;
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

// ✨ ACTUALIZADO: Refleja las columnas reales de tu base de datos actual
export interface SystemConfig {
  id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  nombre_del_centro: string;
  direccion: string;
  telefono: string;
  email_contacto: string;
  horario_atencion: string;
  idioma_sistema: string;
  modo_oscuro_activo: boolean; // Mapeado correctamente como booleano
  pais: string;
  provincia: string;
  ciudad: string;
}

export interface replenishment_schedules {
  id?: string
  vaccine_id: string
  scheduled_date: string 
  quantity_to_order: number
  notes?: string
  status: 'pending' | 'ordered' | 'received' | 'cancelled' 
  created_at?: string 
  updated_at?: string
}

export interface IncidentReport {
    id: string;
    vaccine_id: string; 
    incident_type: IncidentType;
    description: string;
    reported_by: string;
    created_at: string; 
    quantity_affected: number | null;
    status: IncidentStatus;
}

export type IncidentType = 'damage' | 'cold_chain_failure' | 'stock_error' | 'other';
export type IncidentStatus = 'new' | 'in_review' | 'resolved';

// ==========================================
// 🌐 Supabase Database Schema Schema
// ==========================================

export type Database = {
  public: {
    Tables: {
      incident_reports: {
        Row: IncidentReport;
        Insert: Omit<IncidentReport, "id" | "created_at" | "status"> & { 
            status?: IncidentStatus 
        };
        Update: Partial<Omit<IncidentReport, "id" | "created_at">>;
        Relationships: [];
      };
      users: { 
        Row: UserProfile; 
        Insert: Omit<UserProfile, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<UserProfile, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      admin_profiles: { 
        Row: admin_profiles;
        Insert: Omit<admin_profiles, "id" | "created_at">;
        Update: Partial<Omit<admin_profiles, "id" | "created_at">>;
        Relationships: [];
      };
      patients: {
        Row: Patient;
        Insert: Omit<Patient, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Patient, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      nurses: {
        Row: Nurse;
        Insert: Omit<Nurse, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Nurse, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      vaccines: {
        Row: Vaccine;
        Insert: Omit<Vaccine, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Vaccine, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Appointment, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      vaccination_records: {
        Row: VaccinationRecord;
        Insert: Omit<VaccinationRecord, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<VaccinationRecord, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Notification, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      system_config: {
        Row: SystemConfig;
        Insert: Omit<SystemConfig, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SystemConfig, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      replenishment_schedules: {
        Row: replenishment_schedules;
        Insert: Omit<replenishment_schedules, "id" | "created_at" | "updated_at" | "status"> & { 
            status?: 'pending' | 'ordered' | 'received' | 'cancelled' 
        };
        Update: Partial<Omit<replenishment_schedules, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          vaccine_id: string;
          appointment_id: string | null;
          type: 'ADJUSTMENT' | 'CONSUMPTION' | 'INCIDENT' | 'REPLENISHMENT';
          quantity_vials: number;
          description: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vaccine_id: string;
          appointment_id?: string | null;
          type: 'ADJUSTMENT' | 'CONSUMPTION' | 'INCIDENT' | 'REPLENISHMENT';
          quantity_vials: number;
          description: string;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          vaccine_id: string;
          appointment_id: string | null;
          type: 'ADJUSTMENT' | 'CONSUMPTION' | 'INCIDENT' | 'REPLENISHMENT';
          quantity_vials: number;
          description: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        }>;
        Relationships: [];
      };
      ai_notifications_log: {
        Row: {
          id: string;
          channel: 'TELEGRAM' | 'GMAIL';
          recipient: string;
          message: string;
          status: 'PENDING' | 'SENT' | 'FAILED';
          context: Record<string, unknown> | null;
          error_detail: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          channel: 'TELEGRAM' | 'GMAIL';
          recipient: string;
          message: string;
          status?: 'PENDING' | 'SENT' | 'FAILED';
          context?: Record<string, unknown> | null;
          error_detail?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: Partial<{
          id: string;
          channel: 'TELEGRAM' | 'GMAIL';
          recipient: string;
          message: string;
          status: 'PENDING' | 'SENT' | 'FAILED';
          context: Record<string, unknown> | null;
          error_detail: string | null;
          created_at: string;
          sent_at: string | null;
        }>;
        Relationships: [];
      };
    };
    Views: {
      v_vaccines_stock: {
        Row: {
          vaccine_id: string;
          name: string;
          laboratory: string | null;
          type: string | null;
          dose_amount: number;
          net_content: number;
          min_stock_level: number;
          is_active: boolean;
          expiration_date: string | null;
          current_stock_fraction: number;
          total_ml: number;
          physical_vials_for_repos: number;
          available_doses_for_clinic: number;
          current_stock_vials: number;
          current_stock_ml: number;
          stock_status: 'OPTIMAL' | 'CRITICAL_LOW' | 'OUT_OF_STOCK';
        };
      };
    };
    Functions: {
      process_appointment_completion: {
        Args: {
          p_appointment_id: string;
          p_dose_ml: number;
          p_nurse_id?: string | null;
          p_notes?: string | null;
          p_side_effects?: string | null;
          p_lot_number?: string | null;
          p_site_of_injection?: string | null;
        };
        Returns: {
          success: boolean;
          appointment_id: string;
          vaccine_id: string;
          vaccine_name: string;
          applied_dose_ml: number;
          fraction_consumed: number;
          vials_consumed: number;
          net_content_ml: number;
          remaining_stock_vials: number;
          movement_id: string;
          timestamp: string;
        };
      };
    };
  };
};

// ==========================================
// 🚀 Client Initialization (Singleton Pattern)
// ==========================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

// En el servidor (Node.js/API routes/Server Actions), usar service_role key si está disponible para acceso seguro al Ledger
const effectiveKey = (typeof window === 'undefined' && supabaseServiceKey) ? supabaseServiceKey : supabaseAnonKey;

// Exportación del cliente tipado de manera flexible
export const supabase = createClient<any>(supabaseUrl, effectiveKey);