-- Semilla de Datos (Seed Data) para Piggy App
-- Ejecuta este script después de crear las tablas para tener contenido inicial.

-- 1. Limpiar tablas (Opcional, cuidado en producción)
-- TRUNCATE public.marketplace, public.allies RESTART IDENTITY;

-- 2. Insertar Marketplace Items (De mockData.js)
INSERT INTO public.marketplace (item_name, description, price, extra_roi, stock, category)
VALUES
('Piggy Estándar', 'Comienza tu camino en el agro. Un cerdo de raza clásica con rendimiento sólido.', 1000000, 0, 50, 'standard'),
('Piggy Premium', 'Cerdo de raza premium con alimentación especial. Bono de +1% adicional.', 1200000, 0.01, 20, 'accelerator'),
('Piggy Elite', 'Cerdo élite con genética superior y cuidado personalizado. Bono de +2% adicional.', 1500000, 0.02, 10, 'accelerator'),
('Acelerador Nutricional', 'Suplemento premium que mejora el crecimiento. +1% al cerdo seleccionado.', 150000, 0.01, 100, 'booster');

-- 3. Insertar Aliados (De mockData.js)
INSERT INTO public.allies (name, category, location, discount_info)
VALUES
('Carnes Don Julio', 'Carnicería', 'Cali, Valle del Cauca', '15% de descuento en cortes premium'),
('Restaurante El Fogón', 'Restaurante', 'Bogotá, Cundinamarca', '10% en platos con cerdo'),
('SuperCarnes Express', 'Distribuidor', 'Medellín, Antioquia', 'Entrega gratuita en Medellín'),
('La Parrilla de Pepe', 'Restaurante', 'Cali, Valle del Cauca', '2x1 los jueves en platos de cerdo');
