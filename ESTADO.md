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
  participantes.js      → GET /api/participantes — lista de confirmados
  ludoteca.js           → GET /api/ludoteca — resumen del catálogo de ludoteca.rafotijero.dev
  sorteo.js             → GET/POST /api/sorteo — la tirada de mesas vigente
  validacion.js         → catálogo de frases y validación compartida
  http.js               → helper json() para las respuestas
wrangler.toml           → config del Worker: assets desde public/ + binding D1
schema.sql              → definición de las tablas participantes y sorteos (ya aplicada en D1)
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
- **A jugar** — las cuatro mesas de la noche y la final, con quién se sienta en cada
  una. El sorteo lo arma el servidor y lo ve igual todo el mundo; sortear de nuevo pide
  el PIN de anfitrión. La final va aparte, en dorado, con los anfitriones ya dentro.

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

El sorteo se arma en `src/sorteo.js` y se guarda en la tabla `sorteos`, una fila por
tirada. **La página ya no sortea nada:** pide `GET /api/sorteo` y pinta la última, así
que todos ven lo mismo sin importar desde qué teléfono miren.

- **Los juegos son fijos**, elegidos a mano para esta edición: Fantasma Blitz, Dobble,
  Taco Gato Cabra Queso Pizza y Ouch!, y Mal Trago para la final. Están en `JUEGOS` y
  `JUEGO_FINAL`; la portada sale del slug, que la ludoteca guarda con el mismo patrón.
- **Los anfitriones no juegan la primera ronda.** Los que tienen `anfitrion = 1` salen
  del reparto y aparecen en la final. De cada mesa pasan dos, el primero y el segundo,
  así que la final es de 10: los 2 anfitriones y 8 que se la ganan. Justo el tope de
  Mal Trago, que es de 4 a 10.
- **Hay gente que no debe caer junta.** `SEPARADOS` lista los pares, por nombre y
  apellidos. Si a un par le toca la misma mesa se vuelve a mezclar entero, hasta 50
  veces. El caso real: Miguel y Valeria probablemente se vayan a media fiesta, y juntos
  dejarían una mesa coja.
- **En la mesa va un nombre solo.** Del alias se corta lo que venga entre paréntesis
  —hay quien se explicó ahí— y de un nombre sin alias se usa el primero. Para los que
  la regla no acierta está `COMO_LE_DICEN`, que hoy tiene un caso: a Cyndi Darly le
  dicen Darly, no Cyndi. La sección de participantes no cambia: ahí va el nombre entero.
- **Primero el tamaño, después el acomodo.** Se reparte a la gente lo más parejo posible
  y se le da la mesa más llena al juego que admite más. Ouch! es de cinco como mucho,
  así que si le cae una mesa más grande se le pasa gente a la que tenga sitio. Con 22
  jugadores salen 6, 6, 5 y 5. Pasando los 29 ya no alcanza y la mesa queda `apretada`,
  que es lo que dispara el aviso bajo el botón.

De cada jugador se guarda solo cómo se llama en la mesa —su alias, o su nombre si no
puso uno—, nunca el DNI: `GET /api/sorteo` es público y lo lee cualquiera.

La respuesta va con `Cache-Control: no-store`. No es un detalle: con la caché de una
hora que usa la ludoteca, media fiesta seguiría viendo las mesas viejas después de
resortear. La página además repregunta cada 15 segundos (`REFRESCO` en `script.js`),
para que sortear desde un celular le llegue solo a la pantalla proyectada.

### El PIN del sorteo

Sortear pide un PIN que está **escrito en el código**, en `src/sorteo.js`. Es a
propósito: la fiesta es una noche, el botón solo rehace las mesas y no hay nada que
proteger más allá de que un invitado las rehaga a medianoche. Para cambiarlo, cambiar
esa línea y hacer push. El campo es `type="password"` porque esto se proyecta: así no
queda leyéndose en la pared mientras se escribe.

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

`GET /api/participantes` devuelve `{ lista }`, y solo con los que vienen
(`asistira = 1`). De los dados de baja no sale nada: ni los nombres, para no exponer a
nadie en una lista pública, ni la cuenta, porque la página ya no la muestra.

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

- **Torneo** — el reparto ya está y la final ya tiene sus cuatro cupos vacíos, falta
  llenarlos: anotar el ganador de cada mesa y que aparezca en la final sin tener que
  resortear. Sería otra ruta con el mismo PIN, escribiendo sobre la tirada vigente.
