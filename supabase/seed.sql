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
INSERT INTO public.allies (name, category, location, discount_info, image_url, description, specialty, benefit, phone, address)
VALUES
('Carnes Don Julio', 'Carnicería', 'Cali, Valle del Cauca', '15% de descuento en cortes premium', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80', 'Cortes selectos madurados y frescos para tus asados de fin de semana.', 'Cortes Premium', '15% de descuento en Punta de Anca', '310 123 4567', 'Av. Pasoancho # 50-20'),
('Restaurante El Fogón', 'Restaurante', 'Bogotá, Cundinamarca', '10% en platos con cerdo', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80', 'Sabor tradicional con ingredientes del campo directo a tu mesa.', 'Comida Típica', 'Postre gratis por consumo > $50k', '312 456 7890', 'San Antonio Cra 4 # 2-10'),
('SuperCarnes Express', 'Distribuidor', 'Medellín, Antioquia', 'Entrega gratuita en Medellín', 'https://images.unsplash.com/photo-1615937651188-4b92cd38052e?auto=format&fit=crop&w=800&q=80', 'Abastecemos tu negocio con la mejor carne de cerdo de la región.', 'Venta al Por Mayor', 'Envío gratis en pedidos mayoristas', '300 555 1234', 'Centro, Calle 50 # 40-20'),
('La Parrilla de Pepe', 'Restaurante', 'Cali, Valle del Cauca', '2x1 los jueves en platos de cerdo', 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=800&q=80', 'Expertos en cocción lenta al barril. Chicharrón ahumado inigualable.', 'Parrilla & Barril', '2x1 los jueves en platos de cerdo', '315 987 6543', 'Granada Calle 9 # 12-45'),
('Huellitas Felices', 'Petshop', 'Bogotá, Cundinamarca', '10% en Baño y Peluquería', 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=800&q=80', 'Todo para consentir a tu peludo. Baño, peluquería y juguetes.', 'Alimentos y Spa', '10% en Baño y Peluquería', '312 456 7890', 'Av. Principal # 45-12'),
('El Barbero', 'Barbería', 'Cali, Valle del Cauca', '2x1 en corte de cabello y barba', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80', 'Estilo y tradición. Afeitado con toalla caliente y los mejores cortes.', 'Cortes Clásicos', '2x1 en corte de cabello y barba', '315 789 1234', 'Calle 10 # 20-30');
