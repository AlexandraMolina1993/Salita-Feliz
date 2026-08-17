//app/dashboard/vacunas/[id]/editar/page.tsx
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
import { getVaccineStockByIdAction, updateVaccineAction, type ExtendedVaccineItem, type UpdateVaccineInput } from "@/app/actions/vaccines"

export default function EditVaccinePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [vaccine, setVaccine] = useState<ExtendedVaccineItem | null>(null)

  useEffect(() => {
    if (params.id) {
      loadVaccine(params.id as string)
    }
  }, [params.id])

  const loadVaccine = async (id: string) => {
    try {
      setLoading(true)
      const data = await getVaccineStockByIdAction(id)
      if (!data) {
        toast({
          title: "Error",
          description: "Vacuna no encontrada en el inventario",
          variant: "destructive",
        })
        router.push("/dashboard/vacunas")
        return
      }
      setVaccine(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la vacuna",
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

    const rawExp = formData.get("expiration-date") as string;
    const expirationDate = rawExp ? (rawExp.includes("T") ? rawExp : `${rawExp}T12:00:00.000Z`) : null;

    const vaccineData: UpdateVaccineInput = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      manufacturer: formData.get("manufacturer") as string,
      supplier: formData.get("supplier") as string,
      administration_route: formData.get("administration-route") as string,
      net_content: Number(formData.get("net_content")) || vaccine?.net_content || 5.0,
      lot_number: formData.get("lot-number") as string,
      stock_quantity: Number(formData.get("stock-quantity")), // Cantidad deseada de viales físicos
      min_stock_level: Number(formData.get("min-stock-level")),
      expiration_date: expirationDate,
      storage_temperature: formData.get("storage-temperature") as string,
    }

    try {
      await updateVaccineAction(params.id as string, vaccineData)
      toast({
        title: "Vacuna actualizada",
        description: "Los datos y el balance de inventario han sido actualizados correctamente.",
      })
      router.push(`/dashboard/vacunas/${params.id}`)
    } catch (error) {
      console.error("Error al guardar vacuna:", error)
      toast({
        title: "Error al actualizar",
        description: error instanceof Error ? error.message : "No se pudo actualizar la vacuna",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-500 font-medium animate-pulse">Cargando datos técnicos y balance de stock...</p>
        </div>
      </div>
    )
  }

  if (!vaccine) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-semibold text-slate-700">Vacuna no encontrada</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard/vacunas")}>Volver a Vacunas</Button>
      </div>
    )
  }

  const formattedExpDate = vaccine.expiration_date 
    ? vaccine.expiration_date.split('T')[0] 
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/vacunas/${vaccine.id}`)}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editar Vacuna</h1>
            <p className="text-muted-foreground">Modificar los datos y stock de {vaccine.name}</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
              <CardDescription>Datos principales y ficha técnica de la vacuna</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Vacuna</Label>
                <Input id="name" name="name" defaultValue={vaccine.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select name="type" defaultValue={vaccine.type || "General"}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Seleccione el tipo" />
                  </SelectTrigger>
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
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Laboratorio</Label>
                <Input id="manufacturer" name="manufacturer" defaultValue={vaccine.manufacturer || vaccine.laboratory || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor / Organismo</Label>
                <Input id="supplier" name="supplier" defaultValue={vaccine.supplier || ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="administration-route">Vía Administración</Label>
                  <Select name="administration-route" defaultValue={vaccine.administration_route || "Intramuscular (IM)"}>
                    <SelectTrigger id="administration-route"><SelectValue placeholder="Elegir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Intramuscular (IM)">Intramuscular (IM)</SelectItem>
                      <SelectItem value="Subcutánea (SC)">Subcutánea (SC)</SelectItem>
                      <SelectItem value="Intradérmica">Intradérmica</SelectItem>
                      <SelectItem value="Oral">Oral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="net_content">Contenido Neto (ml)</Label>
                  <Input id="net_content" name="net_content" type="number" step="0.1" defaultValue={vaccine.net_content ?? 5.0} />
                </div>
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
              <CardDescription>Control de stock en viales y almacenamiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stock-quantity">Cantidad de Viales (Físicos)</Label>
                  <Input
                    id="stock-quantity"
                    name="stock-quantity"
                    type="number"
                    min="0"
                    defaultValue={vaccine.physical_vials ?? vaccine.current_stock_vials ?? vaccine.stock_quantity ?? 0}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Los cambios de cantidad se registran como ajuste en el Ledger (stock_movements).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-stock-level">Stock Mínimo (Viales)</Label>
                  <Input
                    id="min-stock-level"
                    name="min-stock-level"
                    type="number"
                    min="1"
                    defaultValue={vaccine.min_stock_level ?? 10}
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
                  defaultValue={formattedExpDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage-temperature">Temperatura de Almacenamiento</Label>
                <Select name="storage-temperature" defaultValue={vaccine.storage_temperature || "2°C a 8°C"}>
                  <SelectTrigger id="storage-temperature">
                    <SelectValue placeholder="Seleccione la temperatura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2°C a 8°C">2°C a 8°C (Refrigerador)</SelectItem>
                    <SelectItem value="-15°C a -25°C">-15°C a -25°C (Congelador)</SelectItem>
                    <SelectItem value="-60°C a -80°C">-60°C a -80°C (Ultra congelador)</SelectItem>
                    <SelectItem value="2-8c">2°C a 8°C (Alternativo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <Button variant="outline" type="button" onClick={() => router.push(`/dashboard/vacunas/${vaccine.id}`)} disabled={isLoading}>
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
