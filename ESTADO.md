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
  registro.js           → POST /api/registro (alta) y PUT /api/registro (edición)
  consulta.js           → POST /api/consulta — busca un registro por DNI
  participantes.js      → GET /api/participantes — devuelve la lista desde D1
  validacion.js         → catálogo de frases y validación compartida
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

En este orden: **Invitación → Asistencia → Participantes → Ludoteca.**

- **Invitación** — hero con logo, fecha, ubicación (link a Google Maps) y frase de invitación.
  El "Descubre más" del final es un enlace a `#confirmar`.
- **Asistencia** — formulario de registro:
  - Nombre, Apellidos, DNI (8 dígitos)
  - Alias de jugador (opcional) + checkbox para usar el nombre en su lugar
  - Experiencia en juegos de mesa (Tutorial / Casual / Estratega / Deidad)
  - Frase que te define (selector con 8 opciones + "Otro" para escribir la propia)
  - Al enviar, hace `fetch POST /api/registro` y muestra confirmación o error inline.
- **Participantes** — tarjetas cargadas dinámicamente desde `GET /api/participantes`. El grid está vacío en el HTML; se llena con JS al cargar la página.
- **Ludoteca** — placeholder "Próximamente", pendiente de catálogo de juegos. Va al final.

### Editar un registro

Cualquiera puede editar su ficha escribiendo el DNI con el que se registró:
`POST /api/consulta` trae los datos, el formulario se rellena en modo edición
(DNI bloqueado, botón "Guardar mis cambios") y `PUT /api/registro` los actualiza.

La frase se guarda como texto, no como clave, así que al rellenar el formulario se busca
la opción del `<select>` cuyo texto coincide; si no coincide ninguna, es una frase
personalizada y se selecciona "Otro".

> **El DNI es la única credencial.** Quien conozca el DNI de otra persona puede editar su
> ficha, y probando números se puede averiguar si alguien está inscrito. Es una decisión
> consciente: para un RSVP entre conocidos el riesgo es aceptable y evita contraseñas.

### Responsive

Por debajo de 768px el menú superior se oculta —se apretaba y se rompía— y la navegación
es por scroll. En escritorio, `scroll-padding-top` compensa el nav fijo para que los
enlaces internos no dejen el título tapado.

## Estado del despliegue

- [x] Base de datos D1 `rafma-db` creada (id en `wrangler.toml`)
- [x] Tabla `participantes` creada con `schema.sql`
- [x] Worker `rafma-fest` conectado al repo `rafotijero/rafma-fest` — cada push a `main` despliega solo
- [ ] Dominio `rafma.rafotijero.dev`

URL actual: https://rafma-fest.rafo-tijero.workers.dev

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
