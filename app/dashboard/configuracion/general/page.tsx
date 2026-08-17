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
import { createClient } from '@supabase/supabase-js'

// 💡 NOTA: Si querés sacar la advertencia amarilla de "Multiple GoTrueClient instances",
// borrá estas 4 líneas de abajo e importá tu cliente global como: import { supabase } from '@/lib/supabase'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface GeneralSettings {
  nombre_del_centro: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  pais: string;
  telefono: string;
  email_contacto: string;
  horario_atencion: string;
  idioma_sistema: string;
  modo_oscuro_activo: boolean;
}

const initialSettings: GeneralSettings = {
  nombre_del_centro: '',
  direccion: '',
  ciudad: '',
  provincia: 'Córdoba',
  pais: 'Argentina',
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
  const [configId, setConfigId] = useState<string | null>(null);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('*')
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setConfigId(data.id);
          setSettings({
            nombre_del_centro: data.nombre_del_centro || '',
            direccion: data.direccion || '',
            ciudad: data.ciudad || '',
            provincia: data.provincia || 'Córdoba',
            pais: data.pais || 'Argentina',
            telefono: data.telefono || '',
            email_contacto: data.email_contacto || '',
            horario_atencion: data.horario_atencion || '',
            idioma_sistema: data.idioma_sistema || 'es',
            modo_oscuro_activo: !!data.modo_oscuro_activo,
          });
        }
      } catch (error) {
        console.error("Error al cargar la configuración:", error);
        toast({
          title: "Error de Carga",
          description: "No se pudo cargar la configuración regional.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleChange = (key: keyof GeneralSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // --- GUARDADO DE DATOS (UPSERT) ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('system_config')
        .upsert([
          {
            ...(configId ? { id: configId } : {}),
            nombre_del_centro: settings.nombre_del_centro,
            direccion: settings.direccion,
            ciudad: settings.ciudad,
            provincia: settings.provincia,
            pais: settings.pais,
            telefono: settings.telefono,
            email_contacto: settings.email_contacto,
            horario_atencion: settings.horario_atencion,
            idioma_sistema: settings.idioma_sistema,
            modo_oscuro_activo: settings.modo_oscuro_activo,
            is_active: true
          }
        ]);

      if (error) throw error;

      toast({
        title: "Configuración guardada",
        description: "Se actualizaron los datos geográficos del centro con éxito.",
      });

      if (!configId) {
        const { data } = await supabase.from('system_config').select('id').eq('is_active', true).maybeSingle();
        if (data?.id) setConfigId(data.id);
      }
      
    } catch (error) {
      console.error("Error al guardar la configuración:", error);
      toast({
        title: "Error al Guardar",
        description: "Hubo un problema al guardar la localización en la base de datos.",
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
            <CardContent>Cargando datos del centro de salud...</CardContent>
        </Card>
    )
  }

  return (
    <form onSubmit={handleSaveSettings} className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
          <CardDescription>Gestione la localización y datos del centro de vacunación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Nombre del Centro */}
          <div className="space-y-2">
            <Label htmlFor="center-name">Nombre del Centro</Label>
            <Input 
                id="center-name" 
                value={settings.nombre_del_centro || ''} 
                onChange={(e) => handleChange('nombre_del_centro', e.target.value)} 
                placeholder="Ej: Salita Feliz Centro"
            />
          </div>

          {/* Bloque de Ubicación Geográfica (3 columnas) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ciudad */}
            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input 
                  id="ciudad" 
                  value={settings.ciudad || ''} // 👈 Soluciona el error rojo de input no controlado
                  onChange={(e) => handleChange('ciudad', e.target.value)} 
                  placeholder="Ej: Villa del Rosario"
              />
            </div>

            {/* Provincia */}
            <div className="space-y-2">
              <Label htmlFor="provincia">Provincia</Label>
              <Input 
                  id="provincia" 
                  value={settings.provincia || ''} // 👈 Evita que sea undefined
                  onChange={(e) => handleChange('provincia', e.target.value)} 
                  placeholder="Ej: Córdoba"
              />
            </div>

            {/* País */}
            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Input 
                  id="pais" 
                  value={settings.pais || ''} // 👈 Evita que sea undefined
                  onChange={(e) => handleChange('pais', e.target.value)} 
                  placeholder="Ej: Argentina"
              />
            </div>
          </div>
          
          {/* Dirección */}
          <div className="space-y-2">
            <Label htmlFor="address">Dirección de la Sede</Label>
            <Input 
                id="address" 
                value={settings.direccion || ''} 
                onChange={(e) => handleChange('direccion', e.target.value)} 
                placeholder="Ej: Av. San Martín 123"
              />
          </div>
          
          {/* Teléfono y Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono de Guardia</Label>
              <Input 
                  id="phone" 
                  value={settings.telefono || ''} 
                  onChange={(e) => handleChange('telefono', e.target.value)} 
                  placeholder="Ej: +54 3573 42..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Institucional</Label>
              <Input 
                  id="email" 
                  type="email" 
                  value={settings.email_contacto || ''} 
                  onChange={(e) => handleChange('email_contacto', e.target.value)} 
                  placeholder="Ej: contacto@salitafeliz.com"
              />
            </div>
          </div>
          
          {/* Horario de Atención */}
          <div className="space-y-2">
            <Label htmlFor="schedule">Horario de Atención</Label>
            <Textarea
              id="schedule"
              value={settings.horario_atencion || ''}
              onChange={(e) => handleChange('horario_atencion', e.target.value)}
              placeholder="Ej: Lunes a Viernes de 08:00 a 20:00"
            />
          </div>
          
          {/* Idioma del Sistema */}
          <div className="space-y-2">
            <Label htmlFor="language">Idioma del Sistema</Label>
            <Select 
                value={settings.idioma_sistema || 'es'} 
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