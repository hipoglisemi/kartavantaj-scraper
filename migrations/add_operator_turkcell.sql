-- 1. Add "Operatör" to master_banks (if not exists)
INSERT INTO master_banks (id, name, slug)
VALUES ('operator', 'Operatör', 'operator')
ON CONFLICT (id) DO NOTHING;

-- 2. Add "Operatör" to banks (if not exists)
INSERT INTO banks (id, name, slug)
VALUES ('operator', 'Operatör', 'operator')
ON CONFLICT (id) DO NOTHING;

-- 3. Add "Turkcell" to cards
INSERT INTO cards (id, name, slug, bank_id, image_url)
VALUES ('turkcell', 'Turkcell', 'turkcell', 'operator', '/logos/cards/operatorturkcell.png')
ON CONFLICT (id) DO NOTHING;

-- 4. Add config to bank_configs
INSERT INTO bank_configs (bank_id, config)
VALUES (
  'operator',
  '{
    "name": "Operatör",
    "slug": "operator",
    "cards": [
      {
        "id": "turkcell",
        "name": "Turkcell",
        "slug": "turkcell"
      }
    ],
    "aliases": ["turkcell", "operatör", "operatorler"]
  }'::jsonb
)
ON CONFLICT (bank_id) DO UPDATE 
SET config = EXCLUDED.config;
