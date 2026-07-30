// Content script inyectado en el portal de la SUNAT (e-menu.sunat.gob.pe)

function setInputValue(input, value) {
  if (!input || value === undefined || value === null) return;
  input.focus();
  input.value = value;
  
  // Disparar eventos nativos para que los scripts de SUNAT detecten los valores
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
}

function fillSunatForm(credentials) {
  if (!credentials || !credentials.ruc) return false;

  // Verificar si las credenciales expiraron (más de 3 minutos)
  if (Date.now() - credentials.timestamp > 3 * 60 * 1000) {
    chrome.storage.local.remove('bes_pending_login');
    return false;
  }

  // 1. Buscar campo RUC
  const rucInput = document.querySelector('#txtRuc') || 
                   document.querySelector('input[name="txtRuc"]') ||
                   document.querySelector('input[placeholder*="RUC"]') ||
                   document.querySelector('input[id*="Ruc"]');

  // 2. Buscar campo Usuario
  const userInput = document.querySelector('#txtUsuario') || 
                    document.querySelector('input[name="txtUsuario"]') ||
                    document.querySelector('input[placeholder*="Usuario"]') ||
                    document.querySelector('input[id*="Usuario"]');

  // 3. Buscar campo Contraseña
  const passInput = document.querySelector('#txtContrasena') || 
                    document.querySelector('input[name="txtContrasena"]') ||
                    document.querySelector('input[placeholder*="Contraseña"]') ||
                    document.querySelector('input[placeholder*="Clave"]') ||
                    document.querySelector('input[type="password"]');

  if (rucInput && userInput && passInput) {
    setInputValue(rucInput, credentials.ruc);
    setInputValue(userInput, credentials.usuarioSol);
    setInputValue(passInput, credentials.claveSol);

    console.log('[BES Extension] Formulario de la SUNAT autocompletado con éxito.');

    // Limpiar credenciales usadas
    chrome.storage.local.remove('bes_pending_login');

    // Mostrar una pequeña notificación flotante en la esquina de SUNAT
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
    z-index: 999999;
    background: #111827;
    color: #34d399;
    border: 1px solid rgba(52, 211, 153, 0.3);
    padding: 12px 18px;
    border-radius: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: bold;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    gap: 10px;
    animation: fadeIn 0.3s ease;
  `;
  banner.innerHTML = `
    <span>✅ Credenciales de RUC <strong>${ruc}</strong> cargadas automáticamente por BES. Haz clic en <strong>Iniciar sesión</strong>.</span>
  `;
  document.body.appendChild(banner);
  setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transition = 'opacity 0.5s ease';
    setTimeout(() => banner.remove(), 500);
  }, 6000);
}

// Intentar rellenar continuamente mientras carga la página
function init() {
  chrome.storage.local.get('bes_pending_login', (result) => {
    const credentials = result.bes_pending_login;
    if (!credentials) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const success = fillSunatForm(credentials);
      if (success || attempts > 25) {
        clearInterval(interval);
      }
    }, 300);
  });
}

// Ejecutar al cargar la ventana y documento
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
