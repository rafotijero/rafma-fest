import { json } from './http.js';

/**
 * GET /api/participantes — la lista de quienes vienen, más cuántos se dieron de baja.
 *
 * De las bajas solo sale el número, nunca los nombres: la página dice "tres personas
 * avisaron que ya no podrán venir" sin señalar a nadie.
 */
export async function participantes(env) {
  try {
    const [lista, bajas] = await env.DB.batch([
      env.DB.prepare(
        `SELECT nombre, apellidos, alias, usa_nombre, experiencia, frase
           FROM participantes
          WHERE asistira = 1
          ORDER BY fecha_registro ASC`
      ),
      env.DB.prepare(
        `SELECT COUNT(*) AS total FROM participantes WHERE asistira = 0`
      ),
    ]);

    return json({ lista: lista.results, bajas: bajas.results[0]?.total ?? 0 });
  } catch (err) {
    console.error(err);
    return json({ error: 'Error al obtener participantes.' }, 500);
  }
}
