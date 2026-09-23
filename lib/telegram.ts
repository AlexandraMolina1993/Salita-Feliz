/**
 * Envía una alerta operativa inmediata al grupo o usuario de Telegram configurado.
 */
export async function sendTelegramAlert(
    message: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML'
) {
    try {
        // Leemos de las variables de entorno (Recomendado por seguridad)
        // Si no existen, usamos las que tenías hardcodeadas como plan B.
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN || "8648904762:AAHqydiTfDPAK9Ly3_vB6K-PrjVKq1TZFR0";
        const telegramChatId = process.env.TELEGRAM_CHAT_ID || "6882902634";

        const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

        // Si el mensaje contiene etiquetas HTML (como <b>, <i>, <code>) usamos HTML por defecto,
        // o respetamos Markdown si el mensaje fue formateado con asteriscos sin tags HTML.
        const effectiveParseMode = parseMode === 'Markdown' && !/<[a-z][\s\S]*>/i.test(message)
            ? 'Markdown'
            : 'HTML';

        const response = await fetch(telegramUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: message,
                parse_mode: effectiveParseMode,
            }),
        });

        const telegramData = await response.json();

        if (!response.ok || !telegramData.ok) {
            console.error("[Telegram Utility] Error de Telegram API:", telegramData);
            return false;
        }

        console.log("[Telegram Utility] Alerta enviada a Telegram con éxito.");
        return true;

    } catch (error) {
        console.error("[Telegram Utility] Error crítico enviando alerta:", error);
        return false;
    }
}