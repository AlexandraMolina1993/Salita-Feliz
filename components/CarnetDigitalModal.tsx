"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Syringe,
  HeartPulse,
  Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { Appointment, Patient } from "@/lib/database";
import { formatNominalDate } from "@/lib/dateUtils";

interface CarnetDigitalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  appointments: Appointment[];
}

export function CarnetDigitalModal({
  open,
  onOpenChange,
  patient,
  appointments,
}: CarnetDigitalModalProps) {
  const [origin, setOrigin] = useState("");
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const verificationUrl = origin && patient.id ? `${origin}/verificar/${patient.id}` : "";

  // Filtrar solo las vacunas completadas (efectivamente aplicadas)
  const completedVaccines = appointments.filter((a) => a.status === "completed");

  const todayStr = new Date().toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Función para imprimir abriendo una ventana limpia optimizada para A4 / Impresora / PDF
  const handlePrint = () => {
    if (!printAreaRef.current) {
      window.print();
      return;
    }

    const printContents = printAreaRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=850,height=900");

    if (!printWindow) {
      // Si el navegador bloqueó la ventana emergente, fallback a window.print()
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Carnet de Vacunación - ${patient.full_name} - Salita Feliz</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 13px;
              line-height: 1.4;
            }
            .certificate-container {
              border: 2px solid #0284c7;
              border-radius: 12px;
              padding: 24px;
              background: #ffffff;
              max-width: 800px;
              margin: 0 auto;
            }
            .header-banner {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .header-titles h1 {
              font-size: 22px;
              font-weight: 800;
              color: #0369a1;
              margin: 0 0 4px 0;
            }
            .header-titles p {
              margin: 0;
              font-size: 12px;
              color: #64748b;
            }
            .badge-verified {
              background: #ecfdf5;
              border: 1px solid #10b981;
              color: #047857;
              padding: 6px 12px;
              border-radius: 9999px;
              font-weight: 700;
              font-size: 11px;
              text-align: right;
            }
            .patient-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 14px 18px;
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 22px;
            }
            .field-label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #64748b;
              font-weight: 600;
              margin-bottom: 2px;
            }
            .field-value {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
              font-size: 12px;
            }
            th {
              background: #f1f5f9;
              color: #334155;
              text-align: left;
              padding: 9px 10px;
              border-bottom: 2px solid #cbd5e1;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            td {
              padding: 9px 10px;
              border-bottom: 1px solid #e2e8f0;
              color: #1e293b;
            }
            tr:nth-child(even) {
              background: #f8fafc;
            }
            .lot-tag {
              font-family: monospace;
              font-weight: 700;
              background: #f1f5f9;
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid #e2e8f0;
            }
            .footer-section {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 2px solid #e2e8f0;
              padding-top: 18px;
              margin-top: 10px;
            }
            .qr-wrapper {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .qr-text {
              font-size: 11px;
              color: #475569;
              max-width: 320px;
            }
            .qr-text strong {
              color: #0f172a;
              display: block;
              margin-bottom: 3px;
              font-size: 12px;
            }
            .verification-url {
              font-family: monospace;
              font-size: 10px;
              color: #0284c7;
              word-break: break-all;
              margin-top: 3px;
            }
            .legal-stamp {
              text-align: right;
              font-size: 10px;
              color: #64748b;
              max-width: 250px;
            }
            .stamp-badge {
              display: inline-block;
              font-weight: 800;
              font-size: 10px;
              color: #0284c7;
              border: 1px dashed #0284c7;
              padding: 4px 8px;
              border-radius: 4px;
              margin-bottom: 4px;
            }
          </style>
        </head>
        <body>
          <div class="certificate-container">
            ${printContents}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border bg-card shadow-2xl">
        {/* Cabecera del Diálogo (no imprimible) */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/40 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
                  Carnet Digital Validado
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Documento clínico con trazabilidad oficial y código QR escaneable de validación.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              {verificationUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(verificationUrl, "_blank")}
                  className="text-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Verificación Pública
                </Button>
              )}
              <Button
                size="sm"
                onClick={handlePrint}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir / Guardar PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido Visual del Carnet (Previsualización y Modelo Imprimible) */}
        <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-950/50">
          <div
            ref={printAreaRef}
            className="bg-white dark:bg-slate-900 border-2 border-primary/20 dark:border-primary/30 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-900 dark:text-slate-100"
          >
            {/* Header Institucional */}
            <div className="header-banner flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="header-titles space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary text-white rounded-lg inline-block">
                    <HeartPulse className="h-5 w-5" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                    SALITA FELIZ
                  </h1>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Centro de Salud & Vacunatorio · Programa Oficial de Inmunización
                </p>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Carnet Oficial de Vacunación e Inmunización
                </h2>
              </div>

              <div className="text-left sm:text-right space-y-1 shrink-0">
                <div className="badge-verified inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  VALIDADO Y AUDITADO
                </div>
                <p className="text-[11px] text-slate-400">
                  Emisión: <span className="font-semibold text-slate-600 dark:text-slate-300">{todayStr}</span>
                </p>
                <p className="text-[10px] font-mono text-slate-400">
                  ID: SF-{patient.id?.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Ficha de Datos del Paciente */}
            <div className="patient-box bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="field-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Paciente
                </span>
                <span className="field-value text-sm font-bold text-slate-900 dark:text-white block truncate">
                  {patient.full_name}
                </span>
              </div>
              <div>
                <span className="field-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  DNI
                </span>
                <span className="field-value text-sm font-mono font-bold text-slate-800 dark:text-slate-200 block">
                  {patient.dni}
                </span>
              </div>
              <div>
                <span className="field-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nacimiento
                </span>
                <span className="field-value text-sm font-medium text-slate-700 dark:text-slate-300 block">
                  {formatNominalDate(patient.birth_date)}
                </span>
              </div>
              <div>
                <span className="field-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cobertura
                </span>
                <span className="field-value text-sm font-medium text-slate-700 dark:text-slate-300 block truncate">
                  {patient.health_insurance || "Particular"}
                </span>
              </div>
            </div>

            {/* Tabla de Vacunas Aplicadas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                  <Syringe className="h-4 w-4 text-emerald-600" />
                  Vacunas Aplicadas ({completedVaccines.length})
                </h3>
                <span className="text-xs text-muted-foreground">
                  Registro oficial de dosis completadas
                </span>
              </div>

              {completedVaccines.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-xl p-4 text-muted-foreground">
                  <p className="text-sm">El paciente no registra turnos de vacunación con estado "Aplicada" aún.</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Fecha Inoculación</th>
                        <th className="py-2.5 px-3">Denominación</th>
                        <th className="py-2.5 px-3">Laboratorio</th>
                        <th className="py-2.5 px-3">Lote</th>
                        <th className="py-2.5 px-3">Dosis</th>
                        <th className="py-2.5 px-3">Profesional Aplicador</th>
                        <th className="py-2.5 px-3 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {completedVaccines.map((item, idx) => {
                        const vaccineName =
                          item.vaccines?.name || item.vacuna?.name || "Vacuna General";
                        const manufacturer =
                          item.vaccines?.manufacturer || item.vacuna?.manufacturer || "Laboratorio Oficial";
                        const lotNumber =
                          item.vaccines?.lot_number || item.vacuna?.lot_number || "LOTE-REGISTRADO";
                        const dose =
                          item.dose_applied !== null && item.dose_applied !== undefined
                            ? `${item.dose_applied} ml`
                            : item.dose_to_apply !== null && item.dose_to_apply !== undefined
                            ? `${item.dose_to_apply} ml`
                            : item.vaccines?.dose_amount
                            ? `${item.vaccines.dose_amount} ml`
                            : "1 dosis";
                        const nurseName = item.nurses?.full_name || "Personal Sanitario";
                        const license = item.nurses?.license_number ? `(Mat. ${item.nurses.license_number})` : "";

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {formatNominalDate(item.appointment_date)}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                              {vaccineName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                              {manufacturer}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="lot-tag font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                {lotNumber}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {dose}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                              {nurseName} <span className="text-slate-400 font-mono text-[10px]">{license}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                                Aplicada
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pie del Carnet: Código QR Visible y Validación */}
            <div className="footer-section flex flex-col sm:flex-row items-center justify-between gap-5 border-t border-slate-200 dark:border-slate-800 pt-5">
              <div className="qr-wrapper flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                  {verificationUrl ? (
                    <QRCodeSVG
                      value={verificationUrl}
                      size={110}
                      level="H"
                      includeMargin={false}
                    />
                  ) : (
                    <div className="w-[110px] h-[110px] bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                      Generando QR...
                    </div>
                  )}
                </div>
                <div className="qr-text space-y-1">
                  <strong className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Validación Electrónica en Línea
                  </strong>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Escanee este código QR con cualquier dispositivo móvil para verificar la autenticidad e integridad del carnet en el servidor central.
                  </p>
                  <p className="verification-url text-[10px] font-mono text-primary break-all">
                    {verificationUrl || "https://salitafeliz.com/verificar/..."}
                  </p>
                </div>
              </div>

              <div className="legal-stamp text-center sm:text-right shrink-0 space-y-1">
                <div className="stamp-badge inline-block text-[10px] font-black text-primary border border-dashed border-primary px-2.5 py-1 rounded">
                  SELLO ELECTRÓNICO OFICIAL
                </div>
                <p className="text-[10px] text-slate-400 max-w-[220px]">
                  Documento emitido conforme a las normas de registro y trazabilidad de Salita Feliz.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer del Diálogo (no imprimible) */}
        <DialogFooter className="p-4 bg-muted/30 border-t flex flex-row items-center justify-between sm:justify-end gap-2 no-print">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Imprimir Carnet Digital
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
