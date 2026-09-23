"use client";

import { Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function VerificarPrintButton() {
  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Carnet de Vacunación Validado - Salita Feliz",
            text: "Consulta mi carnet de vacunación oficial en Salita Feliz",
            url,
          });
        } catch (err) {
          // Cancelled by user or not supported
        }
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Enlace de verificación copiado al portapapeles");
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 no-print">
      <Button
        onClick={handlePrint}
        variant="outline"
        className="flex items-center gap-2 border-slate-300 dark:border-slate-700 bg-background hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Printer className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        Imprimir / Guardar PDF
      </Button>
      <Button
        onClick={handleShare}
        variant="ghost"
        className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Share2 className="h-4 w-4" />
        Compartir Carnet
      </Button>
    </div>
  );
}
