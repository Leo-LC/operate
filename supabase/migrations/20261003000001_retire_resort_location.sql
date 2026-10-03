-- Retire le pseudo-shop "Resort" : ce n'est pas une vraie boutique
-- (absent des codes shops, sans mapping Loyverse ni GBP) mais il pollue
-- tous les sélecteurs de boutiques. Soft-delete pour préserver l'historique :
-- les requêtes filtrent sur is_active = true, il disparaît donc partout
-- (Direction, Daily P&L, compta, finance, challenges).
-- Les écritures historiques (daily_entries, snapshots, compteurs) sont conservées.
UPDATE locations
SET is_active = false, updated_at = now()
WHERE slug = 'resort' AND is_active = true;

-- Désactive aussi ses règles de coûts récurrents (loyer 114k, Dara,
-- Bookings, Social media, Ingon) : elles ne doivent plus alimenter les
-- estimations une fois la boutique retirée.
UPDATE recurring_costs
SET is_active = false, updated_at = now()
WHERE is_active = true
  AND location_id IN (SELECT id FROM locations WHERE slug = 'resort');
