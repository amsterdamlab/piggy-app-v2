-- Script to assign random coherent images to marketplace items based on their current month (stage)
UPDATE public.marketplace
SET image_url = 'assets/piggies/stage1/et1-' || floor(random() * 5 + 1)::int || '.jpg'
WHERE current_month < 2;

UPDATE public.marketplace
SET image_url = 'assets/piggies/stage2/et2-' || floor(random() * 5 + 1)::int || '.jpg'
WHERE current_month >= 2 AND current_month < 4;

UPDATE public.marketplace
SET image_url = 'assets/piggies/stage3/et3-' || floor(random() * 5 + 1)::int || '.jpg'
WHERE current_month >= 4;
