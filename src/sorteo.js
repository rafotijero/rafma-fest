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

// Gente que no debe caer en la misma mesa, por nombre y apellidos. Miguel y
// Valeria probablemente se vayan a media fiesta: juntos dejarían una mesa coja,
// y separados cada mesa aguanta la baja.
const SEPARADOS = [['Miguel Arismendi', 'Valeria Canaval']];

// En la mesa se usa un solo nombre, y el primero no siempre es por el que a uno
// lo llaman. La regla saca el primer nombre; acá van los que no cuadran con ella.
const COMO_LE_DICEN = {
  'Cyndi Darly Tejada Manyari': 'Darly',
};

const SIN_CACHE = { 'Cache-Control': 'no-store' };

/** La portada sale del slug: la ludoteca las guarda todas con el mismo patrón. */
function conPortada({ slug, nombre }) {
  return { slug, nombre, imagen: `${PORTADAS}/${slug}.webp` };
}

function quienEs(p) {
  return `${p.nombre} ${p.apellidos}`;
}

/**
 * Cómo se llama cada quien en la mesa. En las pastillas no entra un nombre largo,
 * así que del alias se corta lo que venga entre paréntesis —hay quien se explicó
 * ahí— y de un nombre sin alias se usa solo el primero.
 */
function comoSeLlama(p) {
  const aMano = COMO_LE_DICEN[quienEs(p)];
  if (aMano) return aMano;
  if (p.alias) return p.alias.split('(')[0].trim();
  return p.nombre.trim().split(/\s+/)[0];
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

/** ¿Algún par de los que no deben jugar juntos quedó en la misma mesa? */
function hayJuntos(grupos) {
  return SEPARADOS.some(([uno, otro]) =>
    grupos.some((g) => g.some((p) => quienEs(p) === uno) && g.some((p) => quienEs(p) === otro))
  );
}

/**
 * Reparte a la gente en grupos del tamaño pedido. Si a dos que no deben jugar
 * juntos les tocó la misma mesa, se vuelve a mezclar entero: con cuatro mesas eso
 * se resuelve en un par de intentos. Si después de cincuenta no cuadra —cuando hay
 * una sola mesa, por ejemplo, y no hay forma— se deja la última y la fiesta sigue.
 */
function repartirGente(jugadores, tamanos) {
  let grupos = [];
  for (let intento = 0; intento < 50; intento++) {
    const gente = mezclar(jugadores);
    grupos = tamanos.map((tam) => gente.splice(0, tam));
    if (!hayJuntos(grupos)) break;
  }
  return grupos;
}

/** Arma el reparto: quién se sienta en qué mesa y con qué juego. */
function armar(jugadores, anfitriones) {
  const cuantas = Math.max(1, Math.min(JUEGOS.length, Math.floor(jugadores.length / 2)));
  const juegos = JUEGOS.slice(0, cuantas);
  const tamanos = acomodar(
    repartirEn(jugadores.length, cuantas),
    juegos.map((j) => j.max)
  );

  const grupos = repartirGente(jugadores, tamanos);
  const mesas = juegos.map((juego, i) => ({
    numero: i + 1,
    juego: conPortada(juego),
    jugadores: grupos[i].map(comoSeLlama),
    apretada: tamanos[i] > juego.max,
  }));

  return {
    mesas,
    final: {
      juego: conPortada(JUEGO_FINAL),
      // Los anfitriones ya están dentro; de cada mesa pasan el primero y el segundo.
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
      `SELECT nombre, apellidos, alias, anfitrion
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
