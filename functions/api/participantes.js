export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT nombre, apellidos, alias, usa_nombre, experiencia, frase
       FROM participantes
       ORDER BY fecha_registro ASC`
    ).all();

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Error al obtener participantes.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
