// ./app/dashboard/configuracion/users/page.tsx
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
// Importamos 'useRouter' para simular la navegación, aunque lo comentaremos
// import { useRouter } from 'next/navigation'; 
import { useToast } from "@/hooks/use-toast"

// Asegúrate de que este import sea correcto
import { getConfigByCategory, updateConfig } from '@/lib/database'; 

// Definición de las claves de configuración
interface UserSettings {
    two_factor_active: boolean;
    password_expiry_active: boolean;
    session_timeout_active: boolean;
}

const initialSettings: UserSettings = {
    two_factor_active: false,
    password_expiry_active: true,
    session_timeout_active: true,
};

export default function UsersSettingsPage() {
    const { toast } = useToast()
    const [settings, setSettings] = useState<UserSettings>(initialSettings);
    const [isLoading, setIsLoading] = useState(true);
    // const router = useRouter(); // Descomentar si usas next/navigation para redirección

    // --- LÓGICA DE CARGA (READ) ---
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getConfigByCategory('Usuarios'); 
                
                const newSettings: Partial<UserSettings> = {};
                data.forEach(item => {
                    if (item.key in initialSettings) {
                        // Convierte el string 'true'/'false' de Supabase a booleano
                        newSettings[item.key as keyof UserSettings] = item.value === 'true';
                    }
                });

                setSettings(prev => ({ ...prev, ...newSettings }));
            } catch (error) {
                console.error("Error al cargar la configuración de Usuarios:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    // Manejador de cambios para los Switches
    const handleChange = (key: keyof UserSettings, checked: boolean) => {
        setSettings(prev => ({ ...prev, [key]: checked }));
    };

    // --- LÓGICA DE GUARDADO (UPDATE) ---
    const handleSaveUsers = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const updates = Object.entries(settings).map(([key, value]) => ({
                key: key,
                value: value.toString(), // Convertir true/false a 'true'/'false'
                category: 'Usuarios'
            }));

            await updateConfig(updates); 

            toast({ title: "Configuración de Usuarios guardada", description: "Los ajustes de seguridad y roles han sido guardados" });
            
        } catch (error) {
            console.error("Error al guardar la configuración de Usuarios:", error);
            toast({ title: "Error al Guardar", description: "Hubo un problema al guardar los ajustes de seguridad.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- LÓGICA DE ACCIONES SIMULADAS PARA LOS BOTONES ---

    const handleEditPermissions = (role: string) => {
        toast({
            title: `Simulación: Editar Permisos`,
            description: `Se abriría el formulario para cambiar permisos del rol: ${role}`,
        });
        // Si quisieras abrir un modal, el código iría aquí
    };

    const handleNewUser = () => {
        // Opción 1: Usar un toast (como se hace aquí)
        toast({
            title: "Simulación: Nuevo Usuario",
            description: "Se abriría la página o modal para crear un nuevo usuario.",
        });

        /* // Opción 2: Si usas Next.js router
        router.push('/dashboard/usuarios/nuevo'); 
        */
    };


    return (
        // Envolvemos todo el contenido en un <form> para manejar el submit
        <form onSubmit={handleSaveUsers} className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Usuarios</CardTitle>
                    <CardDescription>Administre los usuarios y roles del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Sección Roles de Usuario (Ahora con acciones de simulación) */}
                    <div className="space-y-2">
                        <Label>Roles de Usuario</Label>
                        <div className="rounded-md border">
                            
                            {/* ADMINISTRADOR */}
                            <div className="p-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div><h3 className="font-medium">Administrador</h3><p className="text-sm text-muted-foreground">Acceso completo a todas las funciones</p></div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        type="button" 
                                        onClick={() => handleEditPermissions('Administrador')}
                                    >
                                        Editar Permisos
                                    </Button>
                                </div>
                            </div>
                            
                            {/* ENFERMERO */}
                            <div className="p-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div><h3 className="font-medium">Enfermero</h3><p className="text-sm text-muted-foreground">Gestión de pacientes y vacunas</p></div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        type="button" 
                                        onClick={() => handleEditPermissions('Enfermero')}
                                    >
                                        Editar Permisos
                                    </Button>
                                </div>
                            </div>
                            
                            {/* PACIENTES */}
                            <div className="p-4">
                                <div className="flex items-center justify-between">
                                    <div><h3 className="font-medium">Pacientes</h3><p className="text-sm text-muted-foreground">Solicitud de turnos</p></div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        type="button" 
                                        onClick={() => handleEditPermissions('Pacientes')}
                                    >
                                        Editar Permisos
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Sección Seguridad */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Seguridad</Label>
                            {/* NUEVO USUARIO */}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                type="button"
                                onClick={handleNewUser}
                            >
                                Nuevo Usuario
                            </Button>
                        </div>
                        <div className="space-y-4 rounded-md border p-4">
                            
                            {/* Autenticación de Dos Factores */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="two-factor">Autenticación de Dos Factores</Label>
                                    <p className="text-sm text-muted-foreground">Requerir verificación adicional al iniciar sesión</p>
                                </div>
                                <Switch 
                                    id="two-factor" 
                                    checked={settings.two_factor_active} 
                                    onCheckedChange={(checked) => handleChange('two_factor_active', checked)} 
                                    disabled={isLoading}
                                />
                            </div>
                            
                            {/* Expiración de Contraseñas */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="password-expiry">Expiración de Contraseñas</Label>
                                    <p className="text-sm text-muted-foreground">Requerir cambio de contraseña cada 90 días</p>
                                </div>
                                <Switch 
                                    id="password-expiry" 
                                    checked={settings.password_expiry_active} 
                                    onCheckedChange={(checked) => handleChange('password_expiry_active', checked)} 
                                    disabled={isLoading}
                                />
                            </div>
                            
                            {/* Tiempo de Inactividad */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="session-timeout">Tiempo de Inactividad</Label>
                                    <p className="text-sm text-muted-foreground">Cerrar sesión después de 10 minutos de inactividad</p>
                                </div>
                                <Switch 
                                    id="session-timeout" 
                                    checked={settings.session_timeout_active} 
                                    onCheckedChange={(checked) => handleChange('session_timeout_active', checked)} 
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    {/* Botón de Guardar Cambios (funcional con Supabase) */}
                    <Button type="submit" className="ml-auto" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    )
}