document.addEventListener('DOMContentLoaded', function() {
    const navPlaceholder = document.getElementById('navbar-placeholder');
    if (!navPlaceholder) return;

    const userType = localStorage.getItem('userType');
    let links = '';
    let homeLink = 'login.html';
    let brandText = 'FastFood';
    let searchBarHtml = '';

    // 1. CONFIGURAZIONE NAVBAR PER RISTORATORE
    if (userType === 'ristoratore') {
        homeLink = 'ristoratore.html';
        brandText = 'FastFood - Gestione';
        links = `
            <li class="nav-item"><a class="nav-link" href="ristoratore.html">Menu</a></li>
            <li class="nav-item"><a class="nav-link" href="ordini_ristoratore.html">Ordini</a></li>
            <li class="nav-item"><a class="nav-link" href="creapiatto.html">Nuovo Piatto</a></li>
            <li class="nav-item"><a class="nav-link" href="statistiche.html">Statistiche</a></li>
        `;
    } 
    // 2. CONFIGURAZIONE NAVBAR PER CLIENTE
    else if (userType === 'cliente') {
        homeLink = 'cliente.html';
        links = `
            <li class="nav-item"><a class="nav-link" href="cliente.html">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="ricerca.html">Ricerca Avanzata</a></li>
            <li class="nav-item"><a class="nav-link" href="carrello.html">Carrello</a></li>
            <li class="nav-item"><a class="nav-link" href="gestioneCliente.html">Profilo</a></li>
        `;
        
        // Aggiungiamo la barra di ricerca SOLO per il cliente
        searchBarHtml = `
            <div class="d-flex me-3" role="search">
                <input class="form-control me-2" type="search" id="navbarSearchInput" placeholder="Cerca piatto..." aria-label="Search">
                <button class="btn btn-outline-warning" onclick="effettuaRicercaNavbar()">Cerca</button>
            </div>
        `;
    }

    // 3. GENERAZIONE HTML
    navPlaceholder.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark px-3 mb-4 shadow-sm">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold text-warning" href="${homeLink}">
                ${brandText}
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
                <span class="navbar-toggler-icon"></span>
            </button>
            
            <div class="collapse navbar-collapse" id="navContent">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    ${links}
                </ul>

                ${searchBarHtml}

                <div class="d-flex align-items-center">
                    <button class="btn btn-danger btn-sm fw-bold" onclick="logout()">Esci</button>
                </div>
            </div>
        </div>
    </nav>
    `;

    // 4. EVIDENZIA PAGINA CORRENTE
    const currentPath = window.location.pathname.split('/').pop();
    const activeLink = navPlaceholder.querySelector(`a[href="${currentPath}"]`);
    if (activeLink) activeLink.classList.add('active', 'fw-bold');

    // 5. INIZIALIZZA LA RICERCA (Se presente input)
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const input = document.getElementById('navbarSearchInput');
    
    // Se c'è una ricerca nell'URL e la barra esiste, rimettiamo il testo dentro
    if (query && input) {
        input.value = query;
    }
});

// --- FUNZIONI LOGICHE ---

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function effettuaRicercaNavbar() {
    const input = document.getElementById('navbarSearchInput');
    const q = input ? input.value.trim() : '';

    if (!q) {
        // Usa showToast se disponibile (è globale nelle tue pagine HTML), altrimenti alert
        if(typeof showToast === 'function') showToast('Inserisci un termine di ricerca', 'warning');
        else alert('Inserisci un termine di ricerca');
        return;
    }

    // Se siamo già in ricerca.html, aggiorniamo i risultati direttamente
    if (window.location.pathname.endsWith('ricerca.html')) {
        const mainInput = document.getElementById('inputRicerca');
        if(mainInput) {
            mainInput.value = q;
            if(typeof eseguiRicerca === 'function') eseguiRicerca();
        }
    } else {
        // Altrimenti andiamo alla pagina di ricerca
        window.location.href = `ricerca.html?q=${encodeURIComponent(q)}`;
    }
}