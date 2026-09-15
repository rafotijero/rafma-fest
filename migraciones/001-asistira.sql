-- Agrega la baja de asistencia a una base que ya tiene datos.
-- Aplicar una sola vez:
--   npx wrangler d1 execute rafma-db --remote --file=./migraciones/001-asistira.sql
ALTER TABLE participantes ADD COLUMN asistira INTEGER NOT NULL DEFAULT 1;
ALTER TABLE participantes ADD COLUMN fecha_baja TEXT;
