import { json } from './http.js';

const LUDOTECA = 'https://ludoteca.rafotijero.dev';
const CATALOGO = `${LUDOTECA}/data/juegos.json`;

/**
 * GET /api/ludoteca — un resumen del catálogo que vive en ludoteca.rafotijero.dev.
 *
 * El catálogo está en otro dominio y no manda cabeceras CORS, así que la página
 * no puede pedirlo directo desde el navegador: lo trae el Worker y devuelve solo
 * lo que necesita la vitrina de la portada (la cuenta, los números y las
 * portadas), con las rutas de imagen ya convertidas en URL absolutas.
 */
export async function ludoteca() {
  try {
    const res = await fetch(CATALOGO, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) return json({ error: 'No se pudo leer el catálogo.' }, 502);

    const datos = await res.json();
    const juegos = datos.juegos ?? [];
    if (juegos.length === 0) return json({ error: 'El catálogo llegó vacío.' }, 502);

    // Cada juego trae jugadores y duración como [mínimo, máximo].
    const desdeJugadores = juegos.map((j) => j.jugadores?.[0]).filter(Number.isFinite);
    const hastaJugadores = juegos.map((j) => j.jugadores?.[1]).filter(Number.isFinite);
    const desdeDuracion = juegos.map((j) => j.duracion?.[0]).filter(Number.isFinite);

    return json(
      {
        url: `${LUDOTECA}/`,
        total: juegos.length,
        categorias: Object.keys(datos.tipos ?? {}).length,
        jugadoresMin: desdeJugadores.length ? Math.min(...desdeJugadores) : null,
        jugadoresMax: hastaJugadores.length ? Math.max(...hastaJugadores) : null,
        duracionMin: desdeDuracion.length ? Math.min(...desdeDuracion) : null,
        juegos: juegos
          .filter((j) => j.slug && j.imagen)
          .map((j) => ({
            slug: j.slug,
            nombre: j.nombre,
            imagen: `${LUDOTECA}/${j.imagen}`,
            jugadores: j.jugadores,
            duracion: j.duracion,
          })),
      },
      200,
      // El catálogo cambia de vez en cuando, no a cada rato: una hora en caché
      // del navegador basta y evita golpear el otro dominio en cada visita.
      { 'Cache-Control': 'public, max-age=3600' }
    );
  } catch (err) {
    console.error(err);
    return json({ error: 'Error al consultar la ludoteca.' }, 502);
  }
}
