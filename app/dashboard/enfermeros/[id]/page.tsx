// app/dashboard/enfermeros/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Edit, Phone, Mail, Award, Activity, Calendar, Users, Stethoscope, Loader2, Home, HeartHandshake, CalendarDays,User } from "lucide-react";
import {
  getNurseById,
  getNurseStats,
  getAssignedAppointments,
  getNursePatientHistory,
  getNursePerformanceReport,
  type Nurse,
} from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; 
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { es } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

// --- Interfaces ---

interface NurseStats {
  status: string;
  monthlyVaccines: number;
  totalVaccines: number;
}

interface PerformanceReport {
  totalPatients: number;
  totalVaccines: number;
  monthlyVaccines: number;
  todayVaccines: number;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  patients: {
    full_name: string;
  } | null;
  vaccines: {
    name: string;
  } | null;
}

interface VaccinationRecord {
  id: string;
  vaccination_date: string;
  vaccination_time: string; 
  patients: {
    full_name: string;
  } | null;
  vaccines: {
    name: string;
  } | null;
}

// --- Componente Principal ---

export default function NurseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [nurse, setNurse] = useState<Nurse | null>(null);
  const [stats, setStats] = useState<NurseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImageOpen, setIsImageOpen] = useState(false); 

  const [assignedAppointments, setAssignedAppointments] = useState<Appointment[]>([]);
  const [patientHistory, setPatientHistory] = useState<VaccinationRecord[]>([]);
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);

  useEffect(() => {
    if (params.id) {
      loadNurseData(params.id as string);
    }
  }, [params.id]);

  const loadNurseData = async (id: string) => {
    try {
      setLoading(true);
      const [
        nurseData,
        statsData,
        appointmentsData,
        historyData,
        performanceData,
      ] = await Promise.all([
        getNurseById(id),
        getNurseStats(id),
        getAssignedAppointments(id),
        getNursePatientHistory(id),
        getNursePerformanceReport(id),
      ]);

      if (!nurseData) {
        toast({
          title: "Error",
          description: "Enfermero no encontrado.",
          variant: "destructive",
        });
        setTimeout(() => router.push("/dashboard/enfermeros"), 100); 
        return;
      }

      setNurse(nurseData);
      setStats(statsData);
      setAssignedAppointments(appointmentsData);
      setPatientHistory(historyData);
      setPerformanceReport(performanceData);
    } catch (error) {
      console.error("Error al cargar datos del enfermero:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar los datos del enfermero.",
        variant: "destructive",
      });
      setTimeout(() => router.push("/dashboard/enfermeros"), 100);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (fullName?: string) => {
    if (!fullName) return "N/A";
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Función auxiliar para formatear la fecha de nacimiento sin desfasaje UTC
  const formatBirthDate = (dateStr?: string | null) => {
    if (!dateStr) return "No registrado";
    // dateStr viene como "YYYY-MM-DD"
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // --- Renderizado Condicional ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!nurse) {
    return (
      <div className="text-center py-12">
        <Stethoscope className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Enfermero no encontrado</h2>
        <p className="text-muted-foreground mb-6">El enfermero que busca no existe o ha sido eliminado.</p>
        <Button onClick={() => router.push("/dashboard/enfermeros")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Enfermeros
        </Button>
      </div>
    );
  }

  // --- Renderizado Principal ---
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/enfermeros")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detalles del Enfermero</h1>
            <p className="text-muted-foreground">Información completa de {nurse.full_name}</p>
          </div>
        </div>
        <Button asChild className="health-gradient">
          <Link href={`/dashboard/enfermeros/${nurse.id}/editar`}>
            <span>
              <Edit className="mr-2 h-4 w-4" />
              Editar Enfermero
            </span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Información Principal */}
        <Card className="md:col-span-2 card-hover">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-4">
              <div 
                className={`cursor-pointer transition-opacity ${nurse.image_url ? 'hover:opacity-80' : ''}`}
                onClick={() => {
                    if (nurse.image_url) {
                        setIsImageOpen(true);
                    }
                }}
              >
                <Avatar className="h-24 w-24 border-4 border-blue-200">
                  <AvatarImage 
                    src={nurse.image_url ?? undefined} 
                    alt={nurse.full_name} 
                  />
                  <AvatarFallback className="text-3xl font-bold bg-blue-100 text-blue-600">
                    {getInitials(nurse.full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">{nurse.full_name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={nurse.is_active ? "default" : "secondary"}>
                    <Activity className="mr-1 h-3 w-3" />
                    {nurse.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Información Personal (DNI y Fecha de Nacimiento) */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">DNI</p>
                  <p className="text-sm text-muted-foreground">{nurse.dni || "No registrado"}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Fecha de Nacimiento</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBirthDate(nurse.birth_date)}
                  </p>
                </div>
              </div>
            </div>

            {/* Información Profesional */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <Award className="mr-2 h-5 w-5 text-blue-500" />
                Información Profesional
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">Matrícula</p>
                  <p className="text-lg font-bold text-blue-600">{nurse.license_number}</p>
                </div>
                
                {nurse.start_date && (
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <p className="text-sm font-medium text-purple-800">Fecha de Ingreso</p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatInTimeZone(
                        new Date(nurse.start_date),
                        'America/Argentina/Cordoba',
                        'dd/MM/yyyy'
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Información de Contacto */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <Phone className="mr-2 h-5 w-5 text-primary" />
                Información de Contacto
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Teléfono</p>
                    <p className="text-sm text-muted-foreground">{nurse.phone || "No registrado"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{nurse.email || "No registrado"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Domicilio</p>
                    <p className="text-sm text-muted-foreground">{nurse.address || "No registrado"}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contacto de Emergencia */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <HeartHandshake className="mr-2 h-5 w-5 text-red-500" />
                Contacto de Emergencia
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nombre de Contacto</p>
                    <p className="text-sm text-muted-foreground">{nurse.emergency_contact_name || "No registrado"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Teléfono de Emergencia</p>
                    <p className="text-sm text-muted-foreground">{nurse.emergency_contact_phone || "No registrado"}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel Lateral */}
        <div className="space-y-6">
          {/* Estado y Estadísticas */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5 text-green-500" />
                Estado y Estadísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                <span className="text-sm font-medium text-green-800">Estado</span>
                <Badge variant={nurse.is_active ? "default" : "secondary"} className="bg-green-100 text-green-800">
                  {nurse.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats ? stats.monthlyVaccines : <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />}
                  </p>
                  <p className="text-xs text-blue-800">Vacunas este mes</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="text-2xl font-bold text-purple-600">
                    {stats ? stats.totalVaccines : <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600" />}
                  </p>
                  <p className="text-xs text-purple-800">Total aplicadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones Rápidas */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Calendar className="mr-2 h-4 w-4" />
                    Ver Turnos Asignados
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px]">
                  <DialogHeader>
                    <DialogTitle>Turnos Asignados</DialogTitle>
                    <DialogDescription>
                      Turnos próximos y pendientes asignados a {nurse.full_name}.
                    </DialogDescription>
                  </DialogHeader>
                  {assignedAppointments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Fecha y Hora</TableHead>
                          <TableHead>Vacuna</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignedAppointments.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell>{appointment.patients?.full_name}</TableCell>
                            <TableCell>
                              {formatInTimeZone(
                                new Date(appointment.appointment_date),
                                'America/Argentina/Cordoba',
                                'dd/MM/yyyy'
                              )} {appointment.appointment_time}
                            </TableCell>
                            <TableCell>
                              {appointment.vaccines?.name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  appointment.status === 'scheduled'
                                    ? 'secondary'
                                    : appointment.status === 'completed'
                                    ? 'default'
                                    : 'destructive'
                                  }
                              >
                                {appointment.status === 'scheduled'
                                  ? 'Programado'
                                  : appointment.status === 'completed'
                                  ? 'Completado'
                                  : 'Cancelado'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No hay turnos asignados.
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Users className="mr-2 h-4 w-4" />
                    Historial de Pacientes
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px]">
                  <DialogHeader>
                    <DialogTitle>Historial de Pacientes</DialogTitle>
                    <DialogDescription>
                      Historial de vacunas aplicadas por {nurse.full_name}.
                    </DialogDescription>
                  </DialogHeader>
                  {patientHistory.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Fecha de Vacunación</TableHead>
                          <TableHead>Vacuna</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientHistory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{record.patients?.full_name}</TableCell>
                            <TableCell>
                              {formatInTimeZone(
                                new Date(record.vaccination_date),
                                'America/Argentina/Cordoba',
                                'dd/MM/yyyy'
                              )} {record.vaccination_time}
                            </TableCell>
                            <TableCell>{record.vaccines?.name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No se encontraron registros de vacunación.
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Activity className="mr-2 h-4 w-4" />
                    Reporte de Rendimiento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Reporte de Rendimiento</DialogTitle>
                    <DialogDescription>
                      Estadísticas de rendimiento de {nurse.full_name}.
                    </DialogDescription>
                  </DialogHeader>
                  {performanceReport && (
                    <div className="grid gap-4 py-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Pacientes Únicos Atendidos:</span>
                        <Badge className="bg-primary text-white">{performanceReport.totalPatients}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Vacunas Totales Aplicadas:</span>
                        <Badge className="bg-primary text-white">{performanceReport.totalVaccines}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Vacunas Aplicadas este Mes:</span>
                        <Badge className="bg-primary text-white">{performanceReport.monthlyVaccines}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Vacunas Aplicadas hoy:</span>
                        <Badge className="bg-primary text-white">{performanceReport.todayVaccines}</Badge>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
      
       {/* MODAL DE VISUALIZACIÓN DE IMAGEN EN TAMAÑO REAL */}
      {nurse.image_url && (
        <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
          <DialogContent className="sm:max-w-4xl w-[90%] p-0 border-none bg-transparent shadow-none">
            <DialogHeader className="sr-only">
              <DialogTitle>Imagen de Perfil de {nurse.full_name}</DialogTitle>
            </DialogHeader>

            <div className="w-full h-full flex justify-center items-center">
              <img 
                src={nurse.image_url} 
                alt={`Foto de ${nurse.full_name}`} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}