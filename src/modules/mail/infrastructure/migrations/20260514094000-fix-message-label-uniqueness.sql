-- Evita duplicados de etiquetas de sistema/modulo (owner_user_id NULL)
-- y mantiene unicidad real por (owner_user_id, key).

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY coalesce(owner_user_id::text, '00000000-0000-0000-0000-000000000000'), key
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM message_labels
)
DELETE FROM message_labels
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

DROP INDEX IF EXISTS uq_message_labels_owner_key_normalized;
CREATE UNIQUE INDEX IF NOT EXISTS uq_message_labels_owner_key_normalized
ON message_labels ((coalesce(owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid)), key);
