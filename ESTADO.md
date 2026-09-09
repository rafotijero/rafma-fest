# RAFMA Fest — Estado del proyecto

## Qué es esto

Landing page para la 2da edición del RAFMA Fest (sábado 10 de octubre de 2026), con formulario de registro de asistentes y una sección de participantes para el sorteo de mesas del torneo.

## Estructura actual

```
index.html              → estructura de la página
styles.css              → todos los estilos
script.js               → interactividad del formulario + carga dinámica de participantes
wrangler.toml           → config de Cloudflare Pages + binding D1 (falta poner el database_id real)
schema.sql              → definición de la tabla participantes para D1
functions/
  api/
    registro.js         → POST /api/registro — valida y guarda en D1
    participantes.js    → GET /api/participantes — devuelve la lista desde D1
index.js                → placeholder sin uso (queda de la plantilla inicial)
package.json            → sin dependencias reales todavía
```

Sitio estático con Cloudflare Pages Functions como backend y D1 como base de datos.
**El backend está implementado en el código pero aún no está conectado en Cloudflare** (ver siguiente sección).

## Secciones de la página

- **Invitación** — hero con logo, fecha, ubicación (link a Google Maps) y frase de invitación.
- **Ludoteca** — placeholder "Próximamente", pendiente de catálogo de juegos.
- **Asistencia** — formulario de registro:
  - Nombre, Apellidos, DNI (8 dígitos)
  - Alias de jugador (opcional) + checkbox para usar el nombre en su lugar
  - Experiencia en juegos de mesa (Tutorial / Casual / Estratega / Deidad)
  - Frase que te define (selector con 8 opciones + "Otro" para escribir la propia)
  - Al enviar, hace `fetch POST /api/registro` y muestra confirmación o error inline.
- **Participantes** — tarjetas cargadas dinámicamente desde `GET /api/participantes`. El grid está vacío en el HTML; se llena con JS al cargar la página.

## Pendiente: configurar Cloudflare

El código está listo y subido a GitHub. Solo falta conectarlo en Cloudflare:

### 1. Crear el proyecto en Cloudflare Pages
- Ir a dash.cloudflare.com → Workers & Pages → Create → Pages
- Conectar el repo `rafotijero/rafma-fest` en GitHub
- Build command: vacío. Build output directory: `/`
- Hacer el primer deploy

### 2. Crear la base de datos D1
```bash
npm install -g wrangler
wrangler login
wrangler d1 create rafma-db
# Copia el database_id que te devuelve
```
- Pegar el `database_id` en `wrangler.toml` (reemplazar `PLACEHOLDER_REPLACE_WITH_REAL_ID`)
- Crear la tabla:
```bash
wrangler d1 execute rafma-db --remote --file=schema.sql
```
- Hacer commit y push del `wrangler.toml` actualizado

### 3. Conectar el binding D1 en Pages
- En el dashboard → proyecto Pages → Settings → Bindings → Add → D1 database
- Variable name: `DB`, base de datos: `rafma-db`
- Guardar y redeploy

### 4. Dominio personalizado
- En el proyecto Pages → Custom domains → `rafma.rafotijero.dev`
- Cloudflare agrega el DNS automáticamente si `rafotijero.dev` ya está en Cloudflare

## Pendiente: funcionalidades futuras

- **Ludoteca** — catálogo real de juegos (actualmente es un placeholder).
- **Sorteo de mesas** — lógica para repartir asistentes en mesas de 5, registrar ganador por mesa y avance a la final. Nueva sección o vista para mostrar mesas y bracket.
