"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package } from "lucide-react"
import type { Vaccine } from "@/lib/database"

interface VaccineStockAlertProps {
  vaccines: Vaccine[]
}

export function VaccineStockAlert({ vaccines }: VaccineStockAlertProps) {
  if (vaccines.length === 0) return null

  return (
    <Card className="modern-card border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-xl text-orange-800 flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Alerta de Stock Bajo
        </CardTitle>
        <CardDescription className="text-orange-700">
          Las siguientes vacunas requieren reposición urgente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {vaccines.map((vaccine) => (
            <div
              key={vaccine.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{vaccine.name}</p>
                  <p className="text-sm text-gray-600">{vaccine.manufacturer}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-orange-100 text-orange-800">{vaccine.stock_quantity} unidades</Badge>
                <p className="text-xs text-gray-500 mt-1">Mínimo: {vaccine.min_stock_level}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
