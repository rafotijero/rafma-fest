# RAFMA Fest — Estado del proyecto

## Qué es esto

Landing page para la 2da edición del RAFMA Fest (sábado 10 de octubre de 2026), con formulario de registro de asistentes y una sección de participantes para el sorteo de mesas del torneo.

## Estructura actual

```
public/                 → el sitio estático que ve el visitante
  index.html            → estructura de la página
  styles.css            → todos los estilos
  script.js             → interactividad del formulario + carga dinámica de participantes
worker.js               → punto de entrada del Worker: enruta /api/* a los handlers
src/
  registro.js           → POST /api/registro — valida y guarda en D1
  participantes.js      → GET /api/participantes — devuelve la lista desde D1
  http.js               → helper json() para las respuestas
wrangler.toml           → config del Worker: assets desde public/ + binding D1
schema.sql              → definición de la tabla participantes (ya aplicada en D1)
package.json            → sin dependencias; scripts dev/deploy con wrangler
```

Es un **Worker con static assets**: Cloudflare sirve primero los archivos de `public/`, y
cualquier ruta que no corresponda a un archivo (como `/api/registro`) cae al Worker.

> Nota: el proyecto nació escrito para Cloudflare Pages (`functions/` con `onRequestPost`/
> `onRequestGet`). Se migró a Workers porque Cloudflare ya no ofrece crear proyectos Pages
> nuevos desde el dashboard.

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

## Estado del despliegue

- [x] Base de datos D1 `rafma-db` creada (id en `wrangler.toml`)
- [x] Tabla `participantes` creada con `schema.sql`
- [ ] Worker creado en Cloudflare conectado al repo `rafotijero/rafma-fest`
- [ ] Dominio `rafma.rafotijero.dev`

### Crear el Worker
- Dashboard → Compute → Workers & Pages → Create → Import a repository
- Repo: `rafotijero/rafma-fest`
- Build command: vacío. Deploy command: `npx wrangler deploy`
- El binding D1 no se configura en el dashboard: sale de `wrangler.toml`

### Dominio personalizado
- Worker → Settings → Domains & Routes → Add → Custom domain → `rafma.rafotijero.dev`
- Cloudflare agrega el DNS automáticamente porque `rafotijero.dev` ya está en la cuenta

## Pendiente: funcionalidades futuras

- **Ludoteca** — catálogo real de juegos (actualmente es un placeholder).
- **Sorteo de mesas** — lógica para repartir asistentes en mesas de 5, registrar ganador por mesa y avance a la final. Nueva sección o vista para mostrar mesas y bracket.
