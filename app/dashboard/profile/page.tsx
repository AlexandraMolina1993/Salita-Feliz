// app/dashboard/profile/page.tsx
'use client'

import { useState, useEffect } from 'react';
// IMPORTANTE: Asegúrate de añadir updateAdminProfile aquí.
import { fetchAdminProfile, updateAdminProfile } from '@/lib/auth'; 
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AdminProfile } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Asumo que usas un componente Select para Género

// Definición para asegurar que solo los campos que PUEDEN cambiar estén en el formulario
type EditableProfileFields = Omit<AdminProfile, 'id' | 'email' | 'role'>;

export default function ProfilePage() {
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [formData, setFormData] = useState<Partial<EditableProfileFields>>({}); 
    const [error, setError] = useState('');

    // Función para inicializar los datos del formulario (se llama al cargar o actualizar el perfil)
    const initializeFormData = (data: AdminProfile) => {
        setFormData({
            name: data.name || '',
            phone: data.phone || '',
            idNumber: data.idNumber || '',
            address: data.address || '',
            gender: data.gender || '',
            // Las fechas deben ser strings en formato ISO (AAAA-MM-DD) para el campo input type="date"
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

    // Manejador genérico para cambios en campos Input
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Manejador específico para el componente Select (Género)
    const handleSelectChange = (value: string, name: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Función principal para GUARDAR los cambios
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

        // Llamar a la función de actualización (que está en lib/auth.ts)
        const { success, error: updateError } = await updateAdminProfile(userId, formData);

        if (success) {
            // Mostrar mensaje de éxito
            setSuccessMessage("✅ Perfil actualizado correctamente.");
            
            // Recargar el perfil para mostrar los datos recién guardados
            await loadProfile(); // Llama a la función de carga que actualiza 'profile' y 'formData'
            
            // Volver al modo de visualización
            setIsEditing(false);
        } else {
            setError(updateError || "Error desconocido al actualizar el perfil.");
        }
        setLoading(false);
        // Ocultar mensaje de éxito después de 5 segundos
        setTimeout(() => setSuccessMessage(''), 5000); 
    };

    if (loading) {
        return <div className="p-8 text-center">Cargando perfil...</div>;
    }


    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold">Perfil de Administrador</h1>
            <p className="text-gray-600 mb-6">Actualiza tu información personal y de contacto. Tus cambios se guardarán permanentemente.</p>

            {/* Mensajes de Estado */}
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    {successMessage}
                </div>
            )}

            <div className="space-y-6">
                
                {/* Información Básica */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Información Básica</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Nombre Completo */}
                        <div>
                            <label className="text-sm font-medium">Nombre Completo</label>
                            <Input 
                                name="name"
                                value={isEditing ? formData.name : profile?.name || ''} 
                                readOnly={!isEditing} 
                                onChange={handleChange}
                                placeholder="Nombre Completo"
                            />
                        </div>

                        {/* Email (No editable) */}
                        <div>
                            <label className="text-sm font-medium">Email (Usuario)</label>
                            <Input 
                                name="email"
                                value={profile?.email || ''} 
                                readOnly={true} 
                                className="bg-gray-100 cursor-not-allowed"
                                placeholder="Email (Usuario)"
                            />
                        </div>
                        
                        {/* DNI/ID */}
                        <div>
                            <label className="text-sm font-medium">DNI/ID</label>
                            <Input 
                                name="idNumber"
                                value={isEditing ? formData.idNumber : profile?.idNumber || ''} 
                                readOnly={!isEditing}
                                onChange={handleChange}
                                placeholder="DNI/ID"
                            />
                        </div>
                        
                        {/* Teléfono Personal */}
                        <div>
                            <label className="text-sm font-medium">Teléfono Personal</label>
                            <Input 
                                name="phone"
                                value={isEditing ? formData.phone : profile?.phone || ''} 
                                readOnly={!isEditing}
                                onChange={handleChange}
                                placeholder="Teléfono Personal"
                            />
                        </div>

                        {/* Domicilio */}
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium">Domicilio</label>
                            <Input 
                                name="address"
                                value={isEditing ? formData.address : profile?.address || ''} 
                                readOnly={!isEditing}
                                onChange={handleChange}
                                placeholder="Domicilio"
                            />
                        </div>
                        
                        {/* Género (Usando Select) */}
                        <div>
                            <label className="text-sm font-medium">Género</label>
                            <Select
                                name="gender"
                                value={isEditing ? formData.gender : profile?.gender || ''}
                                onValueChange={(value) => handleSelectChange(value, 'gender')}
                                disabled={!isEditing}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecciona el género" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Masculino">Masculino</SelectItem>
                                    <SelectItem value="Femenino">Femenino</SelectItem>
                                    <SelectItem value="Otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Fecha de Nacimiento */}
                        <div>
                            <label className="text-sm font-medium">Fecha de Nacimiento</label>
                            <Input 
                                name="birthDate"
                                type="date" // Usar tipo date para que el navegador maneje el formato
                                value={isEditing ? formData.birthDate : profile?.birthDate?.split('T')[0] || ''} 
                                readOnly={!isEditing}
                                onChange={handleChange}
                                // Si está en modo de visualización, puedes mostrarlo formateado
                                placeholder="dd/mm/aaaa"
                            />
                        </div>

                    </div>
                </div>

                {/* Datos Laborales y de Emergencia */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Datos Laborales y de Emergencia</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Rol en el Sistema (No editable) */}
                        <div>
                            <label className="text-sm font-medium">Rol en el Sistema</label>
                            <Input 
                                value={profile?.role || 'Administrador'} 
                                readOnly={true}
                                className="bg-gray-100 cursor-not-allowed"
                            />
                        </div>
                        
                        {/* Fecha de Ingreso */}
                        <div>
                            <label className="text-sm font-medium">Fecha de Ingreso</label>
                            <Input 
                                name="hireDate"
                                type="date"
                                value={isEditing ? formData.hireDate : profile?.hireDate?.split('T')[0] || ''}
                                readOnly={!isEditing}
                                onChange={handleChange}
                                placeholder="dd/mm/aaaa"
                            />
                        </div>

                        <h3 className="md:col-span-2 text-base text-red-600 font-semibold mt-2">Contacto de Emergencia</h3>

                        {/* Nombre Contacto de Emergencia */}
                        <div>
                            <label className="text-sm font-medium">Nombre</label>
                            <Input 
                                name="emergencyContactName"
                                value={isEditing ? formData.emergencyContactName : profile?.emergencyContactName || ''} 
                                readOnly={!isEditing}
                                onChange={handleChange}
                                placeholder="Nombre"
                            />
                        </div>
                        
                        {/* Teléfono Contacto de Emergencia */}
                        <div>
                            <label className="text-sm font-medium">Teléfono</label>
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

            {/* 💡 Lógica del Botón: Alternar entre Editar y Guardar */}
            <div className="mt-6 text-center">
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} disabled={loading}>
                        Editar Perfil
                    </Button>
                ) : (
                    <Button onClick={handleSave} disabled={loading}>
                        Guardar Todos los Cambios
                    </Button>
                )}
                {isEditing && (
                    <Button 
                        onClick={() => { 
                            setIsEditing(false); 
                            initializeFormData(profile as AdminProfile); // Restaura los datos originales
                            setError('');
                        }} 
                        variant="secondary" 
                        className="ml-4"
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                )}
            </div>
        </div>
    );
}