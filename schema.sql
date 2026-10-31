CREATE TABLE IF NOT EXISTS participantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  alias TEXT,
  usa_nombre INTEGER NOT NULL DEFAULT 0,
  experiencia TEXT NOT NULL,
  frase TEXT NOT NULL,
  -- 1 = viene, 0 = se dio de baja. No borramos la fila: así puede volver
  -- a confirmar sin escribir todo otra vez y nos queda el historial.
  asistira INTEGER NOT NULL DEFAULT 1,
  fecha_baja TEXT,
  -- Los anfitriones no entran al sorteo: pasan derecho a la final.
  anfitrion INTEGER NOT NULL DEFAULT 0,
  fecha_registro TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cada tirada del sorteo de mesas, con el reparto completo en JSON. Manda la
-- última: rehacer las mesas inserta una fila nueva en vez de pisar la anterior.
CREATE TABLE IF NOT EXISTS sorteos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  datos TEXT NOT NULL,
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);
