"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { getVaccineById, updateVaccine, type Vaccine } from "@/lib/database"

export default function EditVaccinePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [vaccine, setVaccine] = useState<Vaccine | null>(null)

  useEffect(() => {
    if (params.id) {
      loadVaccine(params.id as string)
    }
  }, [params.id])

  const loadVaccine = async (id: string) => {
    try {
      const data = await getVaccineById(id)
      setVaccine(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la vacuna",
        variant: "destructive",
      })
      router.push("/dashboard/vacunas")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)

    const vaccineData: Partial<Vaccine> = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      manufacturer: formData.get("manufacturer") as string,
      stock_quantity: Number(formData.get("stock-quantity")),
      min_stock_level: Number(formData.get("min-stock-level")),
      expiration_date: formData.get("expiration-date") as string,
      lot_number: formData.get("lot-number") as string,
      storage_temperature: formData.get("storage-temperature") as string,
    }

    try {
      await updateVaccine(params.id as string, vaccineData)
      toast({
        title: "Vacuna actualizada",
        description: "Los datos de la vacuna han sido actualizados correctamente",
      })
      router.push("/dashboard/vacunas")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la vacuna",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!vaccine) {
    return (
      <div className="text-center">
        <p>Vacuna no encontrada</p>
        <Button onClick={() => router.push("/dashboard/vacunas")}>Volver a Vacunas</Button>
      </div>
    )
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
            <h1 className="text-3xl font-bold tracking-tight">Editar Vacuna</h1>
            <p className="text-muted-foreground">Modificar los datos de {vaccine.name}</p>
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
                <Input id="name" name="name" defaultValue={vaccine.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select name="type" defaultValue={vaccine.type || ""}>
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
                <Input id="manufacturer" name="manufacturer" defaultValue={vaccine.manufacturer || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot-number">Lote</Label>
                <Input id="lot-number" name="lot-number" defaultValue={vaccine.lot_number || ""} />
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
                  <Label htmlFor="stock-quantity">Cantidad Actual</Label>
                  <Input
                    id="stock-quantity"
                    name="stock-quantity"
                    type="number"
                    min="0"
                    defaultValue={vaccine.stock_quantity}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-stock-level">Stock Mínimo</Label>
                  <Input
                    id="min-stock-level"
                    name="min-stock-level"
                    type="number"
                    min="1"
                    defaultValue={vaccine.min_stock_level}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiration-date">Fecha de Vencimiento</Label>
                <Input
                  id="expiration-date"
                  name="expiration-date"
                  type="date"
                  defaultValue={vaccine.expiration_date || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage-temperature">Temperatura de Almacenamiento</Label>
                <Select name="storage-temperature" defaultValue={vaccine.storage_temperature || ""}>
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
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}
