const FECHA_EVENTO = '31 de octubre';

/** Cuántas mesas arma el sorteo (menos, si no hay gente para tantas). */
// Cada cuánto se vuelve a preguntar por el sorteo vigente. Sortear desde un
// celular tiene que llegarle a la pantalla proyectada sin que nadie recargue.
const REFRESCO = 15000;

// La tirada que ya está pintada, para no repintar lo mismo cada quince segundos.
let sorteoId = null;

// Despedidas para quien se da de baja: se elige una al azar, para que el
// mensaje no suene a trámite. Cada una trae su propio emoji grande.
const DESPEDIDAS = [
  { emoji: '💔', texto: 'No será lo mismo sin ti…\u00A0😢' },
  { emoji: '😭', texto: 'Nos vas a hacer falta en la mesa.\u00A0🎲💔' },
  { emoji: '🪑', texto: 'Guardamos tu silla, por si acaso.\u00A0💛✨' },
  { emoji: '🥺', texto: 'La mesa te va a extrañar…\u00A0🎲😢' },
];

document.addEventListener('DOMContentLoaded', () => {
  cargarParticipantes();
  cargarLudoteca();

  cargarSorteo();
  prepararSorteo();
  setInterval(cargarSorteo, REFRESCO);

  const form = document.getElementById('rsvp-form');
  if (!form) return;

  const nombreInput = document.getElementById('nombre');
  const apellidosInput = document.getElementById('apellidos');
  const dniInput = document.getElementById('dni');
  const aliasInput = document.getElementById('alias');
  const sinAliasCheck = document.getElementById('sinAlias');
  const experienciaSelect = document.getElementById('experiencia');
  const fraseSelect = document.getElementById('frase');
  const fraseOtroInput = document.getElementById('fraseOtro');
  const successBox = document.getElementById('rsvp-success');
  const successEmoji = document.getElementById('successEmoji');
  const successTitle = document.getElementById('successTitle');
  const successText = document.getElementById('successText');
  const submitBtn = form.querySelector('.btn-submit');

  const lookupForm = document.getElementById('lookup-form');
  const lookupDni = document.getElementById('lookupDni');
  const editCue = document.querySelector('.edit-cue');
  const editBanner = document.getElementById('edit-banner');
  const editBannerNombre = document.getElementById('edit-banner-nombre');
  const btnEditar = document.getElementById('btn-editar');
  const btnCancelarLookup = document.getElementById('btn-cancelar-lookup');
  const lookupBtn = lookupForm.querySelector('.btn-submit');

  const asistenciaBox = document.getElementById('asistencia-box');
  const bajaAviso = document.getElementById('baja-aviso');
  const bajaConfirm = document.getElementById('baja-confirm');
  const btnBaja = document.getElementById('btn-baja');
  const btnBajaSi = document.getElementById('btn-baja-si');
  const btnBajaNo = document.getElementById('btn-baja-no');
  const btnVolver = document.getElementById('btn-volver');

  const aliasPlaceholder = aliasInput.placeholder;
  const TEXTO_ALTA = 'Confirmar mi asistencia 🎉';
  const TEXTO_EDICION = 'Guardar mis cambios ✅';

  // DNI del registro que se está editando; null significa "alta nueva".
  let editandoDni = null;
  // Si el registro que se está editando sigue en la lista o ya se dio de baja.
  let asistiraActual = true;
  let aliasPrevValue = '';

  // ---------- Comportamiento del formulario ----------

  function aplicarEstadoAlias() {
    if (sinAliasCheck.checked) {
      aliasInput.disabled = true;
      aliasInput.placeholder = 'Usaremos tu nombre';
    } else {
      aliasInput.disabled = false;
      aliasInput.placeholder = aliasPlaceholder;
    }
  }

  sinAliasCheck.addEventListener('change', () => {
    if (sinAliasCheck.checked) {
      aliasPrevValue = aliasInput.value;
      aliasInput.value = '';
    } else {
      aliasInput.value = aliasPrevValue;
    }
    aplicarEstadoAlias();
  });

  function aplicarEstadoFrase() {
    const esOtro = fraseSelect.value === 'otro';
    fraseOtroInput.classList.toggle('hidden', !esOtro);
    fraseOtroInput.required = esOtro;
  }

  fraseSelect.addEventListener('change', () => {
    if (fraseSelect.value !== 'otro') fraseOtroInput.value = '';
    aplicarEstadoFrase();
  });

  soloDigitos(dniInput);
  soloDigitos(lookupDni);

  // ---------- Modo edición ----------

  btnEditar.addEventListener('click', () => {
    limpiarError(lookupForm);
    lookupForm.classList.remove('hidden');
    editCue.classList.add('hidden');
    form.classList.add('hidden');
    lookupDni.focus();
  });

  btnCancelarLookup.addEventListener('click', () => {
    lookupForm.classList.add('hidden');
    lookupForm.reset();
    limpiarError(lookupForm);
    editCue.classList.remove('hidden');
    form.classList.remove('hidden');
  });

  lookupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarError(lookupForm);

    if (!/^\d{8,10}$/.test(lookupDni.value)) {
      mostrarError(lookupForm, 'El DNI/CE debe tener entre 8 y 10 dígitos.');
      return;
    }

    lookupBtn.disabled = true;
    lookupBtn.textContent = 'Buscando...';

    try {
      const res = await fetch('/api/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: lookupDni.value }),
      });

      if (res.ok) {
        rellenarFormulario(await res.json());
        lookupForm.classList.add('hidden');
        lookupForm.reset();
        form.classList.remove('hidden');
        nombreInput.focus();
      } else {
        const err = await res.json().catch(() => ({}));
        mostrarError(lookupForm, err.error || 'No pudimos buscar tu registro. Intenta de nuevo.');
      }
    } catch {
      mostrarError(lookupForm, 'Error de conexión. Intenta de nuevo.');
    } finally {
      lookupBtn.disabled = false;
      lookupBtn.textContent = 'Buscar mi registro';
    }
  });

  function rellenarFormulario(p) {
    editandoDni = p.dni;

    nombreInput.value = p.nombre;
    apellidosInput.value = p.apellidos;
    dniInput.value = p.dni;
    dniInput.disabled = true;
    experienciaSelect.value = p.experiencia;

    aliasPrevValue = p.alias || '';
    aliasInput.value = p.alias || '';
    sinAliasCheck.checked = p.usa_nombre === 1;
    aplicarEstadoAlias();

    // La frase se guarda como texto, no como clave: buscamos la opción cuyo
    // texto coincide. Si no coincide con ninguna, es una frase personalizada.
    const opcion = [...fraseSelect.options].find((o) => o.textContent === p.frase);
    if (opcion) {
      fraseSelect.value = opcion.value;
      fraseOtroInput.value = '';
    } else {
      fraseSelect.value = 'otro';
      fraseOtroInput.value = p.frase;
    }
    aplicarEstadoFrase();

    editBannerNombre.textContent = p.nombre + ' ' + p.apellidos;
    editBanner.classList.remove('hidden');
    editCue.classList.add('hidden');
    submitBtn.textContent = TEXTO_EDICION;
    limpiarError(form);

    asistiraActual = p.asistira !== 0;
    aplicarEstadoAsistencia();
  }

  // ---------- Baja y regreso a la lista ----------

  function aplicarEstadoAsistencia() {
    asistenciaBox.classList.remove('hidden');
    bajaConfirm.classList.add('hidden');
    btnBaja.classList.toggle('hidden', !asistiraActual);
    bajaAviso.classList.toggle('hidden', asistiraActual);
    btnVolver.classList.toggle('hidden', asistiraActual);
  }

  btnBaja.addEventListener('click', () => {
    bajaConfirm.classList.remove('hidden');
    btnBaja.classList.add('hidden');
  });

  btnBajaNo.addEventListener('click', () => {
    bajaConfirm.classList.add('hidden');
    btnBaja.classList.remove('hidden');
  });

  btnBajaSi.addEventListener('click', () => cambiarAsistencia(false, btnBajaSi, 'Avisando...'));
  btnVolver.addEventListener('click', () => cambiarAsistencia(true, btnVolver, 'Confirmando...'));

  async function cambiarAsistencia(asistira, boton, textoOcupado) {
    limpiarError(form);
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = textoOcupado;

    try {
      const res = await fetch('/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: editandoDni, asistira }),
      });

      if (res.ok) {
        asistiraActual = asistira;
        const despedida = alAzar(DESPEDIDAS);
        mostrarExito(
          asistira ? '🎉' : despedida.emoji,
          asistira ? '¡Qué bueno tenerte de vuelta! 🥳' : despedida.texto,
          asistira
            ? `Tu ficha vuelve a la lista. Nos vemos el ${FECHA_EVENTO} para jugar.`
            : 'Sacamos tu ficha de la lista, pero la puerta queda abierta: entra con tu DNI/CE en "Edita tus datos aquí" y vuelve a confirmar cuando quieras.'
        );
        cargarParticipantes();
      } else {
        const err = await res.json().catch(() => ({}));
        mostrarError(form, err.error || 'No pudimos actualizar tu asistencia. Intenta de nuevo.');
      }
    } catch {
      mostrarError(form, 'Error de conexión. Intenta de nuevo.');
    } finally {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  }

  function mostrarExito(emoji, titulo, texto) {
    successEmoji.textContent = emoji;
    successTitle.textContent = titulo;
    successText.textContent = texto;
    form.classList.add('hidden');
    editCue.classList.add('hidden');
    successBox.classList.remove('hidden');
  }

  // ---------- Envío ----------

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const editando = editandoDni !== null;
    const data = {
      nombre: nombreInput.value.trim(),
      apellidos: apellidosInput.value.trim(),
      // En edición el input del DNI está deshabilitado, así que va desde el estado.
      dni: editando ? editandoDni : dniInput.value.trim(),
      alias: aliasInput.value.trim(),
      sinAlias: sinAliasCheck.checked,
      experiencia: experienciaSelect.value,
      frase: fraseSelect.value,
      fraseOtro: fraseOtroInput.value.trim(),
    };

    limpiarError(form);
    submitBtn.disabled = true;
    submitBtn.textContent = editando ? 'Guardando...' : 'Enviando...';

    try {
      const res = await fetch('/api/registro', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const comoTeLlamamos = (!data.sinAlias && data.alias) ? data.alias : data.nombre;
        mostrarExito(
          '✅',
          `¡Listo, ${comoTeLlamamos}!`,
          editando
            ? `Actualizamos tus datos. Nos vemos el ${FECHA_EVENTO} para jugar.`
            : `Tu ficha quedó anotada. Nos vemos el ${FECHA_EVENTO} para jugar.`
        );
        cargarParticipantes();
      } else {
        const err = await res.json().catch(() => ({}));
        mostrarError(form, err.error || 'Hubo un error al guardar tus datos. Intenta de nuevo.');
      }
    } catch {
      mostrarError(form, 'Error de conexión. Intenta de nuevo.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = editando ? TEXTO_EDICION : TEXTO_ALTA;
    }
  });
});

function soloDigitos(input) {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 10);
  });
}

function mostrarError(contenedor, mensaje) {
  let errorEl = contenedor.querySelector('.form-error');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.className = 'form-error';
    contenedor.appendChild(errorEl);
  }
  errorEl.textContent = mensaje;
}

function limpiarError(contenedor) {
  const el = contenedor.querySelector('.form-error');
  if (el) el.remove();
}

async function cargarParticipantes() {
  const grid = document.getElementById('participants-grid');
  if (!grid) return;

  try {
    const res = await fetch('/api/participantes');
    if (!res.ok) return;
    const datos = await res.json();
    const lista = datos.lista ?? [];

    if (lista.length === 0) {
      grid.innerHTML = '<p class="participants-empty">Aún no hay participantes confirmados. ¡Sé el primero!</p>';
    } else {
      grid.innerHTML = lista.map(renderCard).join('');
    }
  } catch {
    // Falla silenciosa: la sección queda vacía si no hay conexión
  }
}

/**
 * La vitrina de la ludoteca: cuántos juegos hay y unas cuantas portadas.
 *
 * El catálogo vive en ludoteca.rafotijero.dev y ese dominio no manda cabeceras
 * CORS, así que los datos llegan por /api/ludoteca, que los trae desde el Worker.
 * Si algo falla no pasa nada: la tarjeta ya trae su texto y su botón en el HTML.
 */
async function cargarLudoteca() {
  const covers = document.getElementById('ludoteca-covers');
  if (!covers) return;

  try {
    const res = await fetch('/api/ludoteca');
    if (!res.ok) return;
    const datos = await res.json();
    const juegos = datos.juegos ?? [];
    if (juegos.length === 0) return;

    const cuenta = document.getElementById('ludoteca-count');
    if (cuenta) {
      cuenta.textContent = datos.total === 1
        ? '1 juego esperando en la mesa'
        : `${datos.total} juegos esperando en la mesa`;
    }

    mostrarDatosLudoteca(datos);

    // Ocho portadas al azar en cada visita, para que la vitrina no sea siempre la misma.
    covers.innerHTML = mezclar(juegos)
      .slice(0, 8)
      .map((j) => renderPortada(j, datos.url))
      .join('');
  } catch {
    // Falla silenciosa: queda la tarjeta con su botón a la ludoteca
  }
}

/**
 * Las tres pastillas de datos, con los números reales del catálogo. Si alguno no
 * vino, se queda el texto que ya trae el HTML describiendo los filtros.
 */
function mostrarDatosLudoteca({ jugadoresMin, jugadoresMax, duracionMin, categorias }) {
  const facts = document.getElementById('ludoteca-facts');
  if (!facts) return;
  if (![jugadoresMin, jugadoresMax, duracionMin, categorias].every(Number.isFinite)) return;

  facts.innerHTML = [
    `👥 De ${jugadoresMin} a ${jugadoresMax} jugadores`,
    `⏱️ Desde ${duracionMin} minutos`,
    `🏷️ ${categorias} categorías`,
  ].map((texto) => `<li>${texto}</li>`).join('');
}

function renderPortada(j, base) {
  const nombre = escapeHtml(j.nombre);
  const ficha = `${escapeHtml(base)}#/juego/${encodeURIComponent(j.slug)}`;
  return `<a class="ludoteca-cover" href="${ficha}"
      target="_blank" rel="noopener" title="${nombre}">
      <img src="${escapeHtml(j.imagen)}" alt="${nombre}" loading="lazy">
    </a>`;
}

/** Copia barajada, sin tocar el arreglo original. */
function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * El sorteo de mesas, que ahora se arma en el servidor.
 *
 * La página ya no reparte a nadie: pide `GET /api/sorteo` y pinta la tirada que
 * está guardada, así todos ven la misma. Vuelve a preguntar cada quince segundos,
 * para que sortear desde un celular le llegue solo a la pantalla y a los invitados.
 */
async function cargarSorteo() {
  if (!document.getElementById('mesas-grid')) return;

  try {
    const res = await fetch('/api/sorteo');
    if (!res.ok) return;
    const datos = await res.json();

    // Sin tirada todavía, o la misma de hace un rato: no hay nada que repintar.
    if (!datos.sorteo || datos.id === sorteoId) return;

    sorteoId = datos.id;
    pintarSorteo(datos.sorteo);
  } catch {
    // Falla silenciosa: se queda en pantalla lo que ya estaba.
  }
}

/** El botón pide el PIN antes de sortear: lo tienen los anfitriones. */
function prepararSorteo() {
  const boton = document.getElementById('btn-sorteo');
  const form = document.getElementById('sorteo-pin');
  if (!boton || !form) return;

  const pin = document.getElementById('pin');
  const error = document.getElementById('pin-error');
  const enviar = form.querySelector('.btn-pin');

  function cerrarPin() {
    form.classList.add('hidden');
    form.reset();
    error.classList.add('hidden');
    boton.classList.remove('hidden');
  }

  boton.addEventListener('click', () => {
    boton.classList.add('hidden');
    form.classList.remove('hidden');
    pin.focus();
  });

  document.getElementById('btn-pin-cancelar').addEventListener('click', cerrarPin);

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    error.classList.add('hidden');
    enviar.disabled = true;
    enviar.textContent = 'Sorteando…';

    try {
      const res = await fetch('/api/sorteo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.value }),
      });
      const datos = await res.json();

      if (!res.ok) {
        error.textContent = datos.error ?? 'No se pudo sortear.';
        error.classList.remove('hidden');
        pin.select();
        return;
      }

      sorteoId = datos.id;
      pintarSorteo(datos.sorteo);
      cerrarPin();
    } catch {
      error.textContent = 'No se pudo sortear. Revisa la conexión.';
      error.classList.remove('hidden');
    } finally {
      enviar.disabled = false;
      enviar.textContent = 'Sortear';
    }
  });
}

/** Pinta las cuatro mesas y la final con lo que vino del servidor. */
function pintarSorteo(sorteo) {
  const grid = document.getElementById('mesas-grid');
  const final = document.getElementById('mesa-final');
  const boton = document.getElementById('btn-sorteo');
  if (!grid) return;

  grid.innerHTML = sorteo.mesas.map(renderMesa).join('');
  if (final) final.innerHTML = renderFinal(sorteo.final);
  if (boton) boton.textContent = '🎲 Sortear otra vez';

  const apretadas = sorteo.mesas.filter((m) => m.apretada).length;
  avisoSorteo(apretadas === 0 ? '' : apretadas === 1
    ? 'A una mesa le tocó más gente de la que admite su juego; vuelvan a sortear.'
    : `A ${apretadas} mesas les tocó más gente de la que admite su juego; vuelvan a sortear.`);
}

/** El aviso solo aparece cuando hay algo que explicar. */
function avisoSorteo(texto) {
  const aviso = document.getElementById('sorteo-aviso');
  if (!aviso) return;
  aviso.textContent = texto ?? '';
  aviso.classList.toggle('hidden', !texto);
}

function fichaLudoteca(slug) {
  return `https://ludoteca.rafotijero.dev/#/juego/${encodeURIComponent(slug)}`;
}

/** Una pastilla por jugador. El nombre completo queda en el title: hay alias largos. */
function pastilla(quien) {
  const como = escapeHtml(quien);
  return `<li title="${como}">${como}</li>`;
}

function renderMesa({ numero, juego, jugadores }) {
  const nombre = escapeHtml(juego.nombre);

  return `<article class="mesa">
      <a class="mesa-cover" href="${fichaLudoteca(juego.slug)}" target="_blank" rel="noopener" title="${nombre}">
        <img src="${escapeHtml(juego.imagen)}" alt="${nombre}" loading="lazy">
      </a>
      <div class="mesa-datos">
        <p class="mesa-num">Mesa ${numero}</p>
        <h3 class="mesa-juego">${nombre}</h3>
        <ul class="mesa-jugadores">${jugadores.map(pastilla).join('')}</ul>
      </div>
    </article>`;
}

/**
 * La final no es una mesa más: los anfitriones ya están dentro y los demás
 * lugares siguen vacíos hasta que cada mesa tenga su ganador.
 */
function renderFinal({ juego, anfitriones, cupos }) {
  const nombre = escapeHtml(juego.nombre);
  const libres = Array.from(
    { length: cupos },
    (_, i) => `<li class="mesa-cupo">Ganador Mesa ${i + 1}</li>`
  ).join('');

  return `<article class="mesa mesa-final">
      <a class="mesa-cover" href="${fichaLudoteca(juego.slug)}" target="_blank" rel="noopener" title="${nombre}">
        <img src="${escapeHtml(juego.imagen)}" alt="${nombre}" loading="lazy">
      </a>
      <div class="mesa-datos">
        <p class="mesa-num">🏆 La final</p>
        <h3 class="mesa-juego">${nombre}</h3>
        <ul class="mesa-jugadores">${anfitriones.map(pastilla).join('')}${libres}</ul>
        <p class="mesa-nota">Los anfitriones entran de frente. Los demás lugares se ganan en las mesas.</p>
      </div>
    </article>`;
}

function alAzar(opciones) {
  return opciones[Math.floor(Math.random() * opciones.length)];
}

function renderCard(p) {
  const alias = p.alias
    ? ` <span class="participant-alias">"${escapeHtml(p.alias)}"</span>`
    : '';
  const nivel = p.experiencia.charAt(0).toUpperCase() + p.experiencia.slice(1);
  return `<div class="participant-card">
      <p class="participant-name">${escapeHtml(p.apellidos)}, ${escapeHtml(p.nombre)}${alias}</p>
      <span class="participant-level level-${escapeHtml(p.experiencia)}">Nivel ${nivel}</span>
      <p class="participant-phrase">"${escapeHtml(p.frase)}"</p>
    </div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
