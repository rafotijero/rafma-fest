# RAFMA Fest — Estado del proyecto

## Qué es esto

Landing page para la 2da edición del RAFMA Fest (sábado 31 de octubre de 2026, 6:00 p.m.), con formulario de registro de asistentes y una sección de participantes para el sorteo de mesas del torneo.

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
  asistencia.js         → POST /api/asistencia — baja / regreso a la lista
  participantes.js      → GET /api/participantes — lista de confirmados + nº de bajas
  validacion.js         → catálogo de frases y validación compartida
  http.js               → helper json() para las respuestas
wrangler.toml           → config del Worker: assets desde public/ + binding D1
schema.sql              → definición de la tabla participantes (ya aplicada en D1)
migraciones/            → cambios de esquema sobre una base que ya tiene datos
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
  Bajo la fecha hay una píldora de aviso (`.date-change`) porque el fest se reprogramó del
  10 al 31 de octubre; **quitarla cuando ya todos estén al tanto.**
- **Asistencia** — formulario de registro:
  - Nombre, Apellidos, DNI/CE (8 a 10 dígitos)
  - Alias de jugador (opcional) + checkbox para usar el nombre en su lugar
  - Experiencia en juegos de mesa (Tutorial / Casual / Estratega / Deidad)
  - Frase que te define (selector con 8 opciones + "Otro" para escribir la propia)
  - Al enviar, hace `fetch POST /api/registro` y muestra confirmación o error inline.
- **Participantes** — tarjetas cargadas dinámicamente desde `GET /api/participantes`. El grid está vacío en el HTML; se llena con JS al cargar la página. Debajo, una nota anónima con cuántos avisaron que ya no vienen (no aparece si no hay ninguno).
- **Ludoteca** — placeholder "Próximamente", pendiente de catálogo de juegos. Va al final.

### Editar un registro

Cualquiera puede editar su ficha escribiendo el DNI con el que se registró:
`POST /api/consulta` trae los datos, el formulario se rellena en modo edición
(DNI bloqueado, botón "Guardar mis cambios") y `PUT /api/registro` los actualiza.

La frase se guarda como texto, no como clave, así que al rellenar el formulario se busca
la opción del `<select>` cuyo texto coincide; si no coincide ninguna, es una frase
personalizada y se selecciona "Otro".

### Darse de baja (y volver)

Quien ya no pueda ir entra en modo edición con su DNI y usa **"No podré asistir"**. Pide
una confirmación en el mismo formulario —sin `confirm()` del navegador— y llama a
`POST /api/asistencia` con `{ dni, asistira: false }`.

Al confirmar la baja, la despedida sale de `DESPEDIDAS` en `script.js`, cuatro frases al
azar del tipo "No será lo mismo sin ti", para que no suene a trámite.

**No se borra la fila:** se marca `asistira = 0` y se guarda `fecha_baja`. Así quien se
dio de baja puede volver sin reescribir su ficha (le sale el botón "Sí podré ir, cuéntenme
de nuevo"), sabemos quién avisó en vez de verlo desaparecer, y no se pierde nada si alguien
aprieta el botón por error.

`GET /api/participantes` devuelve `{ lista, bajas }`: `lista` son los que vienen
(`asistira = 1`) y `bajas` es **solo el número** de los que no. La página muestra "3
personas avisaron que ya no podrán venir" sin nombres — quien no puede venir no queda
expuesto en una lista pública. Los nombres nunca salen del servidor por esta ruta.

Editar los datos (`PUT /api/registro`) no toca `asistira`: son cosas distintas a propósito,
guardar cambios no te vuelve a inscribir ni te da de baja.

> El día que haya que armar las mesas, los dados de baja siguen en la tabla. Para verlos:
> `SELECT nombre, apellidos, fecha_baja FROM participantes WHERE asistira = 0`.

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
- [x] Migración `migraciones/001-asistira.sql` aplicada en la base **remota**
- [x] Worker `rafma-fest` conectado al repo `rafotijero/rafma-fest` — cada push a `main` despliega solo
- [x] Dominio `rafma.rafotijero.dev`

**El sitio vive en https://rafma.rafotijero.dev** (la URL `rafma-fest.rafo-tijero.workers.dev`
sigue respondiendo, pero la canónica es la del dominio propio).

### Vista previa al compartir el enlace

El `<head>` lleva etiquetas Open Graph para que WhatsApp, Facebook, LinkedIn y Telegram
muestren título, descripción e imagen. La imagen es `public/og.png`, de 1200x630: el logo
del hero compuesto sobre el fondo crema con un script de un solo uso, sin dependencias.

> `og:url` y `og:image` **tienen que ser URL absolutas**. Si el dominio cambia, hay que
> editarlas a mano en `public/index.html`; no se resuelven solas.

Para regenerar `og.png` si el logo cambia: extraer el base64 del `<img class="logo-img">`
y centrarlo en un lienzo de 1200x630 con el color `--cream` (#fdf7ec).

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
