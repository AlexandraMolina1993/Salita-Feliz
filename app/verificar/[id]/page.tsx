import { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Syringe,
  Calendar,
  User,
  Building2,
  FileCheck2,
  AlertCircle,
  Clock,
  HeartPulse,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatNominalDate } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificarPrintButton } from "@/components/VerificarPrintButton";

export const revalidate = 0; // Contenido dinámico en tiempo real

export const metadata: Metadata = {
  title: "Carnet de Vacunación Validado - Salita Feliz",
  description:
    "Verificación pública oficial de registro de vacunación del paciente en el Centro de Salud Salita Feliz.",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VerificarCarnetPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Obtener datos básicos del paciente
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, full_name, dni, birth_date, gender, health_insurance, insurance_number, blood_type, is_active")
    .eq("id", id)
    .maybeSingle();

  // 2. Obtener historial de turnos con estado 'completed' (vacunas efectivamente aplicadas)
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select(`
      id,
      appointment_date,
      appointment_time,
      status,
      dose_applied,
      dose_to_apply,
      notes,
      vacuna:vaccine_id(id, name, manufacturer, lot_number, dose_amount),
      vaccines:vaccine_id(id, name, manufacturer, lot_number, dose_amount),
      nurses:nurse_id(id, full_name, license_number, specialty)
    `)
    .eq("patient_id", id)
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("appointment_date", { ascending: true });

  const calculateAge = (birthDate?: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const verificationTimestamp = new Date().toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (patientError || !patient) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Carnet no encontrado
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              No se pudo verificar ningún registro oficial con el identificador proporcionado. Por favor, revise el código QR o consulte en recepción.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/"
              className="inline-flex items-center justify-center text-sm font-medium text-primary hover:underline"
            >
              Ir a Salita Feliz
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const age = calculateAge(patient.birth_date);
  const completedList = (appointments || []) as any[];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-200/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Barra superior de acciones (no imprimible) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Portal Público de Validación
              </p>
              <h2 className="text-base font-bold text-foreground">
                Salita Feliz · Sistema de Trazabilidad
              </h2>
            </div>
          </div>
          <VerificarPrintButton />
        </div>

        {/* Documento Principal Imprimible del Carnet */}
        <div id="carnet-digital-print-area" className="space-y-6">
          
          {/* Header Institucional de Validación */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold tracking-wide">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  REGISTRO OFICIAL AUDITADO Y VÁLIDO
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Carnet de Vacunación Validado - Salita Feliz
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                  Certificación electrónica de inmunizaciones emitido bajo estándares de trazabilidad clínica (Lote, Dosis, Laboratorio y Profesional Aplicador).
                </p>
              </div>

              <div className="shrink-0 flex md:flex-col items-end justify-between gap-2 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 text-right">
                <div className="text-left md:text-right">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Consulta en Vivo
                  </span>
                  <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 md:justify-end">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {verificationTimestamp}
                  </span>
                </div>
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 border-none px-3 py-1 text-xs shadow-sm">
                  Documento Auténtico
                </Badge>
              </div>
            </div>
          </div>

          {/* Tarjeta de Información del Paciente */}
          <Card className="rounded-3xl border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 py-4 px-6 sm:px-8">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Datos del Paciente Titular
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Nombre Completo
                  </span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {patient.full_name}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Documento Nacional (DNI)
                  </span>
                  <p className="text-lg font-mono font-bold text-slate-800 dark:text-slate-200">
                    {patient.dni}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Fecha de Nacimiento
                  </span>
                  <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                    {formatNominalDate(patient.birth_date)}
                    {age !== null && (
                      <span className="text-xs text-slate-500 ml-1.5 font-normal">
                        ({age} años)
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Cobertura Médica
                  </span>
                  <p className="text-base font-medium text-slate-700 dark:text-slate-300 truncate">
                    {patient.health_insurance || "Particular"}
                    {patient.insurance_number && (
                      <span className="block text-xs font-mono text-slate-500">
                        N°: {patient.insurance_number}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historial Cronológico de Vacunas Aplicadas */}
          <Card className="rounded-3xl border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 py-4 px-6 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Syringe className="h-5 w-5 text-emerald-600" />
                Historial de Vacunas Aplicadas ({completedList.length})
              </CardTitle>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Ordenado cronológicamente por fecha de inoculación
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {completedList.length === 0 ? (
                <div className="py-12 px-6 text-center space-y-3">
                  <Syringe className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                    No se registran vacunas con estado aplicado/completado
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Los turnos pendientes o cancelados no forman parte de este carnet oficial validado.
                  </p>
                </div>
              ) : (
                <>
                  {/* Vista Desktop / Tablet: Tabla Completa */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          <th className="py-3.5 px-6">Fecha Inoculación</th>
                          <th className="py-3.5 px-6">Denominación</th>
                          <th className="py-3.5 px-6">Laboratorio</th>
                          <th className="py-3.5 px-6">Lote</th>
                          <th className="py-3.5 px-6">Dosis</th>
                          <th className="py-3.5 px-6">Aplicador / Mat.</th>
                          <th className="py-3.5 px-6 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {completedList.map((rawItem: any, idx: number) => {
                          const vaccine = Array.isArray(rawItem.vaccines)
                            ? rawItem.vaccines[0]
                            : rawItem.vaccines || (Array.isArray(rawItem.vacuna) ? rawItem.vacuna[0] : rawItem.vacuna);
                          const nurse = Array.isArray(rawItem.nurses) ? rawItem.nurses[0] : rawItem.nurses;

                          const vaccineName = vaccine?.name || "Vacuna General";
                          const manufacturer = vaccine?.manufacturer || "Laboratorio Oficial";
                          const lotNumber = vaccine?.lot_number || rawItem.lot_number || "LOTE-REGISTRADO";
                          const dose =
                            rawItem.dose_applied !== null && rawItem.dose_applied !== undefined
                              ? `${rawItem.dose_applied} ml`
                              : rawItem.dose_to_apply !== null && rawItem.dose_to_apply !== undefined
                              ? `${rawItem.dose_to_apply} ml`
                              : vaccine?.dose_amount
                              ? `${vaccine.dose_amount} ml`
                              : "1 dosis";
                          const nurseName = nurse?.full_name || "Personal Sanitario";
                          const license = nurse?.license_number ? `(Mat. ${nurse.license_number})` : "";

                          return (
                            <tr
                              key={rawItem.id || idx}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <td className="py-4 px-6 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                                  <span>{formatNominalDate(rawItem.appointment_date)}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6 font-semibold text-slate-900 dark:text-slate-100">
                                {vaccineName}
                              </td>
                              <td className="py-4 px-6 text-slate-600 dark:text-slate-300">
                                {manufacturer}
                              </td>
                              <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  {lotNumber}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {dose}
                              </td>
                              <td className="py-4 px-6 text-slate-600 dark:text-slate-300">
                                <span className="font-medium text-slate-800 dark:text-slate-200 block">
                                  {nurseName}
                                </span>
                                {license && (
                                  <span className="text-xs text-slate-500 font-mono block">
                                    {license}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right whitespace-nowrap">
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs font-medium">
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Aplicada
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Vista Móvil: Tarjetas Cronológicas Responsivas */}
                  <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {completedList.map((rawItem: any, idx: number) => {
                      const vaccine = Array.isArray(rawItem.vaccines)
                        ? rawItem.vaccines[0]
                        : rawItem.vaccines || (Array.isArray(rawItem.vacuna) ? rawItem.vacuna[0] : rawItem.vacuna);
                      const nurse = Array.isArray(rawItem.nurses) ? rawItem.nurses[0] : rawItem.nurses;

                      const vaccineName = vaccine?.name || "Vacuna General";
                      const manufacturer = vaccine?.manufacturer || "Laboratorio Oficial";
                      const lotNumber = vaccine?.lot_number || rawItem.lot_number || "LOTE-REGISTRADO";
                      const dose =
                        rawItem.dose_applied !== null && rawItem.dose_applied !== undefined
                          ? `${rawItem.dose_applied} ml`
                          : rawItem.dose_to_apply !== null && rawItem.dose_to_apply !== undefined
                          ? `${rawItem.dose_to_apply} ml`
                          : vaccine?.dose_amount
                          ? `${vaccine.dose_amount} ml`
                          : "1 dosis";
                      const nurseName = nurse?.full_name || "Personal Sanitario";
                      const license = nurse?.license_number ? `Mat. ${nurse.license_number}` : "";

                      return (
                        <div key={rawItem.id || idx} className="p-5 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatNominalDate(rawItem.appointment_date)}
                              </span>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {vaccineName}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {manufacturer}
                              </p>
                            </div>
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs shrink-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Aplicada
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div>
                              <span className="text-slate-400 uppercase text-[10px] tracking-wider block font-semibold">
                                Lote
                              </span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {lotNumber}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 uppercase text-[10px] tracking-wider block font-semibold">
                                Dosis
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {dose}
                              </span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                              <span className="text-slate-400 uppercase text-[10px] tracking-wider block font-semibold">
                                Aplicador
                              </span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {nurseName} {license && `(${license})`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Sello de Autenticidad y Pie Institucional */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                <FileCheck2 className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Validez Digital Certificada
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  Este registro fue validado directamente desde la base de datos de Salita Feliz. Garantiza la autenticidad e integridad de las dosis suministradas.
                </p>
              </div>
            </div>

            <div className="text-center md:text-right shrink-0">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Identificador Seguro del Paciente
              </span>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700 inline-block mt-1">
                SF-PAC-{patient.id?.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>

        </div>

        {/* Footer no imprimible */}
        <footer className="text-center py-6 text-xs text-slate-500 space-y-1 no-print">
          <p>© {new Date().getFullYear()} Salita Feliz · Centro de Salud y Atención Primaria</p>
          <p>Documento de verificación emitido con fines informativos y de salud pública.</p>
        </footer>

      </div>
    </main>
  );
}
