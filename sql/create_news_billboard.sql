-- ============================================
-- PIGGY APP — News Billboard Migration
-- ============================================

CREATE TABLE IF NOT EXISTS public.news_billboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    action_url TEXT, -- Enlace de redirección opcional al hacer clic en la imagen
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.news_billboard ENABLE ROW LEVEL SECURITY;

-- Allow read access to active billboard slides for all authenticated users
DROP POLICY IF EXISTS "Allow read access to active news" ON public.news_billboard;
CREATE POLICY "Allow read access to active news" 
ON public.news_billboard
FOR SELECT 
TO authenticated
USING (is_active = TRUE);

-- Insert 3 sample images with action URLs
INSERT INTO public.news_billboard (image_url, action_url, sort_order, is_active) VALUES
('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', '#/gourmet', 1, TRUE),
('https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1200&q=80', '#/mercado', 2, TRUE),
('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com', 3, TRUE);
