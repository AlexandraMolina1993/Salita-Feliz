//app/register/admin/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { UserPlus, Loader2 } from 'lucide-react'
import { signupAdmin } from '@/lib/auth'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Asumo que tienes Select de shadcn

export default function AdminRegisterPage() {
    // 1. ESTADOS BASE
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [phone, setPhone] = useState('')
    
    // 2. 🚨 ESTADOS ADICIONALES REQUERIDOS POR EL ESQUEMA DE LA BASE DE DATOS
    const [idNumber, setIdNumber] = useState('')
    const [address, setAddress] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [gender, setGender] = useState('') // Usaremos Select para esto
    const [hireDate, setHireDate] = useState('')
    const [emergencyContactName, setEmergencyContactName] = useState('')
    const [emergencyContactPhone, setEmergencyContactPhone] = useState('')

    // 3. ESTADOS DE UI Y NAVEGACIÓN
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<boolean>(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        if (!gender) {
            setError("Por favor, selecciona un género.");
            return;
        }

        setIsLoading(true)
        setError(null)
        setSuccess(false)

        // 🚨 ENVIAR TODOS LOS CAMPOS AL BACKEND
        const { success, error } = await signupAdmin({ 
            name, 
            email, 
            password, 
            phone, 
            idNumber, 
            address, 
            birthDate, 
            gender, 
            hireDate, 
            emergencyContactName, 
            emergencyContactPhone 
        });

        if (success) {
            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } else {
            setError(error || "Error desconocido al registrar el administrador.");
        }
        setIsLoading(false)
    }

    // Si el registro fue exitoso, muestra un mensaje de éxito
    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-md modern-card">
                    <CardHeader>
                        <AlertTitle className="text-green-600">Registro Exitoso</AlertTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Tu cuenta de administrador ha sido creada. Revisa tu email para cualquier verificación y serás redirigido al inicio de sesión.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            {/* Cambié el max-w-lg a max-w-2xl para dar espacio al formulario largo */}
            <Card className="w-full max-w-2xl modern-card">
                <CardHeader className="space-y-1 text-center">
                    <UserPlus className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <CardTitle className="text-3xl font-bold">Registro de Administrador</CardTitle>
                    <CardDescription>Completa todos los campos para crear la cuenta de gestión principal.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        {error && (
                            <Alert variant="destructive">
                                <AlertTitle>Error de Registro</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        {/* ------------------------------------------- */}
                        <h3 className="text-lg font-semibold border-b pb-2">1. Datos de Acceso</h3>
                        {/* ------------------------------------------- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Campo Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="nuevo.admin@salitafeliz.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
                            </div>

                            {/* Campo Contraseña */}
                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña (mín. 8 caracteres)</Label>
                                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} disabled={isLoading} />
                            </div>
                        </div>

                        {/* ------------------------------------------- */}
                        <h3 className="text-lg font-semibold border-b pb-2">2. Información Personal</h3>
                        {/* ------------------------------------------- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Campo Nombre */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre Completo</Label>
                                <Input id="name" type="text" placeholder="Juan Pérez" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
                            </div>
                            
                            {/* Campo N° de Identificación */}
                            <div className="space-y-2">
                                <Label htmlFor="idNumber">N° de Identificación (DNI/Cédula)</Label>
                                <Input id="idNumber" type="text" placeholder="Ej: 36887412" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required disabled={isLoading} />
                            </div>

                            {/* Campo Teléfono */}
                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input id="phone" type="tel" placeholder="+54 9 11 XXXX-XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={isLoading} />
                            </div>
                            
                            {/* Campo Fecha de Nacimiento */}
                            <div className="space-y-2">
                                <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                                <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required disabled={isLoading} />
                            </div>

                            {/* Campo Género */}
                            <div className="space-y-2">
                                <Label htmlFor="gender">Género</Label>
                                <Select onValueChange={setGender} required disabled={isLoading}>
                                    <SelectTrigger id="gender">
                                        <SelectValue placeholder="Selecciona el género" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Femenino">Femenino</SelectItem>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Campo Dirección */}
                            <div className="space-y-2">
                                <Label htmlFor="address">Dirección Completa</Label>
                                <Input id="address" type="text" placeholder="Calle Falsa 123" value={address} onChange={(e) => setAddress(e.target.value)} required disabled={isLoading} />
                            </div>
                        </div>
                        
                        {/* ------------------------------------------- */}
                        <h3 className="text-lg font-semibold border-b pb-2">3. Datos Laborales y de Emergencia</h3>
                        {/* ------------------------------------------- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Campo Fecha de Ingreso */}
                            <div className="space-y-2">
                                <Label htmlFor="hireDate">Fecha de Ingreso</Label>
                                <Input id="hireDate" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} required disabled={isLoading} />
                            </div>
                            
                            {/* Campo Contacto de Emergencia (Nombre) */}
                            <div className="space-y-2">
                                <Label htmlFor="emergencyContactName">Contacto de Emergencia (Nombre)</Label>
                                <Input id="emergencyContactName" type="text" placeholder="Nombre del Contacto" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} required disabled={isLoading} />
                            </div>

                            {/* Campo Contacto de Emergencia (Teléfono) */}
                            <div className="space-y-2">
                                <Label htmlFor="emergencyContactPhone">Contacto de Emergencia (Teléfono)</Label>
                                <Input id="emergencyContactPhone" type="tel" placeholder="Teléfono del Contacto" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} required disabled={isLoading} />
                            </div>
                        </div>
                        
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-3">
                        <Button type="submit" className="w-full modern-button" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Registrando...
                                </>
                            ) : (
                                "Crear Cuenta de Administrador"
                            )}
                        </Button>
                        <Link href="/login" className="w-full text-center">
                            <Button type="button" variant="link" disabled={isLoading}>
                                Ya tengo una cuenta
                            </Button>
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}