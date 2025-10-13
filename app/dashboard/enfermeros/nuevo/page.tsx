// ./app/dashboard/enfermeros/nuevo/page.tsx
"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { createNurse, supabase } from "@/lib/database";
import { type Nurse } from "@/lib/supabase";

export default function NewNursePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        setFile(event.target.files[0]);
      }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsLoading(true);

      // 🚨 CORRECCIÓN CLAVE: Verificamos y casteamos event.target inmediatamente
      const form = event.target as HTMLFormElement;
      if (!form || !form.elements) {
          console.error("Error: El objeto de formulario (event.target) es inválido. Deteniendo handleSubmit.");
          setIsLoading(false);
          return;
      }
      // La línea donde fallaba (anteriormente formData = new FormData(event.currentTarget)) ya no existe aquí.

      let imageUrl = "";

     // 1. Lógica para subir la imagen a Supabase Storage
if (file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    // 🟢 CORRECCIÓN CLAVE: Eliminar la duplicación de 'avatars/'
    const filePath = fileName; // La ruta del archivo es solo el nombre

    try {
        const { error: uploadError } = await supabase.storage
            .from("avatars") 
            .upload(filePath, file); // Subirá el archivo a la raíz del bucket 'avatars'

        if (uploadError) {
            throw uploadError; 
        }
        
        // La URL pública ahora estará bien formada: .../public/avatars/[nombre.png]
        const publicUrlResponse = supabase.storage.from("avatars").getPublicUrl(filePath);
        imageUrl = publicUrlResponse.data.publicUrl;

    } catch (error) {
        console.error("Error al subir la imagen:", error);
        toast({
            title: "Error al subir la imagen",
            description: "No se pudo subir la foto del enfermero. Verifique permisos RLS en el bucket 'avatars'.",
            variant: "destructive",
        });
        setIsLoading(false);
        return; // Detiene el proceso
    }
}

      // 2. Extracción de datos del formulario usando FormData(form) (Seguro ahora)
      const formData = new FormData(form);
      const centerId = "b9f103b7-62af-4f20-a2bd-9ceabec991fe"; 

      const nurseData: Omit<Nurse, "id" | "created_at" | "updated_at"> = {
        full_name: formData.get("full_name") as string,
        license_number: formData.get("license_number") as string,
        
        phone: formData.get("phone") as string,
        email: formData.get("email") as string,
        address: formData.get("address") as string,
        emergency_contact_name: formData.get("emergency_contact_name") as string,
        emergency_contact_phone: formData.get("emergency_contact_phone") as string,
        start_date: formData.get("start_date") as string,
        birth_date: formData.get("birth_date") as string,
        dni: formData.get("dni") as string | null,
        
        // Campos fijos/derivados
        is_active: true,
        center_id: centerId,
        user_id: null,
        image_url: imageUrl, 
      };

      console.log("Datos a enviar:", nurseData);

      // 3. Intento de registro del enfermero
      try {
        await createNurse(nurseData);
        toast({
          title: "Enfermero registrado",
          description: "El enfermero ha sido registrado correctamente",
        });
        router.push("/dashboard/enfermeros");
      } catch (error) {
        // Esto captura el error de RLS de la base de datos
        console.error("Error al registrar enfermero:", error);
        const errorMsg = (error as any).message || "Ocurrió un error al intentar guardar los cambios.";
        
        // Mensaje específico para el caso probable de RLS o nulls.
        let displayMsg = errorMsg;
        if (errorMsg.includes("policy")) {
            displayMsg = "Fallo la política de seguridad (RLS). Verifique permisos de INSERT en la tabla 'nurses'.";
        }
        
        toast({
          title: "Error de Registro",
          description: `No se pudo registrar el enfermero: ${displayMsg}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/enfermeros")}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Nuevo Enfermero</h1>
              <p className="text-muted-foreground">Registre un nuevo enfermero en el sistema</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Enfermero</CardTitle>
                <CardDescription>
                  Introduzca la información del nuevo enfermero para agregarlo al sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                {/* Primera columna */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input id="full_name" name="full_name" placeholder="Ingrese el nombre completo" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                    <Input id="birth_date" name="birth_date" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI</Label>
                    <Input id="dni" name="dni" placeholder="Ingrese el DNI" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_number">Matrícula</Label>
                    <Input id="license_number" name="license_number" placeholder="Ej: ENF12345" required />
                  </div>
                  
                     
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Fecha de Ingreso</Label>
                    <Input id="start_date" name="start_date" type="date" required />
                  </div>
                  {/* Nuevo campo para la imagen */}
                  <div className="space-y-2">
                    <Label htmlFor="image">Foto de Perfil</Label>
                    <Input id="image" type="file" onChange={handleFileChange} />
                  </div>
                </div>
                {/* Segunda columna */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" name="phone" placeholder="Ingrese el número de teléfono" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="Ingrese el email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Domicilio</Label>
                    <Input id="address" name="address" placeholder="Ingrese el domicilio completo" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Nombre de Contacto de Emergencia</Label>
                    <Input id="emergency_contact_name" name="emergency_contact_name" placeholder="Ingrese el nombre del contacto" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Teléfono de Emergencia</Label>
                    <Input id="emergency_contact_phone" name="emergency_contact_phone" placeholder="Ingrese el teléfono de emergencia" required />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end space-x-4">
            <Button variant="outline" onClick={() => router.push("/dashboard/enfermeros")} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Guardando..." : "Guardar Enfermero"}
            </Button>
          </div>
        </form>
      </div>
    );
}