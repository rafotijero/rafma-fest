import { json } from './http.js';

/**
 * El sorteo de las mesas, compartido por todos.
 *
 * Antes se calculaba en el navegador y cada quien veía un reparto distinto. Ahora
 * se arma acá, se guarda en la tabla `sorteos` y la página solo muestra el último:
 * una sola tirada válida para toda la fiesta.
 */

// El PIN para sortear. Está en el código a propósito: la fiesta es una noche y el
// botón solo rehace las mesas. Para cambiarlo, cambiar esta línea y hacer push.
const PIN = 'rafma26';

const PORTADAS = 'https://ludoteca.rafotijero.dev/img/portadas';

// Los cuatro juegos de la noche, elegidos a mano. `max` es cuánta gente admite
// cada uno: Ouch! se queda en cinco y por eso no recibe la mesa más llena.
const JUEGOS = [
  { slug: 'fantasma-blitz', nombre: 'Fantasma Blitz', max: 8 },
  { slug: 'dobble', nombre: 'Dobble', max: 8 },
  { slug: 'taco-gato-cabra-queso-pizza', nombre: 'Taco Gato Cabra Queso Pizza', max: 8 },
  { slug: 'ouch', nombre: 'Ouch!', max: 5 },
];

const JUEGO_FINAL = { slug: 'mal-trago', nombre: 'Mal Trago' };

const SIN_CACHE = { 'Cache-Control': 'no-store' };

/** La portada sale del slug: la ludoteca las guarda todas con el mismo patrón. */
function conPortada({ slug, nombre }) {
  return { slug, nombre, imagen: `${PORTADAS}/${slug}.webp` };
}

/** Cómo se llama cada quien en la mesa: su alias, o su nombre si no puso uno. */
function comoSeLlama(p) {
  return p.alias || p.nombre;
}

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** n personas en m mesas, lo más parejo posible: las primeras cargan el resto. */
function repartirEn(n, m) {
  const base = Math.floor(n / m);
  const sobran = n % m;
  return Array.from({ length: m }, (_, i) => base + (i < sobran ? 1 : 0));
}

/**
 * Ajusta los tamaños a lo que admite cada juego. Las mesas vienen ordenadas de
 * más llena a menos y los juegos de mayor a menor capacidad, así que casi siempre
 * cuadra de una; si algún juego igual se pasa, le pasamos gente a la mesa con más
 * sitio libre. Si no hay dónde ponerla, se queda apretada y la página lo avisa.
 */
function acomodar(tamanos, topes) {
  for (let vuelta = 0; vuelta < 50; vuelta++) {
    const lleno = tamanos.findIndex((t, i) => t > topes[i]);
    if (lleno === -1) break;

    let destino = -1;
    let masSitio = 0;
    tamanos.forEach((t, i) => {
      const libre = topes[i] - t;
      if (libre > masSitio) {
        masSitio = libre;
        destino = i;
      }
    });
    if (destino === -1) break;

    tamanos[lleno] -= 1;
    tamanos[destino] += 1;
  }
  return tamanos;
}

/** Arma el reparto: quién se sienta en qué mesa y con qué juego. */
function armar(jugadores, anfitriones) {
  const cuantas = Math.max(1, Math.min(JUEGOS.length, Math.floor(jugadores.length / 2)));
  const juegos = JUEGOS.slice(0, cuantas);
  const tamanos = acomodar(
    repartirEn(jugadores.length, cuantas),
    juegos.map((j) => j.max)
  );

  const gente = mezclar(jugadores);
  const mesas = juegos.map((juego, i) => ({
    numero: i + 1,
    juego: conPortada(juego),
    jugadores: gente.splice(0, tamanos[i]).map(comoSeLlama),
    apretada: tamanos[i] > juego.max,
  }));

  return {
    mesas,
    final: {
      juego: conPortada(JUEGO_FINAL),
      // Los anfitriones ya están dentro; los demás lugares los ganan en sus mesas.
      anfitriones: anfitriones.map(comoSeLlama),
      cupos: mesas.length,
    },
  };
}

/**
 * POST /api/sorteo — arma una tirada nueva y la guarda. Pide el PIN.
 *
 * De cada jugador se guarda solo cómo se llama en la mesa, nunca el DNI: esto
 * lo lee cualquiera desde `GET /api/sorteo`.
 */
export async function sortear(request, env) {
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    return json({ error: 'Datos inválidos.' }, 400, SIN_CACHE);
  }

  if (cuerpo?.pin !== PIN) {
    return json({ error: 'PIN incorrecto.' }, 401, SIN_CACHE);
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT nombre, alias, anfitrion
         FROM participantes
        WHERE asistira = 1
        ORDER BY fecha_registro ASC`
    ).all();

    const anfitriones = results.filter((p) => p.anfitrion === 1);
    const jugadores = results.filter((p) => p.anfitrion !== 1);

    if (jugadores.length < 2) {
      return json({ error: 'Todavía no hay gente suficiente para repartir.' }, 409, SIN_CACHE);
    }

    const datos = armar(jugadores, anfitriones);
    const fila = await env.DB.prepare(
      `INSERT INTO sorteos (datos) VALUES (?) RETURNING id, creado`
    )
      .bind(JSON.stringify(datos))
      .first();

    return json({ id: fila.id, creado: fila.creado, sorteo: datos }, 200, SIN_CACHE);
  } catch (err) {
    console.error(err);
    return json({ error: 'Error al armar el sorteo.' }, 500, SIN_CACHE);
  }
}

/**
 * GET /api/sorteo — la tirada vigente, sin PIN: es lo que ve todo el mundo.
 *
 * Va sin caché a propósito. El catálogo de la ludoteca se cachea una hora y acá
 * eso sería fatal: media fiesta vería las mesas viejas después de resortear.
 */
export async function sorteoActual(env) {
  try {
    const fila = await env.DB.prepare(
      `SELECT id, datos, creado FROM sorteos ORDER BY id DESC LIMIT 1`
    ).first();

    if (!fila) return json({ sorteo: null }, 200, SIN_CACHE);

    return json(
      { id: fila.id, creado: fila.creado, sorteo: JSON.parse(fila.datos) },
      200,
      SIN_CACHE
    );
  } catch (err) {
    console.error(err);
    return json({ error: 'Error al leer el sorteo.' }, 500, SIN_CACHE);
  }
}
