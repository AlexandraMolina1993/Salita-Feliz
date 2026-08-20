//app/api/send-telegram/route.tsx
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Inicializamos Supabase para guardar el historial de envío
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: Request) {
    try {
        const body = await request.json()

        // 🎯 NORMALIZACIÓN: Soportamos si las variables del frontend vienen mezcladas
        const contenidoMensaje = body.mensaje || body.message
        const asuntoMensaje = body.subject || body.title || "Notificación de Turno"
        const pacienteId = body.patientId || body.patient_id || null

        // Si el contenido viene vacío, cortamos de inmediato con un 400
        if (!contenidoMensaje || contenidoMensaje.trim() === "") {
            return NextResponse.json({ error: "Falta el contenido del mensaje." }, { status: 400 })
        }

        // 1. Sacamos las credenciales de Telegram de forma segura
        const telegramToken = "8648904762:AAHqydiTfDPAK9Ly3_vB6K-PrjVKq1TZFR0"
        const telegramChatId = "6882902634"

        if (!telegramToken || !telegramChatId) {
            return NextResponse.json({ error: "Faltan las variables de entorno de Telegram en el servidor." }, { status: 500 })
        }

        // 🚨 LOGS DE EMERGENCIA: Vamos a ver qué caranchos está viajando
        console.log("🔍 TOKEN QUE SE INTENTA ENVIAR:", telegramToken)
        console.log("🔍 CHAT ID QUE SE INTENTA ENVIAR:", telegramChatId)
        // 2. Enviar el mensaje a la API oficial de Telegram
        const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`
        const response = await fetch(telegramUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: contenidoMensaje,
                parse_mode: "HTML",
            }),
        })

        const telegramData = await response.json()

        // Logs de auditoría para tu terminal de VS Code
        console.log("============== DEBUG TELEGRAM ==============")
        console.log("Status Code que devolvió Telegram:", response.status)
        console.log("Respuesta completa:", JSON.stringify(telegramData, null, 2))
        console.log("============================================")

        if (!response.ok || !telegramData.ok) {
            console.error("🔴 Error de Telegram API:", telegramData)
            return NextResponse.json({ error: "Telegram rechazó el mensaje.", detalles: telegramData }, { status: 502 })
        }

        // 3. Guardar en Supabase asegurando que NINGÚN campo obligatorio sea nulo o vacío
        const asuntoSeguro = asuntoMensaje.trim() !== "" ? asuntoMensaje : "Notificación de Turno"

        const { error: dbError } = await supabase
            .from("notifications")
            .insert([
                {
                    type: "TELEGRAM",
                    title: asuntoSeguro,
                    message: contenidoMensaje,
                    status: "SENT",
                    patient_id: pacienteId,
                    telegram_bot_token: telegramToken,
                    telegram_chat_id: telegramChatId
                }
            ])

        if (dbError) {
            console.error("🔴 DETALLE ERROR SUPABASE:", dbError)
            return NextResponse.json({ error: "Error al guardar en historial de Supabase.", detalles: dbError }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: "Notificación enviada y registrada en el historial con éxito." }, { status: 200 })

    } catch (error) {
        console.error("🔴 CRITICAL ERROR en api/send-telegram:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}