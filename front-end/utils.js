const API_URL = 'http://localhost:3000';

function showToast(message, type = 'success') {
    const container = document.getElementById('toastPlaceHolder');
    if (!container) {
        alert(message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0 mb-2 shadow`;
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body fw-bold">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    container.appendChild(toast);
    new bootstrap.Toast(toast).show();
    
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

function effettuaRicercaNavbar() {
    const input = document.getElementById('navbarSearchInput');
    const query = input ? input.value.trim() : '';

    if (!query) {
        showToast('Inserisci un termine di ricerca', 'warning');
        return;
    }

    if (window.location.pathname.includes('ricerca.html')) {
        document.getElementById('inputRicerca').value = query;
        if (typeof eseguiRicerca === 'function') {
            eseguiRicerca();
        }
    } else {
        window.location.href = 'ricerca.html?q=' + encodeURIComponent(query);
    }
}

function checkLogin(tipoRichiesto) {
    const userId = localStorage.getItem('_id');
    const userType = localStorage.getItem('userType');
    
    if (!userId) {
        alert('Devi effettuare il login');
        window.location.href = 'login.html';
        return false;
    }
    
    if (tipoRichiesto && userType !== tipoRichiesto) {
        alert('Accesso non autorizzato');
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}