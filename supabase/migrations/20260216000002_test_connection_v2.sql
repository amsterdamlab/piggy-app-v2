-- Prueba de conexion v2
-- Verifica que el pipeline Antigravity -> GitHub -> Supabase funciona.

INSERT INTO public.marketplace (item_name, description, price, stock, category)
VALUES (
  'Test Conexion v2',
  'Pipeline CI/CD verificado exitosamente.',
  0,
  1,
  'test'
);
