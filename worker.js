import { registro, actualizar } from './src/registro.js';
import { participantes } from './src/participantes.js';
import { consulta } from './src/consulta.js';
import { json } from './src/http.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const metodo = request.method;

    if (pathname === '/api/registro') {
      if (metodo === 'POST') return registro(request, env);
      if (metodo === 'PUT') return actualizar(request, env);
      return json({ error: 'Método no permitido.' }, 405);
    }

    if (pathname === '/api/consulta') {
      if (metodo !== 'POST') return json({ error: 'Método no permitido.' }, 405);
      return consulta(request, env);
    }

    if (pathname === '/api/participantes') {
      if (metodo !== 'GET') return json({ error: 'Método no permitido.' }, 405);
      return participantes(env);
    }

    return json({ error: 'Ruta no encontrada.' }, 404);
  },
};
