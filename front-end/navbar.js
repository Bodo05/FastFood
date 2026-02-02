/**
 * FastFood Project - Navbar Component
 * Genera dinamicamente la navbar e il container per i toast
 */

document.addEventListener('DOMContentLoaded', function() {
    const navPlaceholder = document.getElementById('navbar-placeholder');
    if (!navPlaceholder) return;

    const userType = localStorage.getItem('userType');
    const userId = localStorage.getItem('_id');
    
    let links = '';
    let homeLink = 'login.html';
    let brandText = 'FastFood';
    let searchBarHtml = '';

    // Configurazione per ristoratore
    if (userType === 'ristoratore') {
        homeLink = 'ristoratore.html';
        brandText = 'FastFood - Gestione';
        links = `
            <li class="nav-item"><a class="nav-link" href="ristoratore.html">Menu</a></li>
            <li class="nav-item"><a class="nav-link" href="ordini_ristoratore.html">Ordini</a></li>
            <li class="nav-item"><a class="nav-link" href="creapiatto.html">Nuovo Piatto</a></li>
            <li class="nav-item"><a class="nav-link" href="statistiche.html">Statistiche</a></li>
            <li class="nav-item"><a class="nav-link" href="gestioneRist.html">Profilo</a></li>
        `;
    } 
    // Configurazione per cliente
    else {
        homeLink = userId ? 'cliente.html' : 'index.html';
        links = `
            <li class="nav-item"><a class="nav-link" href="${homeLink}">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="ricerca.html">Ricerca Avanzata</a></li>
            <li class="nav-item"><a class="nav-link" href="carrello.html">Carrello</a></li>
            <li class="nav-item"><a class="nav-link" href="gestioneCliente.html">Profilo</a></li>
        `;
        
        searchBarHtml = `
            <div class="d-flex me-3" role="search">
                <input class="form-control me-2" type="search" id="navbarSearchInput" placeholder="Cerca piatto..." aria-label="Search">
                <button class="btn btn-outline-warning" onclick="effettuaRicercaNavbar()">Cerca</button>
            </div>
        `;
    }

    // Genera navbar
    navPlaceholder.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark px-3 mb-4 shadow-sm">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold text-warning" href="${homeLink}">${brandText}</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
                <span class="navbar-toggler-icon"></span>
            </button>
            
            <div class="collapse navbar-collapse" id="navContent">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">${links}</ul>
                ${searchBarHtml}
                <div class="d-flex align-items-center">
                    <button class="btn btn-danger btn-sm fw-bold" onclick="logout()">Esci</button>
                </div>
            </div>
        </div>
    </nav>
    `;

    // Evidenzia pagina corrente
    const currentPath = window.location.pathname.split('/').pop();
    const activeLink = navPlaceholder.querySelector(`a[href="${currentPath}"]`);
    if (activeLink) activeLink.classList.add('active', 'fw-bold');

    // Sincronizza ricerca con URL
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const input = document.getElementById('navbarSearchInput');
    if (query && input) input.value = query;

    // Carica categorie se presente il selettore
    if (document.getElementById('ricercaPiattoCategoria')) {
        loadCategorie();
    }
});

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

async function loadCategorie() {
    try {
        const res = await fetch('http://localhost:3000/categorie-catalogo');
        if (res.ok) {
            const categorie = await res.json();
            const select = document.getElementById('ricercaPiattoCategoria'); 
            if (select) {
                select.innerHTML = '<option value="">Tutte le categorie</option>';
                categorie.forEach(cat => {
                    select.innerHTML += `<option value="${cat}">${cat}</option>`;
                });
            }
        }
    } catch (err) {
        console.error('Errore caricamento categorie:', err);
    }
}
