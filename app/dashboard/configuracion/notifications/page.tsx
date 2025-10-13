// ./app/dashboard/configuracion/notifications/page.tsx
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

// 🚨 Importa las funciones de Supabase
import { getConfigByCategory, updateConfig } from '@/lib/database';

interface NotificationSettings {
    // Email/SMTP
    email_notifications_active: boolean;
    email_smtp_server: string;
    email_smtp_user: string;
    email_smtp_password: string;

    // SMS/API
    sms_notifications_active: boolean;
    sms_provider: string;
    sms_api_key: string;

    // Recordatorios
    appointment_reminders_active: boolean;
    reminder_time_hours: string; 
}

const initialSettings: NotificationSettings = {
    email_notifications_active: true,
    email_smtp_server: '',
    email_smtp_user: '',
    email_smtp_password: '',
    sms_notifications_active: false,
    sms_provider: 'twilio',
    sms_api_key: '',
    appointment_reminders_active: true,
    reminder_time_hours: '24',
};


export default function NotificationsSettingsPage() {
    const { toast } = useToast()
    const [settings, setSettings] = useState<NotificationSettings>(initialSettings);
    const [isLoading, setIsLoading] = useState(true);

    // --- LÓGICA DE CARGA (READ) ---
    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const data = await getConfigByCategory('Notificaciones'); 
                
                const newSettings: Partial<NotificationSettings> = {};
                data.forEach(item => {
                    if (item.key in initialSettings) {
                        // Manejo de booleanos
                        newSettings[item.key as keyof NotificationSettings] = (
                            typeof initialSettings[item.key as keyof NotificationSettings] === 'boolean'
                            ? item.value === 'true' 
                            : item.value || ''
                        ) as any;
                    }
                });

                setSettings(prev => ({ ...prev, ...newSettings }));
            } catch (error) {
                console.error("Error al cargar la configuración de Notificaciones:", error);
                toast({ title: "Error de Carga", description: "No se pudo cargar la configuración de notificaciones.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    // Manejador de cambios (para inputs y switches)
    const handleChange = (key: keyof NotificationSettings, value: string | boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // --- LÓGICA DE GUARDADO (UPDATE) ---
    const handleSaveNotifications = async () => {
        setIsLoading(true);

        try {
            // Preparamos el array de actualizaciones
            const updates = Object.entries(settings).map(([key, value]) => ({
                key: key,
                value: typeof value === 'boolean' ? value.toString() : value,
                category: 'Notificaciones'
            }));

            await updateConfig(updates); // 🚨 LLAMADA A LA FUNCIÓN DE BASE DE DATOS

            toast({ title: "Configuración de Notificaciones guardada", description: "Los ajustes de notificaciones han sido guardados" });
            
        } catch (error) {
            console.error("Error al guardar la configuración de Notificaciones:", error);
            toast({ title: "Error al Guardar", description: "Hubo un problema al guardar los ajustes de notificaciones.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configuración de Notificaciones</CardTitle>
                    <CardDescription>Configure las preferencias de notificaciones del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {/* Canales de Notificación */}
                    <div className="space-y-2">
                        <Label>EMAIL</Label>
                        <div className="space-y-4 rounded-md border p-4">
                            
                            {/* Notificaciones por Email Switch */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="email-notifications">Notificaciones por Email</Label>
                                    <p className="text-sm text-muted-foreground">Enviar notificaciones por correo electrónico</p>
                                </div>
                                <Switch 
                                    id="email-notifications" 
                                    checked={settings.email_notifications_active} 
                                    onCheckedChange={(checked) => handleChange('email_notifications_active', checked)}
                                />
                            </div>
                            
                            {/* Servidor SMTP */}
                            <div className="space-y-2">
                                <Label htmlFor="email-server">Servidor SMTP</Label>
                                <Input 
                                    id="email-server" 
                                    value={settings.email_smtp_server} 
                                    onChange={(e) => handleChange('email_smtp_server', e.target.value)} 
                                    disabled={!settings.email_notifications_active}
                                />
                            </div>
                            
                            {/* Usuario y Contraseña SMTP */}
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="email-user">Usuario SMTP</Label>
                                    <Input 
                                        id="email-user" 
                                        value={settings.email_smtp_user} 
                                        onChange={(e) => handleChange('email_smtp_user', e.target.value)}
                                        disabled={!settings.email_notifications_active} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email-password">Contraseña SMTP</Label>
                                    <Input 
                                        id="email-password" 
                                        type="password" 
                                        value={settings.email_smtp_password} 
                                        onChange={(e) => handleChange('email_smtp_password', e.target.value)}
                                        disabled={!settings.email_notifications_active}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Configuración de SMS */}
                    <div className="space-y-2">
                        <Label>SMS</Label>
                        <div className="space-y-4 rounded-md border p-4">
                            
                            {/* Notificaciones por SMS Switch */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="sms-notifications">Notificaciones por SMS</Label>
                                    <p className="text-sm text-muted-foreground">Enviar notificaciones por mensaje de texto</p>
                                </div>
                                <Switch 
                                    id="sms-notifications" 
                                    checked={settings.sms_notifications_active} 
                                    onCheckedChange={(checked) => handleChange('sms_notifications_active', checked)}
                                />
                            </div>
                            
                            {/* Proveedor de SMS */}
                            <div className="space-y-2">
                                <Label htmlFor="sms-provider">Proveedor de SMS</Label>
                                <Select 
                                    value={settings.sms_provider}
                                    onValueChange={(value) => handleChange('sms_provider', value)}
                                    disabled={!settings.sms_notifications_active}
                                >
                                    <SelectTrigger id="sms-provider">
                                        <SelectValue placeholder="Seleccione un proveedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="twilio">Twilio</SelectItem>
                                        <SelectItem value="nexmo">Nexmo</SelectItem>
                                        <SelectItem value="aws">AWS SNS</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {/* API Key */}
                            <div className="space-y-2">
                                <Label htmlFor="sms-api-key">API Key</Label>
                                <Input 
                                    id="sms-api-key" 
                                    placeholder="Ingrese su API Key" 
                                    value={settings.sms_api_key} 
                                    onChange={(e) => handleChange('sms_api_key', e.target.value)}
                                    disabled={!settings.sms_notifications_active}
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Recordatorios Automáticos */}
                    <div className="space-y-2">
                        <Label>Recordatorios Automáticos</Label>
                        <div className="space-y-4 rounded-md border p-4">
                            
                            {/* Recordatorios de Turnos Switch */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="appointment-reminders">Recordatorios de Turnos</Label>
                                    <p className="text-sm text-muted-foreground">Enviar recordatorios automáticos de turnos</p>
                                </div>
                                <Switch 
                                    id="appointment-reminders" 
                                    checked={settings.appointment_reminders_active} 
                                    onCheckedChange={(checked) => handleChange('appointment_reminders_active', checked)}
                                />
                            </div>
                            
                            {/* Tiempo de Anticipación */}
                            <div className="space-y-2">
                                <Label htmlFor="reminder-time">Tiempo de Anticipación</Label>
                                <Select 
                                    value={settings.reminder_time_hours} 
                                    onValueChange={(value) => handleChange('reminder_time_hours', value)}
                                    disabled={!settings.appointment_reminders_active}
                                >
                                    <SelectTrigger id="reminder-time">
                                        <SelectValue placeholder="Seleccione el tiempo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="12">12 horas antes</SelectItem>
                                        <SelectItem value="24">24 horas antes</SelectItem>
                                        <SelectItem value="48">48 horas antes</SelectItem>
                                        <SelectItem value="72">72 horas antes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveNotifications} className="ml-auto" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}