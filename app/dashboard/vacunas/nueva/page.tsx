// app/dashboard/vacunas/nuevo/page.tsx
"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save } from "lucide-react"
import { createVaccine, type Vaccine } from "@/lib/database"

export default function NewVaccinePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    
    // **ESTA ES LA CORRECCIÓN CLAVE**
    const expirationDateInput = formData.get("expiration-date") as string;
    let expirationDateISO = null;

    if (expirationDateInput) {
      // 1. Convertir la cadena 'YYYY-MM-DD' a un objeto Date.
      // Esto establece la fecha a la medianoche del día local.
      const date = new Date(expirationDateInput);
      
      // 2. Convertir ese objeto Date a una cadena ISO.
      // Esto crea una representación de la fecha en formato UTC que Supabase entenderá correctamente.
      expirationDateISO = date.toISOString();
    }

    const vaccineData: Omit<Vaccine, "id" | "created_at" | "updated_at"> = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      manufacturer: formData.get("manufacturer") as string,
      stock_quantity: Number(formData.get("stock-quantity")),
      min_stock_level: Number(formData.get("min-stock-level")),
      expiration_date: expirationDateISO, // Usar la fecha convertida
      lot_number: formData.get("lot-number") as string,
      storage_temperature: formData.get("storage-temperature") as string,
    }

    try {
      await createVaccine(vaccineData)
      toast({
        title: "Vacuna registrada",
        description: "La vacuna ha sido registrada correctamente",
      })
      router.push("/dashboard/vacunas")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la vacuna",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/vacunas")}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nueva Vacuna</h1>
            <p className="text-muted-foreground">Registre una nueva vacuna en el inventario</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>Datos principales de la vacuna</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Vacuna</Label>
                <Input id="name" name="name" placeholder="Ej: Escriba aqui el nombre de la Vacuna" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select name="type">
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Seleccione el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gripe">Gripe</SelectItem>
                    <SelectItem value="Hepatitis B">Hepatitis B</SelectItem>
                    <SelectItem value="Tétanos y difteria (Td)">Tétanos y difteria (Td)</SelectItem>
                    <SelectItem value="Tosferina (Tdpa)">Tosferina (Tdpa)</SelectItem>
                    <SelectItem value="Triple vírica (SRP)">Triple vírica (SRP)</SelectItem>
                    <SelectItem value="Varicela">Varicela</SelectItem>
                    <SelectItem value="COVID-19">COVID-19</SelectItem>
                    <SelectItem value="Vacuna contra el VPH">Vacuna contra el VPH</SelectItem>
                    <SelectItem value="Dengue">Dengue</SelectItem>
                    <SelectItem value="Metodo Anticonceptivo">Metodo Anticonceptivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Laboratorio</Label>
                <Input id="manufacturer" name="manufacturer" placeholder="Nombre del laboratorio fabricante" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot-number">Lote</Label>
                <Input id="lot-number" name="lot-number" placeholder="Número de lote del fabricante" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Inventario</CardTitle>
              <CardDescription>Control de stock y almacenamiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stock-quantity">Cantidad Inicial</Label>
                  <Input id="stock-quantity" name="stock-quantity" type="number" min="0" placeholder="0" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-stock-level">Stock Mínimo</Label>
                  <Input id="min-stock-level" name="min-stock-level" type="number" min="1" placeholder="10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiration-date">Fecha de Vencimiento</Label>
                <Input id="expiration-date" name="expiration-date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage-temperature">Temperatura de Almacenamiento</Label>
                <Select name="storage-temperature">
                  <SelectTrigger id="storage-temperature">
                    <SelectValue placeholder="Seleccione la temperatura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2-8c">2°C a 8°C (Refrigerador)</SelectItem>
                    <SelectItem value="-15-25c">-15°C a -25°C (Congelador)</SelectItem>
                    <SelectItem value="-60-80c">-60°C a -80°C (Ultra congelador)</SelectItem>
                    <SelectItem value="temperatura-ambiente">Temperatura ambiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/vacunas")} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "Guardando..." : "Guardar Vacuna"}
          </Button>
        </div>
      </form>
    </div>
  )
}