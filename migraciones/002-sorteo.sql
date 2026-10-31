-- Agrega el sorteo compartido a una base que ya tiene datos.
-- Aplicar una sola vez:
--   npx wrangler d1 execute rafma-db --remote --file=./migraciones/002-sorteo.sql
-- O pegando todo esto en la consola de D1 del panel de Cloudflare.

-- Cada tirada del sorteo, con el reparto completo en JSON. Manda la última:
-- rehacer las mesas inserta una fila nueva en vez de pisar la anterior.
CREATE TABLE IF NOT EXISTS sorteos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  datos TEXT NOT NULL,
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Los anfitriones no entran al reparto: pasan derecho a la final.
ALTER TABLE participantes ADD COLUMN anfitrion INTEGER NOT NULL DEFAULT 0;

-- Maqui y Rafo, por su alias. Si alguno lo cambió, marcarlo por su DNI:
--   UPDATE participantes SET anfitrion = 1 WHERE dni IN ('...', '...');
UPDATE participantes SET anfitrion = 1 WHERE alias IN ('Rafo', 'Maqui');

-- La comprobación: tienen que salir dos filas. Si sale una sola o ninguna,
-- el sorteo los metería a jugar en vez de pasarlos a la final.
SELECT nombre, apellidos, alias FROM participantes WHERE anfitrion = 1;
