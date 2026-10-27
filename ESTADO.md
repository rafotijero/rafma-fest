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
  ludoteca.js           → GET /api/ludoteca — resumen del catálogo de ludoteca.rafotijero.dev
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

En este orden: **Invitación → Programa → Asistencia → Participantes → Ludoteca → A jugar.**

- **Invitación** — hero con logo, fecha, ubicación (link a Google Maps) y frase de invitación.
  El "Descubre más" del final es un enlace a `#programa`, que es la sección que sigue.
- **Programa** — el cronograma de la noche, en HTML fijo. Siete hitos: llegada (6:00),
  piqueos y tragos (7:30), "Una RAFMA historia" (8:30, una fábula con premio a las tres
  personas más atentas), Torneo de Mesas (10:00), final y premiaciones (11:00), Happy Birthday (medianoche)
  y mesa libre (12:30 a.m.). Cada hito es una ficha con su hora al costado; el color sale de
  un ciclo de cuatro que se repite solo, salvo el cumpleaños, que lleva `.hito-cumple` y va
  siempre en rosado. El de las 10 enlaza a la sección "A jugar", de donde salen esas mesas.
  Si cambian los horarios se editan a mano en `public/index.html`; no vienen de la base.
- **Asistencia** — formulario de registro:
  - Nombre, Apellidos, DNI/CE (8 a 10 dígitos)
  - Alias de jugador (opcional) + checkbox para usar el nombre en su lugar
  - Experiencia en juegos de mesa (Tutorial / Casual / Estratega / Deidad)
  - Frase que te define (selector con 8 opciones + "Otro" para escribir la propia)
  - Al enviar, hace `fetch POST /api/registro` y muestra confirmación o error inline.
- **Participantes** — tarjetas cargadas dinámicamente desde `GET /api/participantes`. El grid está vacío en el HTML; se llena con JS al cargar la página. Debajo, una nota anónima con cuántos avisaron que ya no vienen (no aparece si no hay ninguno).
- **Ludoteca** — vitrina del catálogo que vive en https://ludoteca.rafotijero.dev/, con la
  cuenta de juegos, tres pastillas de datos, ocho portadas al azar (cada una enlaza a su
  ficha) y un botón a la ludoteca. Los datos llegan de `GET /api/ludoteca`; si esa llamada
  falla, la tarjeta se queda con el texto y el botón que ya trae el HTML.
- **A jugar** — un botón que sortea cinco mesas: a cada una le toca un juego de la
  ludoteca y un grupo de los confirmados. Se puede volver a sortear las veces que sea.
  Todo pasa en el navegador con las dos listas ya cargadas, sin pedir nada de nuevo.

### Editar un registro

Cualquiera puede editar su ficha escribiendo el DNI con el que se registró:
`POST /api/consulta` trae los datos, el formulario se rellena en modo edición
(DNI bloqueado, botón "Guardar mis cambios") y `PUT /api/registro` los actualiza.

La frase se guarda como texto, no como clave, así que al rellenar el formulario se busca
la opción del `<select>` cuyo texto coincide; si no coincide ninguna, es una frase
personalizada y se selecciona "Otro".

### La ludoteca es otro sitio

El catálogo es un proyecto aparte (`ludoteca.rafotijero.dev`) y su `data/juegos.json` no
manda cabeceras CORS, así que el navegador no puede pedirlo directo desde esta página.
`GET /api/ludoteca` lo trae desde el Worker y devuelve solo lo que necesita la vitrina:
la cuenta, los números (jugadores, duración mínima, categorías) y la lista de
`{ slug, nombre, imagen, jugadores }` con las URL de imagen ya absolutas. El rango de
jugadores no se muestra en ningún lado: lo usa el sorteo para elegir juego.
Se cachea una hora en Cloudflare y otra en el navegador.

> Ojo al probar: ese caché de una hora es del **navegador**. Si cambias lo que devuelve
> el endpoint, la página sigue viendo la respuesta vieja hasta que recargues sin caché.

Las fichas individuales cuelgan de `#/juego/<slug>` en ese mismo dominio. El dominio se
escribe en un solo sitio, `src/ludoteca.js`: el front arma los enlaces con la `url` que
viene en la respuesta.

### Cómo reparte el sorteo

Está todo en `sortearMesas()`. Tres reglas que no se ven en la pantalla:

- **Mesas de dos para arriba.** Son `min(5, floor(confirmados / 2))` mesas, con una
  mínima: con 9 confirmados salen 4 mesas, no 5 con alguien jugando solo.
- **Primero el tamaño, después el juego.** Se reparte a la gente lo más parejo posible
  (21 en 5 mesas → 5, 4, 4, 4, 4) y recién entonces cada mesa sortea su juego entre los
  que admiten ese número exacto de jugadores. Si no queda ninguno que cuadre, se usa
  cualquiera y el aviso lo dice.
- **Sin repetir juego** dentro de la misma tirada.

La gente sale de `GET /api/participantes` y los juegos de `GET /api/ludoteca`, ambas ya
cargadas al abrir la página y guardadas en `confirmados` y `catalogo`. El nombre que se
muestra es el alias, o el nombre de pila si la persona eligió usarlo.

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

- **Sorteo compartido** — hoy el sorteo de "A jugar" pasa entero en el navegador y no se
  guarda en ningún lado: cada quien que aprieta el botón ve un reparto distinto, y el
  que armó Rafo en su celular no es el que ve nadie más. Para el sábado 31 conviene que
  haya una sola tirada válida: una tabla en D1 con el sorteo vigente (fecha, y por mesa
  el juego y los DNI que le tocaron), un `POST /api/sorteo` que lo arme y lo guarde, y un
  `GET /api/sorteo` que devuelva el último. Decidir también quién puede sortear, porque
  si el botón queda abierto cualquiera rehace las mesas en medio de la noche.
- **Torneo** — el reparto en mesas ya está (sección "A jugar"), falta lo de competencia:
  registrar el ganador de cada mesa y armar el avance a la final con su bracket. Depende
  del sorteo compartido: sin una tirada guardada no hay mesas a las que ponerles ganador.
