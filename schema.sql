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
  fecha_registro TEXT NOT NULL DEFAULT (datetime('now'))
);
