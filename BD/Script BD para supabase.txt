-- =====================================================
-- BACKUP COMPLETO - SISTEMA DE CONTROL DE GASTOS
-- Fecha de generación: 2024
-- =====================================================

-- =====================================================
-- 1. TABLAS PRINCIPALES
-- =====================================================

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#8884D8',
    icono VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de formas de pago
CREATE TABLE IF NOT EXISTS formas_pago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#10B981',
    icono VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de entidades bancarias
CREATE TABLE IF NOT EXISTS entidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    logo VARCHAR(255),
    color VARCHAR(7) DEFAULT '#3B82F6',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de tarjetas de crédito
CREATE TABLE IF NOT EXISTS tarjetas_credito (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    entidad_id INTEGER REFERENCES entidades(id) ON DELETE RESTRICT,
    ultimos_digitos VARCHAR(4) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    limite DECIMAL(12,2),
    dia_cierre INTEGER CHECK (dia_cierre BETWEEN 1 AND 31),
    dia_vencimiento INTEGER CHECK (dia_vencimiento BETWEEN 1 AND 31),
    saldo_actual DECIMAL(12,2) DEFAULT 0,
    saldo_disponible DECIMAL(12,2),
    activa BOOLEAN DEFAULT TRUE,
    favorita BOOLEAN DEFAULT FALSE,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT unique_tarjeta_usuario UNIQUE(nombre, ultimos_digitos, usuario_id)
);

-- Tabla principal de gastos
CREATE TABLE IF NOT EXISTS gastos (
    id SERIAL PRIMARY KEY,
    descripcion TEXT NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    categoria VARCHAR(100) NOT NULL,
    forma_pago VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    es_cuota BOOLEAN DEFAULT FALSE,
    tipo_gasto VARCHAR(30) DEFAULT 'simple',
    cuota_actual INTEGER,
    total_cuotas INTEGER CHECK (total_cuotas >= 1 AND total_cuotas <= 24),
    monto_cuota DECIMAL(10,2),
    gasto_original_id INTEGER REFERENCES gastos(id) ON DELETE CASCADE,
    fecha_compra DATE,
    monto_original DECIMAL(10,2),
    tiene_interes BOOLEAN DEFAULT FALSE,
    tipo_interes VARCHAR(20),
    valor_interes DECIMAL(10,2),
    monto_con_interes DECIMAL(10,2),
    tarjeta_credito_id INTEGER REFERENCES tarjetas_credito(id) ON DELETE SET NULL,
    periodo_cierre VARCHAR(7),
    periodo_vencimiento VARCHAR(7),
    fecha_cierre_calculada DATE,
    notas TEXT,
    comprobante_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT chk_cuota_valores CHECK (
        (es_cuota = FALSE) OR 
        (es_cuota = TRUE AND total_cuotas IS NOT NULL AND monto_cuota IS NOT NULL)
    ),
    CONSTRAINT chk_tipo_gasto CHECK (
        tipo_gasto IN ('simple', 'credito_compra', 'credito_cuota')
    ),
    CONSTRAINT chk_interes CHECK (
        (tiene_interes = FALSE) OR 
        (tiene_interes = TRUE AND tipo_interes IS NOT NULL AND valor_interes IS NOT NULL)
    )
);

-- Tabla de presupuestos mensuales
CREATE TABLE IF NOT EXISTS presupuestos (
    id SERIAL PRIMARY KEY,
    mes VARCHAR(7) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(mes, categoria, usuario_id)
);

-- Tabla de gastos recurrentes
CREATE TABLE IF NOT EXISTS gastos_recurrentes (
    id SERIAL PRIMARY KEY,
    descripcion TEXT NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    categoria VARCHAR(100) NOT NULL,
    forma_pago VARCHAR(100) NOT NULL,
    frecuencia VARCHAR(20) NOT NULL,
    dia_pago INTEGER,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabla de resúmenes de tarjeta
CREATE TABLE IF NOT EXISTS resumenes_tarjeta (
    id SERIAL PRIMARY KEY,
    tarjeta_id INTEGER REFERENCES tarjetas_credito(id) ON DELETE CASCADE,
    mes VARCHAR(7) NOT NULL,
    periodo VARCHAR(20) NOT NULL,
    saldo_anterior DECIMAL(12,2) DEFAULT 0,
    gastos_periodo DECIMAL(12,2) DEFAULT 0,
    pagos DECIMAL(12,2) DEFAULT 0,
    intereses DECIMAL(12,2) DEFAULT 0,
    saldo_actual DECIMAL(12,2) DEFAULT 0,
    pago_minimo DECIMAL(12,2),
    fecha_cierre DATE,
    fecha_vencimiento DATE,
    pagado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tarjeta_id, mes, periodo)
);

-- Tabla de pagos de tarjeta
CREATE TABLE IF NOT EXISTS pagos_tarjeta (
    id SERIAL PRIMARY KEY,
    tarjeta_id INTEGER REFERENCES tarjetas_credito(id) ON DELETE CASCADE,
    monto DECIMAL(12,2) NOT NULL,
    fecha DATE NOT NULL,
    forma_pago VARCHAR(50) NOT NULL,
    referencia VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabla de etiquetas
CREATE TABLE IF NOT EXISTS etiquetas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#8884D8',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabla relacional gastos-etiquetas
CREATE TABLE IF NOT EXISTS gastos_etiquetas (
    gasto_id INTEGER REFERENCES gastos(id) ON DELETE CASCADE,
    etiqueta_id INTEGER REFERENCES etiquetas(id) ON DELETE CASCADE,
    PRIMARY KEY (gasto_id, etiqueta_id)
);

-- =====================================================
-- 2. ÍNDICES
-- =====================================================

-- Índices para gastos
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria);
CREATE INDEX IF NOT EXISTS idx_gastos_forma_pago ON gastos(forma_pago);
CREATE INDEX IF NOT EXISTS idx_gastos_tipo_gasto ON gastos(tipo_gasto);
CREATE INDEX IF NOT EXISTS idx_gastos_es_cuota ON gastos(es_cuota);
CREATE INDEX IF NOT EXISTS idx_gastos_cuota_actual ON gastos(cuota_actual);
CREATE INDEX IF NOT EXISTS idx_gastos_gasto_original ON gastos(gasto_original_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha_compra ON gastos(fecha_compra);
CREATE INDEX IF NOT EXISTS idx_gastos_usuario ON gastos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_gastos_tarjeta ON gastos(tarjeta_credito_id);
CREATE INDEX IF NOT EXISTS idx_gastos_periodo_cierre ON gastos(periodo_cierre);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha_tipo ON gastos(fecha, tipo_gasto);

-- Índices para tarjetas
CREATE INDEX IF NOT EXISTS idx_tarjetas_usuario ON tarjetas_credito(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tarjetas_activa ON tarjetas_credito(activa);

-- Índices para presupuestos
CREATE INDEX IF NOT EXISTS idx_presupuestos_mes ON presupuestos(mes);
CREATE INDEX IF NOT EXISTS idx_presupuestos_categoria ON presupuestos(categoria);
CREATE INDEX IF NOT EXISTS idx_presupuestos_usuario ON presupuestos(usuario_id);

-- Índices para resúmenes
CREATE INDEX IF NOT EXISTS idx_resumenes_tarjeta_mes ON resumenes_tarjeta(tarjeta_id, mes);
CREATE INDEX IF NOT EXISTS idx_pagos_tarjeta_fecha ON pagos_tarjeta(fecha);

-- =====================================================
-- 3. VISTAS
-- =====================================================

-- Vista de gastos por mes
CREATE OR REPLACE VIEW vista_gastos_por_mes AS
SELECT 
    TO_CHAR(fecha, 'YYYY-MM') as mes,
    categoria,
    SUM(monto) as total
FROM gastos
WHERE tipo_gasto IN ('simple', 'credito_cuota')
GROUP BY TO_CHAR(fecha, 'YYYY-MM'), categoria
ORDER BY mes DESC, categoria;

-- Vista de resumen mensual
CREATE OR REPLACE VIEW vista_resumen_mensual AS
SELECT 
    TO_CHAR(fecha, 'YYYY-MM') as mes,
    COUNT(*) as cantidad_gastos,
    SUM(monto) as total_gastos,
    AVG(monto) as promedio_gasto,
    MAX(monto) as gasto_maximo,
    MIN(monto) as gasto_minimo
FROM gastos
WHERE tipo_gasto IN ('simple', 'credito_cuota')
GROUP BY TO_CHAR(fecha, 'YYYY-MM')
ORDER BY mes DESC;

-- Vista de cuotas pendientes
CREATE OR REPLACE VIEW vista_cuotas_pendientes AS
SELECT 
    g.id,
    g.descripcion,
    g.monto,
    g.fecha,
    g.cuota_actual,
    g.total_cuotas,
    g.gasto_original_id,
    gp.descripcion as compra_original,
    gp.fecha_compra,
    tc.nombre as tarjeta_nombre,
    tc.ultimos_digitos
FROM gastos g
LEFT JOIN gastos gp ON g.gasto_original_id = gp.id
LEFT JOIN tarjetas_credito tc ON g.tarjeta_credito_id = tc.id
WHERE g.tipo_gasto = 'credito_cuota'
    AND g.fecha >= CURRENT_DATE
    AND g.cuota_actual IS NOT NULL
ORDER BY g.fecha ASC;

-- =====================================================
-- 4. FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_categorias_updated_at 
    BEFORE UPDATE ON categorias 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formas_pago_updated_at 
    BEFORE UPDATE ON formas_pago 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gastos_updated_at 
    BEFORE UPDATE ON gastos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_presupuestos_updated_at 
    BEFORE UPDATE ON presupuestos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarjetas_credito_updated_at 
    BEFORE UPDATE ON tarjetas_credito 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar saldo de tarjeta
CREATE OR REPLACE FUNCTION actualizar_saldo_tarjeta()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tarjeta_credito_id IS NOT NULL AND NEW.tipo_gasto IN ('simple', 'credito_cuota') THEN
        UPDATE tarjetas_credito 
        SET saldo_actual = saldo_actual + NEW.monto,
            updated_at = NOW()
        WHERE id = NEW.tarjeta_credito_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar saldo
CREATE TRIGGER trigger_actualizar_saldo_tarjeta
    AFTER INSERT ON gastos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_saldo_tarjeta();

-- Función para revertir saldo
CREATE OR REPLACE FUNCTION revertir_saldo_tarjeta()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.tarjeta_credito_id IS NOT NULL AND OLD.tipo_gasto IN ('simple', 'credito_cuota') THEN
        UPDATE tarjetas_credito 
        SET saldo_actual = saldo_actual - OLD.monto,
            updated_at = NOW()
        WHERE id = OLD.tarjeta_credito_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger para revertir saldo
CREATE TRIGGER trigger_revertir_saldo_tarjeta
    BEFORE DELETE ON gastos
    FOR EACH ROW
    EXECUTE FUNCTION revertir_saldo_tarjeta();

-- Función para validar cuotas
CREATE OR REPLACE FUNCTION validar_cuota()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo_gasto = 'credito_cuota' AND NEW.cuota_actual IS NOT NULL THEN
        IF NEW.cuota_actual > NEW.total_cuotas THEN
            RAISE EXCEPTION 'La cuota actual no puede ser mayor al total de cuotas';
        END IF;
    END IF;
    
    IF NEW.tipo_gasto = 'credito_compra' THEN
        IF NEW.total_cuotas IS NULL OR NEW.monto_cuota IS NULL THEN
            RAISE EXCEPTION 'Las compras a crédito deben tener total_cuotas y monto_cuota definidos';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar cuotas
CREATE TRIGGER trigger_validar_cuota
    BEFORE INSERT OR UPDATE ON gastos
    FOR EACH ROW
    EXECUTE FUNCTION validar_cuota();

-- =====================================================
-- 5. DATOS POR DEFECTO
-- =====================================================

-- Insertar categorías por defecto
INSERT INTO categorias (nombre, color) VALUES
    ('Comida', '#10B981'),
    ('Transporte', '#3B82F6'),
    ('Entretenimiento', '#F59E0B'),
    ('Servicios', '#8B5CF6'),
    ('Salud', '#EF4444'),
    ('Educación', '#06B6D4'),
    ('Ropa', '#EC4899'),
    ('Hogar', '#F97316'),
    ('Tecnología', '#6366F1'),
    ('Otros', '#6B7280')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar formas de pago por defecto
INSERT INTO formas_pago (nombre, color) VALUES
    ('Efectivo', '#10B981'),
    ('Tarjeta de Crédito', '#3B82F6'),
    ('Tarjeta de Débito', '#6366F1'),
    ('Transferencia', '#8B5CF6'),
    ('Mercado Pago', '#F59E0B'),
    ('PayPal', '#0070BA'),
    ('Cripto', '#F7931A'),
    ('Otro', '#6B7280')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar entidades bancarias por defecto
INSERT INTO entidades (nombre, color) VALUES
    ('Visa', '#1A1F71'),
    ('Mastercard', '#EB001B'),
    ('American Express', '#006FCF'),
    ('Naranja', '#FF6B00'),
    ('Cabal', '#00A859'),
    ('Banco Nación', '#009B3A'),
    ('Banco Provincia', '#005C8A'),
    ('Santander', '#EC0000'),
    ('Galicia', '#FF6B00'),
    ('BBVA', '#004481')
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- 6. POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE formas_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarjetas_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_recurrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumenes_tarjeta ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_tarjeta ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_etiquetas ENABLE ROW LEVEL SECURITY;

-- Políticas para categorías
CREATE POLICY "Todos pueden ver categorías" ON categorias
    FOR SELECT USING (true);

-- Políticas para formas de pago
CREATE POLICY "Todos pueden ver formas de pago" ON formas_pago
    FOR SELECT USING (true);

-- Políticas para entidades
CREATE POLICY "Todos pueden ver entidades" ON entidades
    FOR SELECT USING (true);

-- Políticas para tarjetas de crédito
CREATE POLICY "Usuarios ven sus tarjetas" ON tarjetas_credito
    FOR ALL USING (auth.uid() = usuario_id);

-- Políticas para gastos
CREATE POLICY "Usuarios ven sus gastos" ON gastos
    FOR SELECT USING (auth.uid() = usuario_id OR usuario_id IS NULL);

CREATE POLICY "Usuarios insertan sus gastos" ON gastos
    FOR INSERT WITH CHECK (auth.uid() = usuario_id OR usuario_id IS NULL);

CREATE POLICY "Usuarios actualizan sus gastos" ON gastos
    FOR UPDATE USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios eliminan sus gastos" ON gastos
    FOR DELETE USING (auth.uid() = usuario_id);

-- Políticas para presupuestos
CREATE POLICY "Usuarios ven sus presupuestos" ON presupuestos
    FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios gestionan sus presupuestos" ON presupuestos
    FOR ALL USING (auth.uid() = usuario_id);

-- =====================================================
-- 7. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE categorias IS 'Almacena las categorías de gastos';
COMMENT ON TABLE formas_pago IS 'Almacena las formas de pago disponibles';
COMMENT ON TABLE entidades IS 'Entidades bancarias emisoras de tarjetas';
COMMENT ON TABLE tarjetas_credito IS 'Tarjetas de crédito del usuario';
COMMENT ON TABLE gastos IS 'Tabla principal que almacena todos los gastos';
COMMENT ON TABLE presupuestos IS 'Presupuestos mensuales por categoría';
COMMENT ON TABLE gastos_recurrentes IS 'Gastos que se repiten automáticamente';
COMMENT ON TABLE resumenes_tarjeta IS 'Resúmenes mensuales de tarjetas de crédito';
COMMENT ON TABLE pagos_tarjeta IS 'Registro de pagos de tarjetas de crédito';
COMMENT ON COLUMN gastos.tipo_gasto IS 'simple, credito_compra, credito_cuota';
COMMENT ON COLUMN gastos.periodo_cierre IS 'Mes del resumen de la tarjeta (YYYY-MM)';
COMMENT ON COLUMN gastos.fecha_cierre_calculada IS 'Fecha real de cierre según día de cierre de la tarjeta';

-- =====================================================
-- 8. RESPALDOS DE DATOS EXISTENTES (OPCIONAL)
-- =====================================================

-- Exportar datos existentes (ejecutar solo si necesitas respaldar datos actuales)
-- SELECT * FROM categorias;
-- SELECT * FROM formas_pago;
-- SELECT * FROM entidades;
-- SELECT * FROM tarjetas_credito;
-- SELECT * FROM gastos;
-- SELECT * FROM presupuestos;

-- =====================================================
-- FIN DEL BACKUP
-- =====================================================