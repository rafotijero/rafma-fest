import { json } from './http.js';
import { esDniValido } from './validacion.js';

/**
 * POST /api/asistencia — da de baja o vuelve a confirmar un registro.
 *
 * No borra la fila: guarda la bandera `asistira`. Así quien se dio de baja
 * puede volver sin reescribir su ficha, y nosotros sabemos quién avisó que
 * ya no venía en vez de verlo simplemente desaparecer.
 */
export async function asistencia(request, env) {
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
  if (typeof body?.asistira !== 'boolean') {
    return json({ error: 'Falta indicar si asistirás o no.' }, 400);
  }

  const asistira = body.asistira ? 1 : 0;

  try {
    const res = await env.DB.prepare(
      `UPDATE participantes
          SET asistira = ?1,
              fecha_baja = CASE WHEN ?1 = 0 THEN datetime('now') ELSE NULL END
        WHERE dni = ?2`
    ).bind(asistira, dni).run();

    if (!res.meta?.changes) {
      return json({ error: 'No encontramos un registro con ese DNI.' }, 404);
    }

    return json({ ok: true, asistira });
  } catch (err) {
    console.error(err);
    return json({ error: 'Error al actualizar tu asistencia.' }, 500);
  }
}
