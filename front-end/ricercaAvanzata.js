let currentTipoRicerca = 'piatto';

function setTipoRicerca(tipo) {
    currentTipoRicerca = tipo;
    document.getElementById('btnRicercaPiatto').classList.toggle('btn-primary', tipo === 'piatto');
    document.getElementById('btnRicercaPiatto').classList.toggle('btn-outline-primary', tipo !== 'piatto');
    document.getElementById('btnRicercaRistorante').classList.toggle('btn-primary', tipo === 'ristorante');
    document.getElementById('btnRicercaRistorante').classList.toggle('btn-outline-primary', tipo !== 'ristorante');
    
    document.getElementById('filtriPiatto').style.display = tipo === 'piatto' ? 'block' : 'none';
    document.getElementById('filtriRistorante').style.display = tipo === 'ristorante' ? 'block' : 'none';
    
    document.getElementById('risultati').innerHTML = '';
}

async function cerca() {
    const q = document.getElementById('searchInput').value;
    const tipo = currentTipoRicerca;
    
    let url = 'http://localhost:3000/ricerca-avanzata?';
    const params = new URLSearchParams();
    
    if (q) params.append('q', q);
    params.append('tipo', tipo);
    
    if (tipo === 'piatto') {
        const categoria = document.getElementById('filtroCategoria').value;
        const ingrediente = document.getElementById('filtroIngrediente').value;
        const allergene = document.getElementById('filtroAllergene').value;
        const prezzoMin = document.getElementById('prezzoMin').value;
        const prezzoMax = document.getElementById('prezzoMax').value;
        const ristorante = document.getElementById('filtroRistorantePiatto').value;
        const luogo = document.getElementById('filtroLuogoPiatto').value;
        
        if (categoria) params.append('categoria', categoria);
        if (ingrediente) params.append('ingrediente', ingrediente);
        if (allergene) params.append('allergene', allergene);
        if (prezzoMin) params.append('prezzoMin', prezzoMin);
        if (prezzoMax) params.append('prezzoMax', prezzoMax);
        if (ristorante) params.append('ristorante', ristorante);
        if (luogo) params.append('luogo', luogo);
        
    } else {
        const luogo = document.getElementById('filtroLuogoRistorante').value;
        if (luogo) params.append('luogo', luogo);
    }
    
    try {
        showLoading();
        const res = await fetch(url + params.toString());
        const risultati = await res.json();
        mostraRisultati(risultati, tipo);
    } catch (err) {
        console.error('Errore ricerca:', err);
        alert('Errore durante la ricerca');
    } finally {
        hideLoading();
    }
}

async function cercaRistorantePerPiatto() {
    const piatto = document.getElementById('ricercaRistorantePerPiatto').value;
    if (!piatto) {
        alert('Inserisci il nome di un piatto');
        return;
    }
    
    try {
        showLoading();
        const res = await fetch(`http://localhost:3000/ricerca-ristorante-per-piatto?piatto=${encodeURIComponent(piatto)}`);
        const risultati = await res.json();
        mostraRistorantiPerPiatto(risultati, piatto);
    } catch (err) {
        console.error('Errore ricerca:', err);
        alert('Errore durante la ricerca');
    } finally {
        hideLoading();
    }
}

function mostraRisultati(risultati, tipo) {
    const container = document.getElementById('risultati');
    container.innerHTML = '';
    
    if (risultati.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nessun risultato trovato</div>';
        return;
    }
    
    if (tipo === 'piatto') {
        risultati.forEach(piatto => {
            const card = document.createElement('div');
            card.className = 'col-md-6 mb-4';
            card.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <div class="row g-0 h-100">
                        <div class="col-md-4">
                            <img src="${piatto.thumb || 'https://via.placeholder.com/150'}" 
                                 class="img-fluid rounded-start h-100 w-100" 
                                 style="object-fit: cover" 
                                 alt="${piatto.nome}">
                        </div>
                        <div class="col-md-8">
                            <div class="card-body d-flex flex-column h-100">
                                <h5 class="card-title">${piatto.nome}</h5>
                                <div class="flex-grow-1">
                                    <p class="card-text mb-1">
                                        <strong>Ristorante:</strong> ${piatto.ristoranteInfo?.nomeRistorante || 'N/A'}<br>
                                        <strong>Indirizzo:</strong> ${piatto.ristoranteInfo?.indirizzo || 'N/A'}<br>
                                        <strong>Prezzo:</strong> €${piatto.prezzo?.toFixed(2) || 'N/A'}<br>
                                        <strong>Tempo preparazione:</strong> ${piatto.tempo || 'N/A'} min<br>
                                        <strong>Categoria:</strong> ${piatto.categoria || 'N/A'}<br>
                                        <strong>Ingredienti:</strong> ${piatto.ingredienti || 'N/A'}<br>
                                        <strong>Allergeni:</strong> ${piatto.allergeni || 'Nessun allergene noto'}
                                    </p>
                                </div>
                                <div class="mt-auto">
                                    <button class="btn btn-primary btn-sm" 
                                            onclick="aggiungiAlCarrello('${piatto._id}', '${piatto.nome.replace(/'/g, "\\'")}', ${piatto.prezzo || 0}, '${piatto.thumb}', '${piatto.categoria}')">
                                        Aggiungi al Carrello
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } else {
        risultati.forEach(ristorante => {
            const card = document.createElement('div');
            card.className = 'col-12 mb-4';
            card.innerHTML = `
                <div class="card shadow-sm">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">${ristorante.nomeRistorante}</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Indirizzo:</strong> ${ristorante.indirizzo || 'N/A'}</p>
                                <p><strong>Telefono:</strong> ${ristorante.telefono || 'N/A'}</p>
                                <p><strong>Partita IVA:</strong> ${ristorante.piva || 'N/A'}</p>
                            </div>
                        </div>
                        
                        <h6 class="mt-3">Menu del Ristorante:</h6>
                        <div class="row">
                            ${ristorante.piattiMenu && ristorante.piattiMenu.length > 0 ? 
                                ristorante.piattiMenu.map(piatto => `
                                    <div class="col-md-6 mb-2">
                                        <div class="card">
                                            <div class="card-body py-2">
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <strong>${piatto.nome}</strong><br>
                                                        <small class="text-muted">
                                                            €${piatto.prezzo?.toFixed(2)} - ${piatto.tempo}min - ${piatto.categoria}
                                                        </small>
                                                    </div>
                                                    <button class="btn btn-primary btn-sm" 
                                                            onclick="aggiungiAlCarrello('${piatto._id}', '${piatto.nome.replace(/'/g, "\\'")}', ${piatto.prezzo || 0}, '${piatto.thumb}', '${piatto.categoria}')">
                                                        Aggiungi
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('') : 
                                '<div class="col-12"><p class="text-muted">Nessun piatto nel menu</p></div>'
                            }
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }
}

function mostraRistorantiPerPiatto(risultati, piattoCercato) {
    const container = document.getElementById('risultatiRistorantePerPiatto');
    container.innerHTML = '';
    
    if (risultati.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nessun ristorante trovato che serve "' + piattoCercato + '"</div>';
        return;
    }
    
    risultati.forEach(risultato => {
        const ristorante = risultato.ristorante;
        const card = document.createElement('div');
        card.className = 'col-12 mb-3';
        card.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">${ristorante.nomeRistorante}</h5>
                    <p class="card-text">
                        <strong>Indirizzo:</strong> ${ristorante.indirizzo || 'N/A'}<br>
                        <strong>Telefono:</strong> ${ristorante.telefono || 'N/A'}
                    </p>
                    <h6>Piatti corrispondenti:</h6>
                    <div class="row">
                        ${risultato.piatti.map(piatto => `
                            <div class="col-md-6 mb-2">
                                <div class="card bg-light">
                                    <div class="card-body py-2">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>${piatto.nome}</strong><br>
                                                <small class="text-muted">
                                                    €${piatto.prezzo?.toFixed(2)} - ${piatto.tempo}min
                                                </small>
                                            </div>
                                            <button class="btn btn-primary btn-sm" 
                                                    onclick="aggiungiAlCarrello('${piatto._id}', '${piatto.nome.replace(/'/g, "\\'")}', ${piatto.prezzo || 0}, '${piatto.thumb}', '${piatto.categoria}')">
                                                Aggiungi
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function aggiungiAlCarrello(idMeal, strMeal, price, strMealThumb, strCategory) {
    let carrello = JSON.parse(localStorage.getItem('carrello') || '[]');
    const piattoEsistente = carrello.find(item => item.idMeal === idMeal);
    
    if (piattoEsistente) {
        piattoEsistente.quantita += 1;
    } else {
        carrello.push({
            idMeal,
            strMeal,
            strMealThumb,
            price,
            strCategory,
            quantita: 1
        });
    }
    
    localStorage.setItem('carrello', JSON.stringify(carrello));
    
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 m-3 alert alert-success';
    toast.style.zIndex = '1050';
    toast.innerHTML = `<strong>${strMeal}</strong> aggiunto al carrello!`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showLoading() {
    let loading = document.getElementById('loadingSpinner');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loadingSpinner';
        loading.className = 'position-fixed top-50 start-50 translate-middle';
        loading.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Caricamento...</span>
            </div>
        `;
        loading.style.zIndex = '1050';
        document.body.appendChild(loading);
    }
}

function hideLoading() {
    const loading = document.getElementById('loadingSpinner');
    if (loading) {
        loading.remove();
    }
}

async function loadCategorieFiltri() {
    try {
        const res = await fetch('http://localhost:3000/categorie');
        const categorie = await res.json();
        
        const select = document.getElementById('filtroCategoria');
        select.innerHTML = '<option value="">Tutte le categorie</option>';
        categorie.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Errore caricamento categorie:', err);
    }
}

function effettuaRicercaNavbar() {
    const q = document.getElementById('navbarSearchInput').value.trim();
    if (!q) {
        alert('Inserisci un termine di ricerca');
        return;
    }
    window.location.href = `ricerca.html?q=${encodeURIComponent(q)}`;
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', loadCategorieFiltri);