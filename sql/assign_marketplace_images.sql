-- Script to assign deterministic images to marketplace items based on category and stage
UPDATE public.marketplace
SET image_url = 'assets/piggies/stage1/et1-1.jpg'
WHERE category = 'standard';

UPDATE public.marketplace
SET image_url = 'assets/piggies/stage2/et2-1.jpg'
WHERE category = 'advanced' AND current_month = 2;

UPDATE public.marketplace
SET image_url = 'assets/piggies/stage2/et2-2.jpg'
WHERE category = 'advanced' AND current_month = 3;

UPDATE public.marketplace
SET image_url = 'assets/piggies/stage1/et1-2.jpg'
WHERE category = 'silver';

UPDATE public.marketplace
SET image_url = 'assets/piggies/stage1/et1-3.jpg'
WHERE category = 'gold';

UPDATE public.marketplace
SET image_url = 'assets/piggies/stage1/et1-4.jpg'
WHERE category = 'premium';
