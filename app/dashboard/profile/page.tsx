// app/dashboard/profile/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react';
import { fetchAdminProfile, updateAdminProfile } from '@/lib/auth'; 
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { AdminProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; 
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type EditableProfileFields = Omit<AdminProfile, 'id' | 'email' | 'role' | 'avatar_url'>;

export default function ProfilePage() {
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [formData, setFormData] = useState<Partial<EditableProfileFields>>({}); 
    const [error, setError] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initializeFormData = (data: AdminProfile) => {
        setFormData({
            name: data.name || '',
            phone: data.phone || '',
            idNumber: data.idNumber || '',
            address: data.address || '',
            gender: data.gender || '',
            birthDate: data.birthDate?.split('T')[0] || '', 
            hireDate: data.hireDate?.split('T')[0] || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactPhone: data.emergencyContactPhone || '',
        });
    };

    const loadProfile = async () => {
        setLoading(true);
        setError('');
        try {
            const adminProfile = await fetchAdminProfile();
            if (adminProfile) {
                setProfile(adminProfile);
                initializeFormData(adminProfile);
            } else {
                setError('No se pudo cargar el perfil. Asegúrate de haber iniciado sesión.');
            }
        } catch (err) {
            setError('Error al conectar con el servidor para cargar el perfil.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        loadProfile();
    }, []);

    // Función para obtener iniciales del nombre (ej. "Alexandra Molina" -> "AM")
    const getInitials = (name?: string | null, email?: string | null): string => {
        if (name && name.trim()) {
            const parts = name.trim().split(/\s+/);
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return parts[0].slice(0, 2).toUpperCase();
        }
        if (email && email.trim()) {
            return email.trim().slice(0, 2).toUpperCase();
        }
        return 'AM';
    };

    // Extrae la ruta relativa dentro del bucket 'avatars' a partir de una URL pública
    const extractStoragePath = (publicUrl: string, bucket = 'avatars'): string | null => {
        if (!publicUrl) return null;
        try {
            const bucketMarker = `/storage/v1/object/public/${bucket}/`;
            if (publicUrl.includes(bucketMarker)) {
                const parts = publicUrl.split(bucketMarker);
                return decodeURIComponent(parts[1].split('?')[0]);
            }
            const genericMarker = `/${bucket}/`;
            const lastIndex = publicUrl.lastIndexOf(genericMarker);
            if (lastIndex !== -1) {
                const pathPart = publicUrl.substring(lastIndex + genericMarker.length);
                return decodeURIComponent(pathPart.split('?')[0]);
            }
        } catch (err) {
            console.warn('Error al extraer path de Storage:', err);
        }
        return null;
    };

    // Maneja la subida, reemplazo de foto previa y guardado de URL en BD
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const userId = profile?.id;
        if (!userId) {
            toast.error("Error: No se encontró la sesión del usuario.");
            return;
        }

        // Validación de tipo de archivo y tamaño máximo (5MB)
        if (!file.type.startsWith('image/')) {
            toast.error("Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP).");
            return;
        }

        const maxBytes = 5 * 1024 * 1024;
        if (file.size > maxBytes) {
            toast.error("La imagen supera el límite máximo permitido de 5 MB.");
            return;
        }

        setIsUploadingAvatar(true);

        try {
            const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const newFileName = `admin-${userId}-${Date.now()}.${fileExt}`;
            const bucketName = 'avatars';

            // 1. Subir la nueva imagen a Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(newFileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                throw new Error(`Error al subir la imagen: ${uploadError.message}`);
            }

            // 2. Obtener URL pública de la nueva imagen
            const { data: publicUrlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(newFileName);

            if (!publicUrlData?.publicUrl) {
                throw new Error("No se pudo obtener la URL pública de la imagen.");
            }

            const newAvatarUrl = publicUrlData.publicUrl;

            // 3. CRÍTICO: Si el usuario ya tenía una foto previa en el bucket, eliminarla de Supabase Storage
            const oldAvatarUrl = profile?.avatar_url;
            if (oldAvatarUrl) {
                const oldFilePath = extractStoragePath(oldAvatarUrl, bucketName);
                if (oldFilePath && oldFilePath !== newFileName) {
                    console.log(`[Storage] Eliminando imagen previa del bucket: ${oldFilePath}`);
                    const { error: deleteError } = await supabase.storage
                        .from(bucketName)
                        .remove([oldFilePath]);

                    if (deleteError) {
                        console.warn("[Storage] Advertencia al eliminar foto previa:", deleteError.message);
                    } else {
                        console.log("[Storage] Foto previa eliminada exitosamente del bucket.");
                    }
                }
            }

            // 4. Actualización en Base de Datos
            const { success, error: updateError } = await updateAdminProfile(userId, {
                avatar_url: newAvatarUrl
            });

            if (!success && updateError) {
                throw new Error(updateError);
            }

            // 5. Actualizar el estado local para reflejo inmediato en la UI
            setProfile(prev => prev ? { ...prev, avatar_url: newAvatarUrl } : null);

            // 6. Notificación Sonner
            toast.success("Foto actualizada");

        } catch (err: any) {
            console.error("Error al actualizar la foto de perfil:", err);
            toast.error(err?.message || "Ocurrió un error al actualizar la foto de perfil.");
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (value: string, name: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        setError('');
        setSuccessMessage('');

        const userId = profile?.id; 
        if (!userId) {
            setError("Error: ID de usuario no encontrado.");
            setLoading(false);
            return;
        }

        const { success, error: updateError } = await updateAdminProfile(userId, formData);

        if (success) {
            setSuccessMessage("✅ Perfil actualizado correctamente.");
            await loadProfile(); 
            setIsEditing(false);
        } else {
            setError(updateError || "Error desconocido al actualizar el perfil.");
        }
        setLoading(false);
        setTimeout(() => setSuccessMessage(''), 5000); 
    };

    if (loading) {
        return (
            <div className="p-8 text-center bg-background text-foreground min-h-screen flex items-center justify-center">
                <span className="text-lg font-medium">Cargando perfil...</span>
            </div>
        );
    }

    return (
        /* 🌌 1. El contenedor ahora usa bg-background y text-foreground adaptables */
        <div className="p-6 bg-background text-foreground min-h-screen transition-colors duration-300">
            <h1 className="text-3xl font-bold text-foreground">Perfil de Administrador</h1>
            <p className="text-muted-foreground mb-6">
                Actualiza tu información personal y de contacto. Tus cambios se guardarán permanentemente.
            </p>

            {/* Mensajes de Estado Estilizados */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl mb-4 text-sm">
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-4 py-3 rounded-xl mb-4 text-sm">
                    {successMessage}
                </div>
            )}

            <div className="space-y-6">
                
                {/* 📦 2. Cambiado bg-white por bg-card y agregado borde semántico */}
                <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border shadow-sm">
                    <h2 className="text-xl font-semibold mb-6 text-foreground">Información Básica</h2>

                    {/* 📸 Sección Interactiva de Foto de Perfil */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 mb-6 border-b border-border">
                        {/* Avatar Grande con indicador de carga y trigger sobrepuesto */}
                        <div className="relative group">
                            <Avatar className="h-24 w-24 border-2 border-border shadow-md ring-4 ring-primary/10">
                                <AvatarImage 
                                    src={profile?.avatar_url || ''} 
                                    alt={profile?.name || 'Foto de perfil'} 
                                    className="object-cover"
                                />
                                <AvatarFallback className="bg-gradient-to-tr from-primary/80 to-primary text-primary-foreground font-bold text-2xl tracking-wider select-none">
                                    {getInitials(profile?.name, profile?.email)}
                                </AvatarFallback>
                            </Avatar>

                            {/* Estado visual de carga sobre el avatar */}
                            {isUploadingAvatar && (
                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-[1px] transition-all">
                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                </div>
                            )}

                            {/* Botón flotante de cámara sobrepuesto */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingAvatar}
                                aria-label="Cambiar foto de perfil"
                                title="Cambiar foto"
                                className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-card"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Controles y texto explicativo */}
                        <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-2 flex-1">
                            <div>
                                <h3 className="text-base font-semibold text-foreground">
                                    {profile?.name || 'Administrador'}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Foto de perfil en el sistema. Formatos: JPG, PNG o WEBP (máx. 5MB).
                                </p>
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleAvatarUpload}
                                    className="hidden" 
                                    id="profile-avatar-upload"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingAvatar}
                                    className="rounded-xl border-border/80 hover:bg-accent transition-all font-medium"
                                >
                                    {isUploadingAvatar ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Subiendo foto...
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-4 h-4 mr-2 text-primary" />
                                            Cambiar foto
                                        </>
                                    )}
                                </Button>
                                {profile?.avatar_url && !isUploadingAvatar && (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                        ✓ Foto configurada
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Nombre Completo */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Nombre Completo</label>
                            <Input 
                                name="name"
                                value={isEditing ? formData.name : profile?.name || ''} 
                                readOnly={!isEditing} 
                                onChange={handleChange}
                                placeholder="Nombre Completo"
                            />
                        </div>

                        {/* Email (No editable) - Ajustado color de fondo para modo oscuro */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Email (Usuario)</label>
                            <Input 
                                name="email"
                                value={profile?.email || ''} 
                                readOnly={true} 
                                className="bg-muted text-muted-foreground cursor-not-allowed border-border/50"
                                placeholder="Email (Usuario)"
                            />
                        </div>
                        
                        {/* DNI/ID */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">DNI/ID</label>
                            <Input 
                                name="idNumber"
                                value={isEditing ? formData.idNumber : profile?.idNumber || ''} 
                                readOnly={!isEditing}
                                onChange={handleChange}
                                placeholder="DNI/ID"
                            />
                        </div>
                        
                        {/* Teléfono Personal */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Teléfono Personal</label>
                            <Input 
                                name="phone"
                                value={isEditing ? formData.phone : profile?.phone || ''} 
                                readOnly={!isEditing}
                                onChange={handleChange}
                                placeholder="Teléfono Personal"
                            />
                        </div>

                        {/* Domicilio */}
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Domicilio</label>
                            <Input 
                                name="address"
                                value={isEditing ? formData.address : profile?.address || ''} 
                                readOnly={!isEditing}
                                onChange={handleChange}
                                placeholder="Domicilio"
                            />
                        </div>
                        
                        {/* Género */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Género</label>
                            <Select
                                name="gender"
                                value={isEditing ? formData.gender : profile?.gender || ''}
                                onValueChange={(value) => handleSelectChange(value, 'gender')}
                                disabled={!isEditing}
                            >
                                <SelectTrigger className="w-full bg-background border-border text-foreground">
                                    <SelectValue placeholder="Selecciona el género" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground">
                                    <SelectItem value="Masculino">Masculino</SelectItem>
                                    <SelectItem value="Femenino">Femenino</SelectItem>
                                    <SelectItem value="Otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Fecha de Nacimiento */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</label>
                            <Input 
                                name="birthDate"
                                type="date" 
                                value={isEditing ? formData.birthDate : profile?.birthDate?.split('T')[0] || ''} 
                                readOnly={!isEditing}
                                onChange={handleChange}
                                className="dark:[color-scheme:dark]" // 💡 Truco vital para que el icono del calendario nativo se vuelva blanco
                                placeholder="dd/mm/aaaa"
                            />
                        </div>

                    </div>
                </div>

                {/* 📦 Datos Laborales y de Emergencia */}
                <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-foreground">Datos Laborales y de Emergencia</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Rol en el Sistema (No editable) */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Rol en el Sistema</label>
                            <Input 
                                value={profile?.role || 'Administrador'} 
                                readOnly={true}
                                className="bg-muted text-muted-foreground cursor-not-allowed border-border/50"
                            />
                        </div>
                        
                        {/* Fecha de Ingreso */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Fecha de Ingreso</label>
                            <Input 
                                name="hireDate"
                                type="date"
                                value={isEditing ? formData.hireDate : profile?.hireDate?.split('T')[0] || ''}
                                readOnly={!isEditing}
                                onChange={handleChange}
                                className="dark:[color-scheme:dark]"
                                placeholder="dd/mm/aaaa"
                            />
                        </div>

                        {/* Línea divisoria más sutil */}
                        <h3 className="md:col-span-2 text-base text-red-500 font-semibold mt-4 border-b border-border pb-2">
                            Contacto de Emergencia
                        </h3>

                        {/* Nombre Contacto de Emergencia */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                            <Input 
                                name="emergencyContactName"
                                value={isEditing ? formData.emergencyContactName : profile?.emergencyContactName || ''} 
                                readOnly={!isEditing}
                                onChange={handleChange}
                                placeholder="Nombre"
                            />
                        </div>
                        
                        {/* Teléfono Contacto de Emergencia */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
                            <Input 
                                name="emergencyContactPhone"
                                value={isEditing ? formData.emergencyContactPhone : profile?.emergencyContactPhone || ''} 
                                readOnly={!isEditing}
                                onChange={handleChange}
                                placeholder="Teléfono"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel de acciones final */}
            <div className="mt-6 flex justify-center gap-4">
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} disabled={loading} className="px-6 rounded-xl">
                        Editar Perfil
                    </Button>
                ) : (
                    <Button onClick={handleSave} disabled={loading} className="px-6 rounded-xl">
                        Guardar Todos los Cambios
                    </Button>
                )}
                {isEditing && (
                    <Button 
                        onClick={() => { 
                            setIsEditing(false); 
                            initializeFormData(profile as AdminProfile); 
                            setError('');
                        }} 
                        variant="outline" 
                        disabled={loading}
                        className="px-6 rounded-xl"
                    >
                        Cancelar
                    </Button>
                )}
            </div>
        </div>
    );
}