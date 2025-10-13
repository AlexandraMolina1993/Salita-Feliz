// app/auth/update-password/page.tsx
'use client'

import { useState } from 'react';
import Link from 'next/link';
// Asegúrate de que esta ruta importe la instancia de Supabase Client
import { supabase } from '@/lib/supabase'; 
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            setLoading(false);
            return;
        }

        // Llama a la API de Supabase para actualizar la contraseña
        const { error: updateError } = await supabase.auth.updateUser({ 
            password: password 
        });

        if (updateError) {
            setError(updateError.message || 'Error al actualizar la contraseña. Por favor, intenta de nuevo el proceso de recuperación.');
        } else {
            setMessage('✅ ¡Contraseña actualizada con éxito! Ahora puedes iniciar sesión.');
            setPassword('');
            setConfirmPassword('');
        }

        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl text-center">Definir Nueva Contraseña</CardTitle>
                    <CardDescription className="text-center">
                        Ingresa tu nueva contraseña para completar el proceso.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {message && (
                            <div className="p-3 text-sm text-green-700 bg-green-100 border border-green-400 rounded flex items-center">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                {message}
                            </div>
                        )}
                        {error && <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-400 rounded">{error}</div>}

                        <div className="space-y-2">
                            <label htmlFor="password">Nueva Contraseña</label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 8 caracteres"
                                required
                                disabled={loading || !!message}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirma la nueva contraseña"
                                required
                                disabled={loading || !!message}
                            />
                        </div>
                        
                        <Button type="submit" className="w-full modern-button" disabled={loading || !!message}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Actualizando...
                                </>
                            ) : (
                                'Restablecer Contraseña'
                            )}
                        </Button>
                    </CardContent>
                </form>
                <div className="p-6 pt-0 text-center">
                    <Link href="/login" className="text-sm text-blue-600 hover:underline">
                        Volver al inicio de sesión
                    </Link>
                </div>
            </Card>
        </div>
    );
}