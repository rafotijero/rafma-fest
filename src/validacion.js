export const EXPERIENCIAS_VALIDAS = ['tutorial', 'casual', 'estratega', 'deidad'];

export const FRASES = {
  'invento-reglas': 'Yo siempre gano. Y si no, invento mis propias reglas.',
  'ver-perder': 'Lo importante no es ganar, sino ver perder a los demás.',
  'segundo-puesto': 'Asumo que compiten por el segundo puesto, ¿verdad?',
  'rellenar-tabla': 'Yo nací para ganar; ustedes, para rellenar la tabla.',
  'desventaja': 'Mi sola presencia ya es una desventaja para todos ustedes.',
  'humildad-puntos': 'Si la humildad diera puntos, también iría ganando.',
  'ensenarles': 'Agradezcan que vine a enseñarles cómo se hace.',
  'es-normal': 'Tranquilos, perder contra mí no da vergüenza; es lo normal.',
};

export function esDniValido(dni) {
  return /^\d{8,10}$/.test(String(dni ?? '').trim());
}

/**
 * Valida el cuerpo de un registro (alta o edición).
 * Devuelve { error } si algo falla, o { datos } listos para guardar.
 */
export function validarRegistro(body) {
  const { nombre, apellidos, dni, alias, sinAlias, experiencia, frase, fraseOtro } = body;

  if (!nombre?.trim() || !apellidos?.trim()) {
    return { error: 'Nombre y apellidos son obligatorios.' };
  }
  if (!esDniValido(dni)) {
    return { error: 'El DNI/CE debe tener entre 8 y 10 dígitos.' };
  }
  if (!EXPERIENCIAS_VALIDAS.includes(experiencia)) {
    return { error: 'Experiencia no válida.' };
  }
  if (frase !== 'otro' && !FRASES[frase]) {
    return { error: 'Frase no válida.' };
  }
  if (frase === 'otro' && !fraseOtro?.trim()) {
    return { error: 'Debes escribir tu frase personalizada.' };
  }

  return {
    datos: {
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      dni: dni.trim(),
      alias: (!sinAlias && alias?.trim()) ? alias.trim() : null,
      usaNombre: sinAlias ? 1 : 0,
      experiencia,
      frase: frase === 'otro' ? fraseOtro.trim() : FRASES[frase],
    },
  };
}
