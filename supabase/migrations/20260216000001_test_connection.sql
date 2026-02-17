-- Migración de prueba de conexión
-- Insertamos un item en Marketplace para verificar que GitHub Actions funciona correctamente.

INSERT INTO public.marketplace (item_name, description, price, stock, category)
VALUES (
  'Prueba de Conexión Exitoso', 
  'Este item confirma que Antigravity se conectó con GitHub y GitHub actualizó Supabase automáticamente.', 
  0, 
  1, 
  'test'
);
