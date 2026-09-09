const EXPERIENCIAS_VALIDAS = ['tutorial', 'casual', 'estratega', 'deidad'];

const FRASES = {
  'invento-reglas': 'Yo siempre gano. Y si no, invento mis propias reglas.',
  'ver-perder': 'Lo importante no es ganar, sino ver perder a los demás.',
  'segundo-puesto': 'Asumo que compiten por el segundo puesto, ¿verdad?',
  'rellenar-tabla': 'Yo nací para ganar; ustedes, para rellenar la tabla.',
  'desventaja': 'Mi sola presencia ya es una desventaja para todos ustedes.',
  'humildad-puntos': 'Si la humildad diera puntos, también iría ganando.',
  'ensenarles': 'Agradezcan que vine a enseñarles cómo se hace.',
  'es-normal': 'Tranquilos, perder contra mí no da vergüenza; es lo normal.',
};

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Cuerpo de la solicitud inválido.' }, 400);
  }

  const { nombre, apellidos, dni, alias, sinAlias, experiencia, frase, fraseOtro } = body;

  // Validaciones
  if (!nombre?.trim() || !apellidos?.trim()) {
    return json({ error: 'Nombre y apellidos son obligatorios.' }, 400);
  }
  if (!/^\d{8}$/.test(dni?.trim())) {
    return json({ error: 'El DNI debe tener exactamente 8 dígitos.' }, 400);
  }
  if (!EXPERIENCIAS_VALIDAS.includes(experiencia)) {
    return json({ error: 'Experiencia no válida.' }, 400);
  }
  if (frase !== 'otro' && !FRASES[frase]) {
    return json({ error: 'Frase no válida.' }, 400);
  }
  if (frase === 'otro' && !fraseOtro?.trim()) {
    return json({ error: 'Debes escribir tu frase personalizada.' }, 400);
  }

  const fraseTexto = frase === 'otro' ? fraseOtro.trim() : FRASES[frase];
  const aliasLimpio = (!sinAlias && alias?.trim()) ? alias.trim() : null;

  try {
    await env.DB.prepare(
      `INSERT INTO participantes (nombre, apellidos, dni, alias, usa_nombre, experiencia, frase)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      nombre.trim(),
      apellidos.trim(),
      dni.trim(),
      aliasLimpio,
      sinAlias ? 1 : 0,
      experiencia,
      fraseTexto
    ).run();

    return json({ ok: true }, 201);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return json({ error: 'Este DNI ya está registrado.' }, 409);
    }
    console.error(err);
    return json({ error: 'Error interno al guardar el registro.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
