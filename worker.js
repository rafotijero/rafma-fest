import { registro } from './src/registro.js';
import { participantes } from './src/participantes.js';
import { json } from './src/http.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/registro') {
      if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
      return registro(request, env);
    }

    if (pathname === '/api/participantes') {
      if (request.method !== 'GET') return json({ error: 'Método no permitido.' }, 405);
      return participantes(env);
    }

    return json({ error: 'Ruta no encontrada.' }, 404);
  },
};
