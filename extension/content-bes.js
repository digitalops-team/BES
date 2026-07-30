// Content script inyectado en la aplicación web BES

// 1. Notificar a la web que la extensión está instalada
function notifyExtensionReady() {
  window.postMessage({ type: 'BES_EXTENSION_INSTALLED', version: '1.0.0' }, '*');
}

// Notificar al cargar la página
notifyExtensionReady();

// También notificar cuando la página pregunte por la extensión
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'BES_CHECK_EXTENSION') {
    notifyExtensionReady();
  }

  // Escuchar cuando el usuario hace clic en "Acceder a SUNAT"
  if (event.data && event.data.type === 'BES_FILL_SUNAT') {
    const { ruc, usuarioSol, claveSol } = event.data.data || {};
    if (ruc) {
      chrome.storage.local.set({
        bes_pending_login: {
          ruc: ruc || '',
          usuarioSol: usuarioSol || '',
          claveSol: claveSol || '',
          timestamp: Date.now()
        }
      }, () => {
        console.log('[BES Extension] Credenciales de SUNAT guardadas para autocompletado.');
      });
    }
  }
});
