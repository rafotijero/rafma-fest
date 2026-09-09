CREATE TABLE IF NOT EXISTS participantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  alias TEXT,
  usa_nombre INTEGER NOT NULL DEFAULT 0,
  experiencia TEXT NOT NULL,
  frase TEXT NOT NULL,
  fecha_registro TEXT NOT NULL DEFAULT (datetime('now'))
);
