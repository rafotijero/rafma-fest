import { json } from './http.js';
import { validarRegistro } from './validacion.js';

async function leerCuerpo(request) {
  try {
    return { body: await request.json() };
  } catch {
    return { error: json({ error: 'Cuerpo de la solicitud inválido.' }, 400) };
  }
}

/** POST /api/registro — alta de un participante nuevo. */
export async function registro(request, env) {
  const { body, error: errCuerpo } = await leerCuerpo(request);
  if (errCuerpo) return errCuerpo;

  const { datos, error } = validarRegistro(body);
  if (error) return json({ error }, 400);

  try {
    await env.DB.prepare(
      `INSERT INTO participantes (nombre, apellidos, dni, alias, usa_nombre, experiencia, frase)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      datos.nombre, datos.apellidos, datos.dni,
      datos.alias, datos.usaNombre, datos.experiencia, datos.frase
    ).run();

    return json({ ok: true }, 201);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return json({ error: 'Este DNI ya está registrado. Usa "Editar mi registro" para cambiar tus datos.' }, 409);
    }
    console.error(err);
    return json({ error: 'Error interno al guardar el registro.' }, 500);
  }
}

/**
 * PUT /api/registro — edita un registro existente.
 * El DNI identifica la fila y no se puede cambiar.
 */
export async function actualizar(request, env) {
  const { body, error: errCuerpo } = await leerCuerpo(request);
  if (errCuerpo) return errCuerpo;

  const { datos, error } = validarRegistro(body);
  if (error) return json({ error }, 400);

  try {
    const res = await env.DB.prepare(
      `UPDATE participantes
          SET nombre = ?, apellidos = ?, alias = ?, usa_nombre = ?, experiencia = ?, frase = ?
        WHERE dni = ?`
    ).bind(
      datos.nombre, datos.apellidos, datos.alias,
      datos.usaNombre, datos.experiencia, datos.frase, datos.dni
    ).run();

    if (!res.meta?.changes) {
      return json({ error: 'No encontramos un registro con ese DNI.' }, 404);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: 'Error interno al actualizar el registro.' }, 500);
  }
}
