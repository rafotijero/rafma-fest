# RAFMA Fest — Estado del proyecto

## Qué es esto

Landing page para la 2da edición del RAFMA Fest (sábado 10 de octubre de 2026), con formulario de registro de asistentes y una sección de participantes para el sorteo de mesas del torneo.

## Estructura actual

```
index.html    → estructura de la página
styles.css    → todos los estilos
script.js     → interactividad del formulario
index.js      → placeholder sin uso (queda de la plantilla inicial)
package.json  → sin dependencias reales todavía
```

Sitio 100% estático: no hay backend ni base de datos conectada.

## Secciones de la página

- **Invitación** — hero con logo, fecha, ubicación (mapa embebido reemplazado por un link a Google Maps porque el iframe no cargaba) y frase de invitación.
- **Ludoteca** — placeholder "Próximamente", pendiente de catálogo de juegos.
- **Asistencia** — formulario de registro:
  - Nombre, Apellidos, DNI (8 dígitos)
  - Alias de jugador (opcional) + checkbox para usar el nombre en su lugar
  - Experiencia en juegos de mesa (Tutorial / Casual / Estratega / Deidad)
  - Frase que te define (selector con 8 opciones + "Otro" para escribir la propia)
  - Al enviar, **solo muestra una confirmación en pantalla** — no guarda nada todavía (ver siguiente sección).
- **Participantes** — tarjetas con nombre, alias, nivel y frase de cada asistente. **Actualmente tiene 6 tarjetas de datos de prueba** (incluye a Rafo y Maqui) para revisar el diseño. Hay que quitarlas cuando empiecen los registros reales.

## Pendiente: guardar los registros en una base de datos

Ahora mismo el formulario no persiste nada — es solo para validar el diseño y los campos. Para que funcione de verdad hace falta:

1. **Cuenta y proyecto en Cloudflare Pages**
   - Crear el proyecto en Cloudflare Pages apuntando a este repo.
   - Configurar el subdominio `rafma.rafotijero.dev` en el dashboard de Cloudflare (DNS + custom domain del proyecto).

2. **Base de datos D1**
   - Con `wrangler` (CLI de Cloudflare) logueado en tu cuenta: `wrangler d1 create rafma-db`.
   - Crear una tabla `participantes` con columnas: nombre, apellidos, dni, alias, usa_nombre, experiencia, frase, frase_otro, fecha_registro.
   - Agregar el binding de la base de datos en `wrangler.toml` (o en la config de Pages Functions).

3. **Pages Function para recibir el formulario**
   - Crear `functions/api/registro.js` (o `.ts`) que reciba el `POST` del formulario, valide los datos en el servidor (no solo confiar en la validación del navegador) y haga el `INSERT` en D1.
   - Actualizar `script.js` para que el `submit` del formulario haga `fetch('/api/registro', { method: 'POST', body: ... })` en vez de solo mostrar la confirmación local.

4. **Listar participantes reales**
   - Crear otra Pages Function (`functions/api/participantes.js`) que haga `SELECT` de la tabla y devuelva el listado.
   - Cambiar la sección "Participantes" para que pida ese listado por `fetch` y genere las tarjetas dinámicamente en vez de estar escritas a mano en el HTML.
   - Quitar las 6 tarjetas de prueba del `index.html`.

5. **Sorteo de mesas y torneo** (más adelante, cuando se sepa el número final de asistentes)
   - Lógica para repartir aleatoriamente a los asistentes en mesas de 5.
   - Registro de ganador por mesa y avance a la final.
   - Nueva sección o vista para mostrar mesas y bracket.

## Siguiente paso

Cuando el usuario comparta el repositorio remoto, subir este proyecto (commit + push) para dejarlo listo antes de conectar Cloudflare Pages.
