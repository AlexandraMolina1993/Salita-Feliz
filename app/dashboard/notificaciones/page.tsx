// /app/dashboard/notificaciones/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPatients } from '@/lib/database';

// Define un tipo simplificado para los destinatarios (pacientes)
type Recipient = { id: string; name: string; phone_number: string | null };

export default function NotificationsPage() {
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    // Estas variables ahora se usan para el cuerpo del EMAIL
    const [scheduledDate, setScheduledDate] = useState(''); 
    const [scheduledTime, setScheduledTime] = useState(''); 
    
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Cargar la lista de pacientes
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const data = await getPatients(); 
                setRecipients(data.map((p: any) => ({
                    id: p.id,
                    name: p.full_name || p.name, 
                    // 🚨 NOTA: Asegúrate de que tu función getPatients devuelva también el 'email' si no está en otro campo
                    phone_number: p.phone, 
                })));
            } catch (error) {
                console.error("Error al cargar pacientes:", error);
                setStatusMessage("❌ Error al cargar la lista de pacientes.");
            }
        };
        fetchPatients();
    }, []);

    const handleSendNotification = async () => {
        // La validación es la misma, ¡es correcta!
        if (!selectedPatientId || !subject || !message || !scheduledDate || !scheduledTime) {
            setStatusMessage('⚠️ Por favor, selecciona un paciente y completa el Asunto, Mensaje, Fecha y Hora del Turno.');
            return;
        }

        setIsLoading(true);
        setStatusMessage(null);

        const notificationPayload = { 
            patientId: selectedPatientId, 
            subject, 
            message,
            scheduledDate,
            scheduledTime,
        };

        try {
            // 🛑 CAMBIO CRÍTICO 1: Apuntar al nuevo endpoint de EMAIL
            const response = await fetch('/api/send-email', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notificationPayload),
            });
            
            let data: any;

            try {
                data = await response.json();
            } catch (jsonError) {
                if (!response.ok) {
                    console.error("Fallo del servidor (no JSON):", jsonError);
                    throw new Error(`Error ${response.status}: El servidor respondió con un error de formato desconocido. (¡Revisa los logs de /api/send-email!)`);
                }
                data = { message: 'Notificación enviada con éxito (Respuesta vacía).' };
            }

            if (response.ok) {
                // 🛑 CAMBIO DE MENSAJE: Ahora es un éxito de Email
                setStatusMessage('✅ Notificación de Email enviada con éxito!');
                // Limpiar campos
                setSubject('');
                setMessage('');
                setScheduledDate('');
                setScheduledTime('');
                setSelectedPatientId('');
            } else {
                setStatusMessage(`❌ Error al enviar: ${data.details || data.error || 'Error desconocido del servidor.'}`);
            }
        } catch (error) {
            console.error('Error de red/petición:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido de la red.';
            setStatusMessage(`❌ Error de conexión al intentar enviar la notificación: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedPatient = recipients.find(r => r.id === selectedPatientId);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Sección Enviar Notificación */}
            <Card>
                <CardHeader>
                    <CardTitle>Enviar Notificación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Tipo de Notificación */}
                    <div>
                        <label className="text-sm font-medium">Tipo de Notificación</label>
                        {/* 🛑 CAMBIO DE INTERFAZ 1: Reflejar que es Email */}
                        <Input value="Email - Correo Electrónico" disabled className="bg-blue-100 border-blue-500" />
                    </div>

                    {/* Destinatarios */}
                    <div>
                        <label className="text-sm font-medium">Destinatarios</label>
                        <Select onValueChange={setSelectedPatientId} value={selectedPatientId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione destinatarios" />
                            </SelectTrigger>
                            <SelectContent>
                                {recipients.map((p) => (
                                    // ⚠️ NOTA: Deberías verificar si p.email existe, no p.phone_number
                                    <SelectItem key={p.id} value={p.id} disabled={!p.phone_number}> 
                                        {p.name} {p.phone_number ? '' : '(Sin Email)'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Fecha y Hora del Turno */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Fecha del Turno</label>
                            <Input 
                                placeholder="Ej: 08-10-2025" 
                                value={scheduledDate} 
                                onChange={(e) => setScheduledDate(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Hora del Turno</label>
                            <Input 
                                placeholder="Ej: 11:30" 
                                value={scheduledTime} 
                                onChange={(e) => setScheduledTime(e.target.value)} 
                            />
                        </div>
                    </div>

                    {/* Asunto */}
                    <div>
                        <label className="text-sm font-medium">Asunto</label>
                        <Input 
                            placeholder="Ingrese el asunto" 
                            value={subject} 
                            onChange={(e) => setSubject(e.target.value)} 
                        />
                    </div>

                    {/* Mensaje */}
                    <div>
                        <label className="text-sm font-medium">Mensaje</label>
                        <Textarea 
                            placeholder="Escriba su mensaje aquí" 
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)} 
                        />
                    </div>
                    
                    {/* Botón de Envío */}
                    <Button 
                        onClick={handleSendNotification} 
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        {isLoading ? 'Enviando...' : 'Enviar Notificación'}
                    </Button>
                    
                    {/* Mensaje de Estado */}
                    {statusMessage && (
                        <p className={`text-center p-2 rounded ${statusMessage.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {statusMessage}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Sección Vista Previa (Simulación) */}
            <Card>
                <CardHeader>
                    {/* 🛑 CAMBIO DE INTERFAZ 2: Reflejar que es Email */}
                    <CardTitle>Vista Previa (Email)</CardTitle> 
                </CardHeader>
                <CardContent>
                    {/* 🛑 CAMBIO DE COLOR: Usar un color más neutro/azul para Email */}
                    <div className="border p-4 rounded-lg bg-gray-50"> 
                        <p className="font-bold text-sm text-gray-700">De: {process.env.EMAIL_FROM || 'Tu Correo Verificado'}</p>
                        <p className="text-xs text-gray-500">Para: {selectedPatient?.name || '[Paciente]'}</p>
                        <div className="mt-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                            <p className="font-semibold text-sm">Asunto: {subject || "[Asunto]"}</p>
                            {/* Este es el cuerpo del mensaje HTML que construyes en send-email/route.ts */}
                            <p className="text-sm text-gray-600 mt-2">
                                <strong>Recordatorio:</strong> Turno el {scheduledDate || 'Fecha'} a las {scheduledTime || 'Hora'}.
                            </p>
                            <p className="text-gray-800 text-sm mt-2 whitespace-pre-wrap">Mensaje Adicional: {message || "[Mensaje personalizado]"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}