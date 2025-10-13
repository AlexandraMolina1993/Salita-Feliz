//app/auth/forgot-password/page.tsx
// app/auth/forgot-password/page.tsx
'use client'

import { useState } from 'react';
import { resetPasswordRequest } from '@/lib/auth'; // Importa la nueva función
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// ... otros componentes de UI/Layout

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        if (!email) {
            setError('Por favor, ingresa tu email.');
            setLoading(false);
            return;
        }

        const { success, error: resetError } = await resetPasswordRequest(email);

        if (success) {
            setMessage('📧 ¡Solicitud enviada! Revisa tu email para encontrar el enlace de restablecimiento de contraseña.');
        } else {
            // Manejo del error de Supabase (ej: 'Email not confirmed', 'User not found')
            setError(resetError || 'Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo.');
        }

        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-xl">
                <h2 className="text-2xl font-bold text-center">Restablecer Contraseña</h2>
                <p className="text-center text-gray-600">
                    Ingresa el email de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
                </p>

                {message && <div className="p-3 text-green-700 bg-green-100 rounded">{message}</div>}
                {error && <div className="p-3 text-red-700 bg-red-100 rounded">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="text-sm font-medium">Email</label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu.email@ejemplo.com"
                            required
                        />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar Enlace de Restablecimiento'}
                    </Button>
                </form>
                
                <div className="text-center">
                    <a href="/login" className="text-sm text-indigo-600 hover:underline">
                        Volver al inicio de sesión
                    </a>
                </div>
            </div>
        </div>
    );
}