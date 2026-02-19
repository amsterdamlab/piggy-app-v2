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

-- 3. Insertar Aliados (con datos extendidos)
INSERT INTO public.allies (name, category, location, discount_info, image_url, description, specialty, benefit)
VALUES
('Carnes Don Julio', 'Carnicería', 'Cali, Valle del Cauca', '15% de descuento en cortes premium', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80', 'Cortes selectos madurados y frescos para tus asados de fin de semana.', 'Cortes Premium', '15% de descuento en Punta de Anca'),
('Restaurante El Fogón', 'Restaurante', 'Bogotá, Cundinamarca', '10% en platos con cerdo', 'https://images.unsplash.com/photo-1544025162-d76690b6d012?auto=format&fit=crop&w=800&q=80', 'Sabor tradicional con ingredientes del campo directo a tu mesa.', 'Comida Típica', 'Postre gratis por consumo > $50k'),
('SuperCarnes Express', 'Distribuidor', 'Medellín, Antioquia', 'Entrega gratuita en Medellín', 'https://images.unsplash.com/photo-1586882829491-b81178aa622e?auto=format&fit=crop&w=800&q=80', 'Abastecemos tu negocio con la mejor carne de cerdo de la región.', 'Venta al Por Mayor', 'Envío gratis en pedidos mayoristas'),
('La Parrilla de Pepe', 'Restaurante', 'Cali, Valle del Cauca', '2x1 los jueves en platos de cerdo', 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=800&q=80', 'Expertos en cocción lenta al barril. Chicharrón ahumado inigualable.', 'Parrilla & Barril', '2x1 los jueves en platos de cerdo');
