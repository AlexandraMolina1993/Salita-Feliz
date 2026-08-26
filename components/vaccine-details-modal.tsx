"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, AlertTriangle, Calendar, Building, Hash, Thermometer, DollarSign, Eye } from "lucide-react"
import Link from "next/link"
import type { Vaccine } from "@/lib/supabase"
import { formatNominalDate, parseLocalDate } from "@/lib/dateUtils"

interface VaccineDetailsModalProps {
  vaccines: Vaccine[]
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  type: "total" | "lowStock" | "expiringSoon" | "expired"
}

export function VaccineDetailsModal({ vaccines, isOpen, onClose, title, description, type }: VaccineDetailsModalProps) {
  const getStatusColor = (type: string) => {
    switch (type) {
      case "lowStock":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "expiringSoon":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "expired":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const getStatusIcon = (type: string) => {
    switch (type) {
      case "lowStock":
        return <AlertTriangle className="h-4 w-4" />
      case "expiringSoon":
        return <Calendar className="h-4 w-4" />
      case "expired":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const isExpired = (expirationDate: string) => {
    const today = new Date()
    const expDate = parseLocalDate(expirationDate)
    if (!expDate) return false
    return expDate < today
  }

  const isExpiringSoon = (expirationDate: string) => {
    const today = new Date()
    const expDate = parseLocalDate(expirationDate)
    if (!expDate) return false
    const diffTime = expDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 30 && diffDays > 0
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {getStatusIcon(type)}
            {title}
          </DialogTitle>
          <DialogDescription className="text-base">{description}</DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {vaccines.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay vacunas en esta categoría</h3>
              <p className="text-gray-500">No se encontraron vacunas que coincidan con los criterios seleccionados.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {vaccines.map((vaccine) => (
                <Card key={vaccine.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{vaccine.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{vaccine.manufacturer}</p>
                      </div>
                      <Badge className={getStatusColor(type)}>
                        {getStatusIcon(type)}
                        <span className="ml-1">
                          {type === "lowStock" && "Stock Bajo"}
                          {type === "expiringSoon" && "Por Vencer"}
                          {type === "expired" && "Vencida"}
                          {type === "total" && "Activa"}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Stock:</span>
                        <span
                          className={`font-medium ${vaccine.stock_quantity <= vaccine.min_stock_level ? "text-red-600" : "text-green-600"}`}
                        >
                          {vaccine.stock_quantity}
                        </span>
                      </div>

                      {vaccine.price && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Precio:</span>
                          <span className="font-medium text-blue-600">${vaccine.price}</span>
                        </div>
                      )}

                      {vaccine.lot_number && (
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Lote:</span>
                          <span className="font-mono text-xs">{vaccine.lot_number}</span>
                        </div>
                      )}

                      {vaccine.expiration_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Vence:</span>
                          <span
                            suppressHydrationWarning
                            className={`text-xs font-medium ${
                              isExpired(vaccine.expiration_date)
                                ? "text-red-600"
                                : isExpiringSoon(vaccine.expiration_date)
                                  ? "text-yellow-600"
                                  : "text-green-600"
                            }`}
                          >
                            {formatNominalDate(vaccine.expiration_date)}
                          </span>
                        </div>
                      )}

                      {vaccine.type && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Tipo:</span>
                          <span className="text-xs">{vaccine.type}</span>
                        </div>
                      )}

                      {vaccine.storage_temperature && (
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Temp:</span>
                          <span className="text-xs">{vaccine.storage_temperature}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t">
                      <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
                        <Link href={`/dashboard/vacunas/${vaccine.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles Completos
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
