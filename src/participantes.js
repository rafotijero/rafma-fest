import { json } from './http.js';

/**
 * GET /api/participantes — la lista de quienes vienen.
 *
 * Solo salen los que asistirán. De los dados de baja no sale nada por esta ruta:
 * ni los nombres ni la cuenta, que para eso se consulta la base directamente.
 */
export async function participantes(env) {
  try {
    const lista = await env.DB.prepare(
      `SELECT nombre, apellidos, alias, usa_nombre, experiencia, frase
         FROM participantes
        WHERE asistira = 1
        ORDER BY fecha_registro ASC`
    ).all();

    return json({ lista: lista.results });
  } catch (err) {
    console.error(err);
    return json({ error: 'Error al obtener participantes.' }, 500);
  }
}
