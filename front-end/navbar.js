document.addEventListener('DOMContentLoaded', function() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    const userType = localStorage.getItem('userType');
    const userId = localStorage.getItem('_id');
    
    let links = '';
    let homeLink = 'login.html';
    let searchBar = '';

    if (userType === 'ristoratore') {
        homeLink = 'ristoratore.html';
        links = `
            <li class="nav-item"><a class="nav-link" href="ristoratore.html">Menu</a></li>
            <li class="nav-item"><a class="nav-link" href="ordini_ristoratore.html">Ordini</a></li>
            <li class="nav-item"><a class="nav-link" href="creapiatto.html">Nuovo Piatto</a></li>
            <li class="nav-item"><a class="nav-link" href="statistiche.html">Statistiche</a></li>
            <li class="nav-item"><a class="nav-link" href="gestioneRist.html">Profilo</a></li>
        `;
    } 
    else {
        homeLink = userId ? 'cliente.html' : 'login.html';
        links = `
            <li class="nav-item"><a class="nav-link" href="${homeLink}">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="ricerca.html">Ricerca</a></li>
            <li class="nav-item"><a class="nav-link" href="carrello.html">Carrello</a></li>
            <li class="nav-item"><a class="nav-link" href="gestioneCliente.html">Profilo</a></li>
        `;
        
        searchBar = `
            <div class="d-flex me-3">
                <input class="form-control me-2" type="search" id="navbarSearchInput" placeholder="Cerca...">
                <button class="btn btn-outline-warning" onclick="effettuaRicercaNavbar()">Cerca</button>
            </div>
        `;
    }

    placeholder.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark px-3 mb-4">
        <div class="container-fluid">
            <a class="navbar-brand fw-bold text-warning" href="${homeLink}">FastFood</a>
            
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
                <span class="navbar-toggler-icon"></span>
            </button>
            
            <div class="collapse navbar-collapse" id="navContent">
                <ul class="navbar-nav me-auto">${links}</ul>
                ${searchBar}
                <button class="btn btn-danger btn-sm" onclick="logout()">Esci</button>
            </div>
        </div>
    </nav>
    `;

    const pagina = window.location.pathname.split('/').pop();
    const linkAttivo = placeholder.querySelector(`a[href="${pagina}"]`);
    if (linkAttivo) {
        linkAttivo.classList.add('active', 'fw-bold');
    }
});