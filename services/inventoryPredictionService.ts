import { supabase } from '@/lib/database';
// Importa tus funciones reales de envío
import { sendTelegramAlert } from '@/lib/telegram';
import { sendGmailReport } from '@/lib/resend';

export async function runProactiveInventoryEngine() {
    console.log('[Cron:InventoryEngine] Iniciando análisis predictivo de stock...');
    const alertsTriggered = [];

    try {
        // 1. Obtener el stock actual materializado (usando tu vista)
        const { data: currentStock, error: stockError } = await supabase
            .from('v_vaccines_stock')
            .select('vaccine_id, name, current_stock_vials, min_stock_level');

        if (stockError) throw stockError;

        // 2. Obtener el historial de consumo de los últimos 7 días
        // Basado en el registro inmutable de stock_movements
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: movements, error: movError } = await supabase
            .from('stock_movements')
            .select('vaccine_id, quantity_vials')
            .eq('type', 'CONSUMPTION') // O el tipo de evento que uses para restar
            .gte('created_at', sevenDaysAgo.toISOString());

        if (movError) throw movError;

        // 3. Procesamiento y Lógica Matemática
        for (const vaccine of currentStock || []) {
            // Filtrar movimientos solo de esta vacuna
            const vaccineMovements = movements?.filter(m => m.vaccine_id === vaccine.vaccine_id) || [];

            // Sumar cuántos viales se gastaron en total en la última semana (convirtiendo a positivo)
            const consumedLastWeek = vaccineMovements.reduce((acc, curr) => acc + Math.abs(curr.quantity_vials), 0);

            // Calcular promedio diario
            const averageDailyConsumption = consumedLastWeek / 7;

            // Calcular días restantes: Días Restantes = Stock Actual / Promedio Diario
            // Si el promedio es 0 (no se usó), asignamos infinito para evitar dividir por cero
            const daysRemaining = averageDailyConsumption > 0
                ? vaccine.current_stock_vials / averageDailyConsumption
                : Infinity;

            // 4. Regla de Negocio: Umbral de Alerta (< 5 días o por debajo del mínimo crítico)
            if (daysRemaining < 5 || vaccine.current_stock_vials <= vaccine.min_stock_level) {
                const message = `🚨 *ALERTA DE STOCK: ${vaccine.name}*\n` +
                    `Stock actual: ${vaccine.current_stock_vials} viales.\n` +
                    `Ritmo de consumo: ${averageDailyConsumption.toFixed(2)} viales/día.\n` +
                    `Proyección de agotamiento: ${daysRemaining === Infinity ? 'N/A' : Math.floor(daysRemaining)} días.\n` +
                    `Por favor, gestione la reposición de inmediato.`;

                alertsTriggered.push(vaccine.name);

                // Disparar las acciones autónomas del Agente
                await sendTelegramAlert(message);
                await sendGmailReport('Alerta Crítica de Stock - Salita Feliz', message);

                // Registrar en la tabla unificada de notificaciones (notifications)
                const { error: notifError } = await supabase.from('notifications').insert({
                    type: 'TELEGRAM',
                    title: `🚨 Alerta Crítica de Stock: ${vaccine.name}`,
                    message: message,
                    status: 'SENT',
                    created_at: new Date().toISOString(),
                });

                if (notifError) {
                    console.error('[Cron:InventoryEngine] Error al registrar en tabla notifications:', notifError.message);
                }
            }
        }

        return {
            success: true,
            summary: `Análisis completado. Alertas disparadas: ${alertsTriggered.length}`,
            alerts: alertsTriggered
        };

    } catch (error) {
        console.error('[Cron:InventoryEngine] Error crítico:', error);
        return { success: false, error: 'Fallo en la predicción de inventario' };
    }
}