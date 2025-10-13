// ./app/dashboard/configuracion/general/page.tsx
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

// 🚨 Importa las funciones de Supabase (asegúrate de que estén correctas)
import { getConfigByCategory, updateConfig } from '@/lib/database'; 

// Definimos los campos que vamos a usar y sus valores por defecto
interface GeneralSettings {
  nombre_del_centro: string;
  direccion: string;
  telefono: string;
  email_contacto: string;
  horario_atencion: string;
  idioma_sistema: string;
  modo_oscuro_activo: boolean;
}

// Valores iniciales (se sobrescribirán al cargar de Supabase)
const initialSettings: GeneralSettings = {
  nombre_del_centro: '',
  direccion: '',
  telefono: '',
  email_contacto: '',
  horario_atencion: '',
  idioma_sistema: 'es',
  modo_oscuro_activo: false,
};

export default function GeneralSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GeneralSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. LÓGICA DE CARGA (READ) ---
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const data = await getConfigByCategory('General'); 
        
        // Mapeamos los datos de Supabase al objeto de estado
        const newSettings: Partial<GeneralSettings> = {};
        data.forEach(item => {
            if (item.key === 'modo_oscuro_activo') {
                newSettings[item.key as keyof GeneralSettings] = item.value === 'true';
            } else {
                newSettings[item.key as keyof GeneralSettings] = item.value || '';
            }
        });

        setSettings(prev => ({ ...prev, ...newSettings }));

      } catch (error) {
        console.error("Error al cargar la configuración:", error);
        toast({
          title: "Error de Carga",
          description: "No se pudo cargar la configuración desde la base de datos.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);


  // Manejador genérico de cambios
  const handleChange = (key: keyof GeneralSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };


  // --- 2. LÓGICA DE GUARDADO (UPDATE) ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Preparamos el array de actualizaciones que Supabase necesita: [{key: "...", value: "..."}]
      const updates = Object.entries(settings).map(([key, value]) => ({
        key: key,
        value: typeof value === 'boolean' ? value.toString() : value,
        category: 'General' // Agregamos la categoría si la función updateConfig lo necesita, aunque se maneja con 'onConflict'
      }));

      await updateConfig(updates); // 🚨 LLAMADA A LA FUNCIÓN DE BASE DE DATOS

      toast({
        title: "Configuración guardada",
        description: "Los cambios han sido guardados correctamente.",
      });
      
    } catch (error) {
      console.error("Error al guardar la configuración:", error);
      toast({
        title: "Error al Guardar",
        description: "Hubo un problema al guardar los cambios en la base de datos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
        <Card className="mt-6">
            <CardHeader><CardTitle>Cargando...</CardTitle></CardHeader>
            <CardContent>Cargando configuración desde la base de datos...</CardContent>
        </Card>
    )
  }

  return (
    <form onSubmit={handleSaveSettings} className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
          <CardDescription>Configure los ajustes generales del sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nombre del Centro */}
          <div className="space-y-2">
            <Label htmlFor="center-name">Nombre del Centro</Label>
            <Input 
                id="center-name" 
                value={settings.nombre_del_centro} 
                onChange={(e) => handleChange('nombre_del_centro', e.target.value)} 
            />
          </div>
          
          {/* Dirección */}
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input 
                id="address" 
                value={settings.direccion} 
                onChange={(e) => handleChange('direccion', e.target.value)} 
            />
          </div>
          
          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input 
                id="phone" 
                value={settings.telefono} 
                onChange={(e) => handleChange('telefono', e.target.value)} 
            />
          </div>
          
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
                id="email" 
                type="email" 
                value={settings.email_contacto} 
                onChange={(e) => handleChange('email_contacto', e.target.value)} 
            />
          </div>
          
          {/* Horario de Atención */}
          <div className="space-y-2">
            <Label htmlFor="schedule">Horario de Atención</Label>
            <Textarea
              id="schedule"
              value={settings.horario_atencion}
              onChange={(e) => handleChange('horario_atencion', e.target.value)}
            />
          </div>
          
          {/* Idioma del Sistema */}
          <div className="space-y-2">
            <Label htmlFor="language">Idioma del Sistema</Label>
            <Select 
                value={settings.idioma_sistema} 
                onValueChange={(value) => handleChange('idioma_sistema', value)}
            >
              <SelectTrigger id="language">
                <SelectValue placeholder="Seleccione un idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">Inglés</SelectItem>
                <SelectItem value="pt">Portugués</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Modo Oscuro */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Modo Oscuro</Label>
              <p className="text-sm text-muted-foreground">Activar el modo oscuro en la interfaz</p>
            </div>
            <Switch 
                id="dark-mode" 
                checked={settings.modo_oscuro_activo}
                onCheckedChange={(checked) => handleChange('modo_oscuro_activo', checked)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="ml-auto" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}