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
    
    const expirationDateInput = formData.get("expiration-date") as string;
    let expirationDateISO = null;

    if (expirationDateInput) {
      const date = new Date(expirationDateInput);
      expirationDateISO = date.toISOString();
    }

    const vaccineData = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      manufacturer: formData.get("manufacturer") as string,
      stock_quantity: Number(formData.get("stock-quantity")),
      min_stock_level: Number(formData.get("min-stock-level")),
      expiration_date: expirationDateISO,
      lot_number: formData.get("lot-number") as string,
      storage_temperature: formData.get("storage-temperature") as string,
      administration_route: formData.get("administration-route") as string,
      dose_amount: formData.get("dose-amount") as string,
      supplier: formData.get("supplier") as string,
      net_content: formData.get("net_content") as string,
    }

    try {
      await createVaccine(vaccineData as any)
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
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/vacunas")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Vacuna</h1>
          <p className="text-muted-foreground">Registre una nueva vacuna en el inventario</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>Datos principales y técnicos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Vacuna</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select name="type" required>
                  <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gripe">Antigripal</SelectItem>
                    <SelectItem value="Hepatitis B">Hepatitis B</SelectItem>
                    <SelectItem value="Tétanos y difteria (Td)">Tétanos y difteria (Td)</SelectItem>
                    <SelectItem value="Tosferina (Tdpa)">Tosferina (Tdpa)</SelectItem>
                    <SelectItem value="Triple vírica (SRP)">Triple vírica (SRP)</SelectItem>
                    <SelectItem value="Varicela">Varicela</SelectItem>
                    <SelectItem value="COVID-19">COVID-19</SelectItem>
                    <SelectItem value="Doble Bacteriana">DT</SelectItem>
                    <SelectItem value="Dengue">Dengue</SelectItem>
                    <SelectItem value="Virus Papiloma Humano">VPH</SelectItem>
                    <SelectItem value="Contra la Tuberculosis">Tuberculosis</SelectItem>
                    <SelectItem value="Neumococo Conjugada">VCN</SelectItem>
                    <SelectItem value="Triple Bacteriana Celular">DTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="administration-route">Vía Administración</Label>
                  <Select name="administration-route">
                    <SelectTrigger><SelectValue placeholder="Elegir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intramuscular">Intramuscular (IM)</SelectItem>
                      <SelectItem value="subcutanea">Subcutánea (SC)</SelectItem>
                      <SelectItem value="Intradérmica">Intradérmica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="net_content">Contenido Neto(ml)</Label>
                  <Input id="net_content" name="net_content" placeholder="Ej: 0.5" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor / Organismo</Label>
                <Input id="supplier" name="supplier" placeholder="Ej: Ministerio de Salud" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Laboratorio</Label>
                <Input id="manufacturer" name="manufacturer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot-number">Lote</Label>
                <Input id="lot-number" name="lot-number" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stock-quantity">Cantidad Inicial</Label>
                  <Input id="stock-quantity" name="stock-quantity" type="number" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-stock-level">Stock Mínimo</Label>
                  <Input id="min-stock-level" name="min-stock-level" type="number" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiration-date">Fecha de Vencimiento</Label>
                <Input id="expiration-date" name="expiration-date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage-temperature">Temperatura de Almacenamiento</Label>
                <Select name="storage-temperature">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2-8c">2°C a 8°C (Refrigerador)</SelectItem>
                    <SelectItem value="-15-25c">-15°C a -25°C (Congelador)</SelectItem>
                    <SelectItem value="-60-80c">-60°C a -80°C (Ultra congelador)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Vacuna
          </Button>
        </div>
      </form>
    </div>
  )
}