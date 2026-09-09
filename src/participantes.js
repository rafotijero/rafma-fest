import { json } from './http.js';

export async function participantes(env) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT nombre, apellidos, alias, usa_nombre, experiencia, frase
       FROM participantes
       ORDER BY fecha_registro ASC`
    ).all();

    return json(results);
  } catch (err) {
    console.error(err);
    return json({ error: 'Error al obtener participantes.' }, 500);
  }
}
