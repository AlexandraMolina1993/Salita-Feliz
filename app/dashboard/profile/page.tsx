// app/dashboard/profile/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { fetchAdminProfile, updateAdminProfile } from '@/lib/auth'; 
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AdminProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; 

type EditableProfileFields = Omit<AdminProfile, 'id' | 'email' | 'role'>;

export default function ProfilePage() {
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [formData, setFormData] = useState<Partial<EditableProfileFields>>({}); 
    const [error, setError] = useState('');

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
                    <h2 className="text-xl font-semibold mb-4 text-foreground">Información Básica</h2>
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