-- ==============================================================================
-- Tabla de Auditoría: ai_notifications_log
-- Registra todos los despachos automáticos generados por el Agente de IA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS ai_notifications_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('TELEGRAM', 'GMAIL')),
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    context JSONB DEFAULT '{}'::jsonb,
    error_detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Índices para optimizar consultas de auditoría y reportes
CREATE INDEX IF NOT EXISTS idx_ai_notifications_channel ON ai_notifications_log(channel);
CREATE INDEX IF NOT EXISTS idx_ai_notifications_status ON ai_notifications_log(status);
CREATE INDEX IF NOT EXISTS idx_ai_notifications_created_at ON ai_notifications_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_notifications_context_gin ON ai_notifications_log USING gin (context);

COMMENT ON TABLE ai_notifications_log IS 'Bitácora inmutable de alertas y reportes ejecutivos emitidos por el agente predictivo de IA';
