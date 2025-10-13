// app/dashboard/enfermeros/[id]/editar/page.tsx
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

// Componentes UI necesarios
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // 🚨 Importación de Avatar

// Hooks y Iconos
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Loader2, User } from "lucide-react" 

// Funciones de la base de datos (Ahora incluye uploadNurseImage)
import { 
    getNurseById, 
    updateNurse, 
    type Nurse,
    uploadNurseImage, // 🚨 Importación necesaria
    replaceNurseImage,       // <-- NUEVA FUNCIÓN DE REEMPLAZO Y BORRADO
  updateNurseImageUrl      // <-- NUEVA FUNCIÓN DE ACTUALIZACIÓN DE URL EN DB
} from "@/lib/database" 


export default function EditNursePage() {
    const router = useRouter()
    const params = useParams()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [loading, setLoading] = useState(true)
    const [nurseData, setNurseData] = useState<Partial<Nurse>>({})
    const [imageFile, setImageFile] = useState<File | null>(null); // Estado para el archivo de imagen
    
    // Función auxiliar para obtener las iniciales
    const getInitials = (fullName?: string) => {
        if (!fullName) return "N/A";
        return fullName
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    useEffect(() => {
        if (params.id) {
            loadNurse(params.id as string)
        }
    }, [params.id])

    const loadNurse = async (id: string) => {
        try {
            const data = await getNurseById(id)
            if (data) {
                setNurseData(data)
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo cargar el enfermero",
                variant: "destructive",
            })
            router.push("/dashboard/enfermeros")
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setNurseData(prevData => ({
            ...prevData,
            [name]: value,
        }))
    }

    // HANDLER para el input de archivo
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setImageFile(e.target.files[0]);
        } else {
            setImageFile(null);
        }
    }

    const handleSwitchChange = (checked: boolean) => {
        setNurseData(prevData => ({
            ...prevData,
            is_active: checked,
        }))
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsLoading(true)

        // Inicialmente, la URL a guardar es la que ya existe (si no se sube una nueva)
        let imageUrlToSave: string | null = nurseData.image_url || null; // <--- Se mantiene

        try {
            // Asegurarse de tener el ID del enfermero
            const nurseId = params.id as string;
            if (!nurseId) throw new Error("ID de enfermero no disponible.");
            
            let photoUpdated = false; // Flag para saber si se hizo la subida/borrado

            // 1. MANEJO DE LA FOTO (Solo subir si hay un nuevo archivo)
            if (imageFile) {
                // 🚨 CORRECCIÓN CLAVE: Usamos replaceNurseImage
                // Esta función: 
                // A) Sube la nueva imagen.
                // B) Elimina la imagen antigua (usando nurseData.image_url como referencia).
                // C) Retorna la nueva URL.
                imageUrlToSave = await replaceNurseImage(imageFile, nurseData.image_url);
                photoUpdated = true;

                // 🚨 Segunda corrección: Actualizar la URL en la DB inmediatamente
                // Esto es crucial para manejar la URL de la foto por separado del resto de datos
                await updateNurseImageUrl(nurseId, imageUrlToSave);
                
                // Opcional: Limpiar el archivo local para evitar doble subida si no se refresca
                setImageFile(null); 
            }

            // 2. PREPARAR DATOS DE ACTUALIZACIÓN (solo datos de formulario, sin la foto)
            // Si la foto se actualizó, la URL ya se guardó en la DB en el paso anterior.
            // Si la foto NO se actualizó, el nurseData.image_url original ya es correcto.
            const updatedData = {
                ...nurseData,
                specialty: nurseData.specialty || 'general', 
            } as Partial<Nurse>;
            
            // 🚨 ELIMINAR image_url de los datos generales antes de actualizar el resto:
            // Esto evita que el campo image_url se actualice con un valor potencial 
            // de 'undefined' o 'null' si la URL no estaba explícitamente en nurseData 
            // y evita la redundancia si ya se actualizó en el paso 1.
            delete updatedData.created_at; 
            delete updatedData.updated_at;
            delete updatedData.id;
            delete updatedData.image_url; // <-- ¡NUEVA LÍNEA CLAVE!


            // 3. ACTUALIZAR EL RESTO DE DATOS EN LA BASE DE DATOS
            // Actualizamos SOLO los campos del formulario (sin la foto)
            await updateNurse(nurseId, updatedData) 
            
            // 4. Mostrar éxito y redirigir
            toast({
                title: "Enfermero actualizado",
                description: "Los datos del enfermero han sido actualizados correctamente",
            })
            // Redirigir a la vista de detalles para ver la nueva foto
            router.push(`/dashboard/enfermeros/${params.id}`) 
        } catch (error) {
            console.error("Error al actualizar enfermero:", error)
            const errorMsg = (error as any).message || "Ocurrió un error al intentar guardar los cambios.";
            toast({
                title: "Error",
                description: `No se pudo actualizar el enfermero: ${errorMsg}`,
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

    if (!nurseData) {
        return (
            <div className="text-center">
                <p>Enfermero no encontrado</p>
                <Button onClick={() => router.push("/dashboard/enfermeros")}>Volver a Enfermeros</Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/enfermeros/${params.id}`)}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Volver</span>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Editar Enfermero</h1>
                        <p className="text-muted-foreground">Modificar los datos de {nurseData.full_name}</p>
                    </div>
                </div>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-3"> {/* Grid de 3 columnas */}
                    
                    {/* 🚨 CARD DE FOTO DE PERFIL (1/3 COLUMNAS) */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <User className="mr-2 h-5 w-5 text-blue-500" />
                                Foto de Perfil
                            </CardTitle>
                            <CardDescription>Actualiza la foto de perfil del enfermero.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Visualización de la foto actual */}
                            <div className="flex flex-col items-center space-y-3">
                                <Avatar className="h-24 w-24 border-4 border-blue-200">
                                    <AvatarImage 
                                        src={nurseData.image_url || undefined} 
                                        alt={nurseData.full_name || "Foto de perfil"} 
                                    />
                                    <AvatarFallback className="text-2xl font-bold bg-blue-100 text-blue-600">
                                        {getInitials(nurseData.full_name)}
                                    </AvatarFallback>
                                </Avatar>
                                <p className="text-sm text-muted-foreground">
                                    Foto actual
                                </p>
                            </div>

                            {/* Input para la nueva foto */}
                            <div className="space-y-2">
                                <Label htmlFor="image_file">Seleccionar nueva foto (Sobrescribe la anterior)</Label>
                                <Input 
                                    id="image_file" 
                                    name="image_file" 
                                    type="file" 
                                    accept="image/png, image/jpeg, image/jpg" 
                                    onChange={handleFileChange}
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-muted-foreground">Máx. recomendado 5MB. Formatos: JPG, PNG.</p>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* CARD DE DATOS PERSONALES (2/3 COLUMNAS) */}
                    <Card className="md:col-span-2"> 
                        <CardHeader>
                            <CardTitle>Datos Personales</CardTitle>
                            <CardDescription>Información básica y profesional del enfermero</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4"> 
                                <div className="space-y-2">
                                    <Label htmlFor="full_name">Nombre Completo</Label>
                                    <Input id="full_name" name="full_name" value={nurseData.full_name || ""} onChange={handleChange} required disabled={isLoading} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="license_number">Matrícula</Label>
                                    <Input id="license_number" name="license_number" value={nurseData.license_number || ""} onChange={handleChange} required disabled={isLoading} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dni">DNI</Label>
                                    <Input id="dni" name="dni" value={nurseData.dni || ""} onChange={handleChange} required disabled={isLoading} />
                                </div>
                               
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">Fecha de Ingreso</Label>
                                    <Input id="start_date" name="start_date" type="date" value={nurseData.start_date || ""} onChange={handleChange} required disabled={isLoading} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                                    <Input id="birth_date" name="birth_date" type="date" value={nurseData.birth_date || ""} onChange={handleChange} required disabled={isLoading} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t mt-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="is_active">Estado Activo</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Determina si el enfermero está disponible para asignaciones
                                    </p>
                                </div>
                                <Switch 
                                    id="is_active" 
                                    name="is_active" 
                                    checked={nurseData.is_active} 
                                    onCheckedChange={handleSwitchChange} 
                                    disabled={isLoading}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* CARD DE CONTACTO (Se extiende debajo) */}
                    <Card className="md:col-span-3"> 
                        <CardHeader>
                            <CardTitle>Información de Contacto y Emergencia</CardTitle>
                            <CardDescription>Datos de contacto y del contacto de emergencia</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input id="phone" name="phone" value={nurseData.phone || ""} onChange={handleChange} required disabled={isLoading} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" value={nurseData.email || ""} onChange={handleChange} required disabled={isLoading} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Domicilio</Label>
                                    <Input id="address" name="address" value={nurseData.address || ""} onChange={handleChange} required disabled={isLoading} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emergency_contact_name">Nombre Contacto de Emergencia</Label>
                                    <Input id="emergency_contact_name" name="emergency_contact_name" value={nurseData.emergency_contact_name || ""} onChange={handleChange} required disabled={isLoading} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emergency_contact_phone">Teléfono de Emergencia</Label>
                                    <Input id="emergency_contact_phone" name="emergency_contact_phone" value={nurseData.emergency_contact_phone || ""} onChange={handleChange} required disabled={isLoading} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>
                
                <div className="mt-6 flex justify-end space-x-4">
                    <Button variant="outline" onClick={() => router.push(`/dashboard/enfermeros/${params.id}`)} disabled={isLoading} type="button">
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {isLoading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            </form>
        </div>
    )
}