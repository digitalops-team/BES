// Content script inyectado en la SUNAT (*.sunat.gob.pe)

function setInputValue(input, value) {
  if (!input || value === undefined || value === null) return;
  try {
    input.focus();
    // Usar el setter nativo de HTMLInputElement para evitar que React / Angular ignoren la escritura
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(input, value);
    } else {
      input.value = value;
    }
  } catch (e) {
    input.value = value;
  }

  // Disparar todos los eventos de interacción posibles
  ['input', 'change', 'keydown', 'keyup', 'blur'].forEach(eventType => {
    input.dispatchEvent(new Event(eventType, { bubbles: true }));
  });
}

function findInputs() {
  const inputs = Array.from(document.querySelectorAll('input'));
  let rucInput = null;
  let userInput = null;
  let passInput = null;

  for (const input of inputs) {
    const type = (input.type || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

    // 1. Password input
    if (type === 'password' || id.includes('clave') || id.includes('contras') || name.includes('clave') || name.includes('contras') || placeholder.includes('contra') || placeholder.includes('clave')) {
      if (!passInput) passInput = input;
      continue;
    }

    // 2. RUC input
    if (id.includes('ruc') || name.includes('ruc') || placeholder.includes('ruc') || ariaLabel.includes('ruc')) {
      if (!rucInput) rucInput = input;
      continue;
    }

    // 3. Usuario input
    if (id.includes('usuario') || name.includes('usuario') || id.includes('user') || name.includes('user') || placeholder.includes('usuario') || placeholder.includes('user') || ariaLabel.includes('usuario')) {
      if (!userInput) userInput = input;
      continue;
    }
  }

  // Fallback por orden visual si no se encontraron por id/placeholder (en formularios estándar RUC es el 1ro, Usuario el 2do, Clave el 3ro)
  if (!rucInput || !userInput || !passInput) {
    const textInputs = inputs.filter(i => {
      const t = (i.type || 'text').toLowerCase();
      return t === 'text' || t === 'tel' || t === 'number' || t === '';
    });

    if (!rucInput && textInputs[0]) rucInput = textInputs[0];
    if (!userInput && textInputs[1]) userInput = textInputs[1];
    if (!passInput) {
      const pass = inputs.find(i => (i.type || '').toLowerCase() === 'password');
      if (pass) passInput = pass;
    }
  }

  return { rucInput, userInput, passInput };
}

function fillSunatForm(credentials) {
  if (!credentials || !credentials.ruc) return false;

  // Si las credenciales tienen más de 5 minutos, expirar
  if (Date.now() - credentials.timestamp > 5 * 60 * 1000) {
    chrome.storage.local.remove('bes_pending_login');
    return false;
  }

  const { rucInput, userInput, passInput } = findInputs();

  if (rucInput && userInput && passInput) {
    setInputValue(rucInput, credentials.ruc);
    setInputValue(userInput, credentials.usuarioSol);
    setInputValue(passInput, credentials.claveSol);

    console.log('[BES Extension] Formulario autocompletado con éxito.');
    chrome.storage.local.remove('bes_pending_login');
    showSunatBanner(credentials.ruc);
    return true;
  }

  return false;
}

function showSunatBanner(ruc) {
  if (document.getElementById('bes-sunat-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'bes-sunat-banner';
  banner.style.cssText = `
    position: fixed;
    top: 15px;
    right: 15px;
    z-index: 9999999;
    background: #111827;
    color: #34d399;
    border: 1px solid rgba(52, 211, 153, 0.4);
    padding: 12px 18px;
    border-radius: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: bold;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  banner.innerHTML = `
    <span>✅ BES autocompletó las credenciales del RUC <strong>${ruc}</strong>. Haz clic en <strong>Iniciar sesión</strong>.</span>
  `;
  document.body.appendChild(banner);
  setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transition = 'opacity 0.5s ease';
    setTimeout(() => banner.remove(), 500);
  }, 7000);
}

function init() {
  chrome.storage.local.get('bes_pending_login', (result) => {
    const credentials = result.bes_pending_login;
    if (!credentials) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const success = fillSunatForm(credentials);
      if (success || attempts > 30) {
        clearInterval(interval);
      }
    }, 400);
  });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
