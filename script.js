document.addEventListener('DOMContentLoaded', () => {
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

  const aliasPlaceholder = aliasInput.placeholder;
  let aliasPrevValue = '';

  // El check "Prefiero que me llamen por mi nombre" deshabilita el alias
  // y deja claro que se usará el nombre en su lugar.
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

  // Solo dígitos y máximo 8 caracteres para el DNI.
  dniInput.addEventListener('input', () => {
    dniInput.value = dniInput.value.replace(/\D/g, '').slice(0, 8);
  });

  // Al elegir "Otro" en la frase, se muestra un campo para escribir la propia.
  fraseSelect.addEventListener('change', () => {
    const esOtro = fraseSelect.value === 'otro';
    fraseOtroInput.classList.toggle('hidden', !esOtro);
    fraseOtroInput.required = esOtro;
    if (!esOtro) fraseOtroInput.value = '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const displayName = (!sinAliasCheck.checked && aliasInput.value.trim())
      ? aliasInput.value.trim()
      : nombreInput.value.trim();

    successName.textContent = displayName;
    form.classList.add('hidden');
    successBox.classList.remove('hidden');
  });
});
