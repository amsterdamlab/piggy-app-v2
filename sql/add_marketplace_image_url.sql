-- Script to add image_url column to the marketplace table
ALTER TABLE public.marketplace ADD COLUMN IF NOT EXISTS image_url text;
