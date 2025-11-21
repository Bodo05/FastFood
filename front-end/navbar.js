document.addEventListener('DOMContentLoaded', function() {
    const navPlaceholder = document.getElementById('navbar-placeholder');
    if (!navPlaceholder) return;

    const userType = localStorage.getItem('userType');
    let links = '';
    let homeLink = 'login.html';
    let brandText = 'FastFood';

    // NAVBAR PER RISTORATORE
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
    // NAVBAR PER CLIENTE
    else if (userType === 'cliente') {
        homeLink = 'cliente.html';
        links = `
            <li class="nav-item"><a class="nav-link" href="cliente.html">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="ricerca.html">Ricerca</a></li>
            <li class="nav-item"><a class="nav-link" href="ricercaAvanzata.html">Ricerca Avanzata</a></li>
            <li class="nav-item"><a class="nav-link" href="carrello.html">Carrello</a></li>
            <li class="nav-item"><a class="nav-link" href="gestioneCliente.html">Profilo</a></li>
        `;
    }

    // HTML DELLA NAVBAR
    navPlaceholder.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark px-3 mb-4">
        <a class="navbar-brand" href="${homeLink}">${brandText}</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navContent">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                ${links}
            </ul>
            <div class="d-flex align-items-center">
                ${userType === 'cliente' ? `
                <div class="input-group me-3" style="max-width: 250px;">
                    <input type="text" id="navbarSearchInput" class="form-control form-control-sm" placeholder="Cerca...">
                    <button class="btn btn-outline-light btn-sm" onclick="effettuaRicercaNavbar()">🔍</button>
                </div>` : ''}
                <button class="btn btn-outline-danger btn-sm" onclick="logout()">Esci</button>
            </div>
        </div>
    </nav>
    `;

    // Evidenzia la pagina corrente
    const currentPath = window.location.pathname.split('/').pop();
    const activeLink = navPlaceholder.querySelector(`a[href="${currentPath}"]`);
    if (activeLink) activeLink.classList.add('active', 'fw-bold');
});

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Funzione di ricerca per la navbar (solo clienti)
function effettuaRicercaNavbar() {
    const q = document.getElementById('navbarSearchInput').value.trim();
    if (q) window.location.href = `ricerca.html?q=${encodeURIComponent(q)}`;
}