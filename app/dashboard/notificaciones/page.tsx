'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPatients } from '@/lib/database';

// 💻 Actualizamos el tipo para incluir el teléfono
type Recipient = { id: string; name: string; email: string | null; phone: string | null };

export default function NotificationsPage() {
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [notificationType, setNotificationType] = useState<'email' | 'telegram'>('email');
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [scheduledDate, setScheduledDate] = useState(''); 
    const [scheduledTime, setScheduledTime] = useState(''); 
    
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Cargar la lista de pacientes incluyendo el teléfono
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const data = await getPatients(); 
                setRecipients(data.map((p: any) => ({
                    id: p.id,
                    name: p.full_name || p.name, 
                    email: p.email,
                    phone: p.phone || p.telefono, // Ajusta según el nombre de tu columna en Supabase
                })));
            } catch (error) {
                console.error("Error al cargar pacientes:", error);
                setStatusMessage("❌ Error al cargar la lista de pacientes.");
            }
        };
        fetchPatients();
    }, []);

    const handleSendNotification = async () => {
        if (!selectedPatientId || !subject || !message || !scheduledDate || !scheduledTime) {
            setStatusMessage('⚠️ Por favor, selecciona un paciente y completa el Asunto, Mensaje, Fecha y Hora del Turno.');
            return;
        }

        setIsLoading(true);
        setStatusMessage(null);

        const endpoint = notificationType === 'email' ? '/api/send-email' : '/api/send-telegram';

        const payload = notificationType === 'email' 
            ? { patientId: selectedPatientId, subject, message, scheduledDate, scheduledTime }
            : { 
                patientId: selectedPatientId,
                telefono: selectedPatient?.phone, // 👈 Enviamos el teléfono para Telegram
                mensaje: `<b>📢 ${subject}</b>\n\n<b>📌 Paciente:</b> ${selectedPatient?.name || 'Asignado'}\n<b>🗓️ Fecha:</b> ${scheduledDate}\n<b>⏰ Hora:</b> ${scheduledTime} hs.\n\n<b>📝 Nota:</b> ${message}` 
              };

        try {
            const response = await fetch(endpoint, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            let data: any;
            try {
                data = await response.json();
            } catch (jsonError) {
                if (!response.ok) {
                    console.error("Fallo del servidor (no JSON):", jsonError);
                    throw new Error(`Error ${response.status}: El servidor respondió con un error de formato desconocido.`);
                }
                data = { message: 'Notificación enviada con éxito.' };
            }

            if (response.ok) {
                setStatusMessage(`✅ Notificación de ${notificationType === 'email' ? 'Email' : 'Telegram'} enviada con éxito!`);
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
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo de Notificación</label>
                        <Select 
                            value={notificationType} 
                            onValueChange={(value) => {
                                setNotificationType(value as 'email' | 'telegram');
                                setStatusMessage(null);
                            }}
                        >
                            <SelectTrigger className="w-full bg-background border-input">
                                <SelectValue placeholder="Seleccione el canal de envío" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="email">
                                    <div className="flex items-center gap-2">
                                        <span>📧</span>
                                        <span>Email - Correo Electrónico</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="telegram">
                                    <div className="flex items-center gap-2">
                                        <span>🤖</span>
                                        <span>Telegram - Alerta Bot</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 🎯 Destinatarios Dinámico (Muestra Email o Teléfono según canal) */}
                    <div>
                        <label className="text-sm font-medium">Destinatarios</label>
                        <Select onValueChange={setSelectedPatientId} value={selectedPatientId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione destinatarios" />
                            </SelectTrigger>
                            <SelectContent>
                                {recipients.map((p) => (
                                    <SelectItem 
                                        key={p.id} 
                                        value={p.id} 
                                        disabled={
                                            (notificationType === 'email' && !p.email) || 
                                            (notificationType === 'telegram' && !p.phone)
                                        }
                                    > 
                                        {p.name} 
                                        {notificationType === 'telegram' 
                                            ? (p.phone ? ` (${p.phone})` : ' (Sin Teléfono)')
                                            : (p.email ? `(${p.email})` : ' (Sin Email)')
                                        }
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
                        className={`w-full text-white transition-colors ${
                            notificationType === 'email' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-sky-600 hover:bg-sky-700'
                        }`}
                    >
                        {isLoading ? 'Enviando...' : `Enviar por ${notificationType === 'email' ? 'Email' : 'Telegram'}`}
                    </Button>
                    
                    {/* Mensaje de Estado */}
                    {statusMessage && (
                        <p className={`text-center p-2 rounded text-sm ${statusMessage.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {statusMessage}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Sección Vista Previa Dinámica */}
            <Card>
                <CardHeader>
                    <CardTitle>Vista Previa ({notificationType === 'email' ? 'Email' : 'Telegram'})</CardTitle> 
                </CardHeader>
                <CardContent>
                    {notificationType === 'email' ? (
                        <div className="border p-4 rounded-lg bg-gray-50"> 
                            <p className="font-bold text-sm text-gray-700">De: {process.env.EMAIL_FROM || 'Tu Correo Verificado'}</p>
                            <p className="text-xs text-gray-500">Para: {selectedPatient ? `${selectedPatient.name} <${selectedPatient.email}>` : '[Paciente]'}</p>
                            <div className="mt-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                                <p className="font-semibold text-sm">Asunto: {subject || "[Asunto]"}</p>
                                <p className="text-sm text-gray-600 mt-2">
                                    <strong>Recordatorio:</strong> Turno el {scheduledDate || 'Fecha'} a las {scheduledTime || 'Hora'}.
                                </p>
                                <p className="text-gray-800 text-sm mt-2 whitespace-pre-wrap">Mensaje Adicional: {message || "[Mensaje personalizado]"}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="border rounded-lg bg-[#f4f4f5] dark:bg-[#18181b] p-4 min-h-[220px] flex flex-col justify-between"
                             style={{ backgroundImage: "radial-gradient(#cbd5e1 0.6px, transparent 0.6px)", backgroundSize: "12px 12px" }}>
                            
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-zinc-800 mb-3 text-xs">
                                <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-[11px]">SF</div>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-zinc-200">Salita Feliz Bot</p>
                                    <p className="text-[10px] text-sky-500">bot</p>
                                </div>
                            </div>

                            <div className="self-start max-w-[90%] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm p-3 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 relative rounded-tl-none">
                                <span className="text-sky-500 font-bold block text-xs mb-1">🏥 Alertas Salita Feliz</span>
                                <div className="space-y-1">
                                    <p><b>📢 {subject || "Aviso de Turno"}</b></p>
                                    <p className="text-xs mt-1"><b>📌 Paciente:</b> {selectedPatient ? selectedPatient.name : '[Paciente]'}</p>
                                    {/* 🎯 Mostramos el teléfono en la vista previa del chat */}
                                    <p className="text-xs"><b>📱 Teléfono:</b> {selectedPatient ? selectedPatient.phone : '[Teléfono]'}</p>
                                    <p className="text-xs"><b>🗓️ Fecha:</b> {scheduledDate || '__/__/____'}</p>
                                    <p className="text-xs"><b>⏰ Hora:</b> {scheduledTime || '__:__'} hs.</p>
                                    {message && <p className="text-xs pt-1 border-t border-dashed mt-2 text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{message}</p>}
                                </div>
                                <span className="text-[9px] text-zinc-400 float-right mt-1">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}