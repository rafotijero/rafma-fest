import { json } from './http.js';
import { esDniValido } from './validacion.js';

/**
 * POST /api/consulta — busca un registro por DNI para poder editarlo.
 * Va por POST (y no por GET con query string) para que el DNI no quede
 * escrito en URLs ni en logs de acceso.
 */
export async function consulta(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo de la solicitud inválido.' }, 400);
  }

  const dni = String(body?.dni ?? '').trim();
  if (!esDniValido(dni)) {
    return json({ error: 'El DNI/CE debe tener entre 8 y 10 dígitos.' }, 400);
  }

  try {
    const fila = await env.DB.prepare(
      `SELECT nombre, apellidos, dni, alias, usa_nombre, experiencia, frase
         FROM participantes
        WHERE dni = ?`
    ).bind(dni).first();

    if (!fila) {
      return json({ error: 'No encontramos ningún registro con ese DNI.' }, 404);
    }

    return json(fila);
  } catch (err) {
    console.error(err);
    return json({ error: 'Error al buscar el registro.' }, 500);
  }
}
