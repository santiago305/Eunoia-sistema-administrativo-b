-- Fase 6 fix:
-- scheduled_at debe ser timestamptz para respetar hora exacta al programar
-- desde clientes con distintas zonas horarias.
--
-- Nota: tratamos valores existentes como UTC para preservar el instante
-- enviado previamente por el frontend (ISO con zona).

ALTER TABLE messages
  ALTER COLUMN scheduled_at TYPE timestamptz
  USING (
    CASE
      WHEN scheduled_at IS NULL THEN NULL
      ELSE scheduled_at AT TIME ZONE 'UTC'
    END
  );
