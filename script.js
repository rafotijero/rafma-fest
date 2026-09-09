document.addEventListener('DOMContentLoaded', () => {
  cargarParticipantes();

  const form = document.getElementById('rsvp-form');
  if (!form) return;

  const nombreInput = document.getElementById('nombre');
  const dniInput = document.getElementById('dni');
  const aliasInput = document.getElementById('alias');
  const sinAliasCheck = document.getElementById('sinAlias');
  const fraseSelect = document.getElementById('frase');
  const fraseOtroInput = document.getElementById('fraseOtro');
  const successBox = document.getElementById('rsvp-success');
  const successName = document.getElementById('successName');
  const submitBtn = form.querySelector('.btn-submit');

  const aliasPlaceholder = aliasInput.placeholder;
  let aliasPrevValue = '';

  sinAliasCheck.addEventListener('change', () => {
    if (sinAliasCheck.checked) {
      aliasPrevValue = aliasInput.value;
      aliasInput.value = '';
      aliasInput.disabled = true;
      aliasInput.placeholder = 'Usaremos tu nombre';
    } else {
      aliasInput.disabled = false;
      aliasInput.value = aliasPrevValue;
      aliasInput.placeholder = aliasPlaceholder;
    }
  });

  dniInput.addEventListener('input', () => {
    dniInput.value = dniInput.value.replace(/\D/g, '').slice(0, 8);
  });

  fraseSelect.addEventListener('change', () => {
    const esOtro = fraseSelect.value === 'otro';
    fraseOtroInput.classList.toggle('hidden', !esOtro);
    fraseOtroInput.required = esOtro;
    if (!esOtro) fraseOtroInput.value = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = {
      nombre: nombreInput.value.trim(),
      apellidos: document.getElementById('apellidos').value.trim(),
      dni: dniInput.value.trim(),
      alias: aliasInput.value.trim(),
      sinAlias: sinAliasCheck.checked,
      experiencia: document.getElementById('experiencia').value,
      frase: fraseSelect.value,
      fraseOtro: fraseOtroInput.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const displayName = (!data.sinAlias && data.alias) ? data.alias : data.nombre;
        successName.textContent = displayName;
        form.classList.add('hidden');
        successBox.classList.remove('hidden');
        cargarParticipantes();
      } else {
        const err = await res.json();
        let msg = err.error || 'Hubo un error al guardar tu registro. Intenta de nuevo.';
        mostrarErrorFormulario(form, msg);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar mi asistencia 🎉';
      }
    } catch {
      mostrarErrorFormulario(form, 'Error de conexión. Intenta de nuevo.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar mi asistencia 🎉';
    }
  });
});

function mostrarErrorFormulario(form, mensaje) {
  let errorEl = form.querySelector('.form-error');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.className = 'form-error';
    form.appendChild(errorEl);
  }
  errorEl.textContent = mensaje;
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
