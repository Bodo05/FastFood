/**
 * FastFood Project - Utility Functions
 * Funzioni condivise tra tutte le pagine
 */

/**
 * Mostra un toast Bootstrap
 * @param {string} message - Testo del messaggio
 * @param {string} type - Tipo: success, danger, warning, info
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastPlaceHolder');
    if (!container) {
        console.warn('Toast container non trovato');
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0 mb-2 shadow`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body fw-bold">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    container.appendChild(toast);
    new bootstrap.Toast(toast).show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

/**
 * Ricerca dalla navbar
 */
function effettuaRicercaNavbar() {
    const input = document.getElementById('navbarSearchInput');
    const q = input ? input.value.trim() : '';

    if (!q) {
        showToast('Inserisci un termine di ricerca', 'warning');
        return;
    }

    if (window.location.pathname.endsWith('ricerca.html')) {
        const mainInput = document.getElementById('inputRicerca');
        if (mainInput) {
            mainInput.value = q;
            if (typeof eseguiRicerca === 'function') eseguiRicerca();
        }
    } else {
        window.location.href = `ricerca.html?q=${encodeURIComponent(q)}`;
    }
}
