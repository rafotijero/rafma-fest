document.addEventListener('DOMContentLoaded', () => {
  cargarParticipantes();

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
  const successName = document.getElementById('successName');
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

  const aliasPlaceholder = aliasInput.placeholder;
  const TEXTO_ALTA = 'Confirmar mi asistencia 🎉';
  const TEXTO_EDICION = 'Guardar mis cambios ✅';

  // DNI del registro que se está editando; null significa "alta nueva".
  let editandoDni = null;
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

    if (!/^\d{8}$/.test(lookupDni.value)) {
      mostrarError(lookupForm, 'El DNI debe tener exactamente 8 dígitos.');
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
        successName.textContent = (!data.sinAlias && data.alias) ? data.alias : data.nombre;
        successText.textContent = editando
          ? 'Actualizamos tus datos. Nos vemos el 10 de octubre para jugar.'
          : 'Tu ficha quedó anotada. Nos vemos el 10 de octubre para jugar.';
        form.classList.add('hidden');
        editCue.classList.add('hidden');
        successBox.classList.remove('hidden');
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
    input.value = input.value.replace(/\D/g, '').slice(0, 8);
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
    const participantes = await res.json();

    if (participantes.length === 0) {
      grid.innerHTML = '<p class="participants-empty">Aún no hay participantes confirmados. ¡Sé el primero!</p>';
    } else {
      grid.innerHTML = participantes.map(renderCard).join('');
    }
  } catch {
    // Falla silenciosa: la sección queda vacía si no hay conexión
  }
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
