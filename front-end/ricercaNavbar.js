document.addEventListener('DOMContentLoaded', function() {
    loadCategorie();
});

async function loadCategorie() {
    try {
        const res = await fetch('http://localhost:3000/categorie');
        const categorie = await res.json();
        
        const select = document.getElementById('ricercaPiattoCategoria');
        select.innerHTML = '<option value="">Seleziona categoria...</option>';
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
    cercaGenerica(q);
}

async function cercaGenerica(q) {
    try {
        showLoading();
        const res = await fetch(`http://localhost:3000/ricerca?q=${encodeURIComponent(q)}`);
        const risultati = await res.json();
        mostraRisultatiGenerici(risultati, q);
    } catch (err) {
        console.error('Errore ricerca:', err);
        alert('Errore durante la ricerca');
    } finally {
        hideLoading();
    }
}

async function cercaPiattoPerNome() {
    const q = document.getElementById('ricercaPiattoNome').value.trim();
    if (!q) {
        alert('Inserisci il nome di un piatto');
        return;
    }
    cercaGenerica(q);
}

async function cercaPiattoPerCategoria() {
    const categoria = document.getElementById('ricercaPiattoCategoria').value;
    if (!categoria) {
        alert('Seleziona una categoria');
        return;
    }
    cercaGenerica(categoria);
}

async function cercaPiattoPerPrezzo() {
    const prezzoMin = document.getElementById('prezzoMinRicerca').value;
    const prezzoMax = document.getElementById('prezzoMaxRicerca').value;
    
    if (!prezzoMin && !prezzoMax) {
        alert('Inserisci almeno un prezzo (minimo o massimo)');
        return;
    }
    
    try {
        showLoading();
        const params = new URLSearchParams();
        params.append('tipo', 'piatto');
        if (prezzoMin) params.append('prezzoMin', prezzoMin);
        if (prezzoMax) params.append('prezzoMax', prezzoMax);
        
        const res = await fetch(`http://localhost:3000/ricerca-avanzata?${params.toString()}`);
        const risultati = await res.json();
        mostraRisultatiPrezzo(risultati, prezzoMin, prezzoMax);
    } catch (err) {
        console.error('Errore ricerca:', err);
        alert('Errore durante la ricerca');
    } finally {
        hideLoading();
    }
}

async function cercaRistorantePerNome() {
    const q = document.getElementById('ricercaRistoranteNome').value.trim();
    if (!q) {
        alert('Inserisci il nome di un ristorante');
        return;
    }
    
    try {
        showLoading();
        const res = await fetch(`http://localhost:3000/ricerca-avanzata?tipo=ristorante&q=${encodeURIComponent(q)}`);
        const risultati = await res.json();
        mostraRisultatiRistoranti(risultati, `Ristoranti con nome: "${q}"`);
    } catch (err) {
        console.error('Errore ricerca:', err);
        alert('Errore durante la ricerca');
    } finally {
        hideLoading();
    }
}

async function cercaRistorantePerLuogo() {
    const luogo = document.getElementById('ricercaRistoranteLuogo').value.trim();
    if (!luogo) {
        alert('Inserisci un luogo');
        return;
    }
    
    try {
        showLoading();
        const res = await fetch(`http://localhost:3000/ricerca-avanzata?tipo=ristorante&luogo=${encodeURIComponent(luogo)}`);
        const risultati = await res.json();
        mostraRisultatiRistoranti(risultati, `Ristoranti in: "${luogo}"`);
    } catch (err) {
        console.error('Errore ricerca:', err);
        alert('Errore durante la ricerca');
    } finally {
        hideLoading();
    }
}

async function cercaRistorantePerPiattoNavbar() {
    const piatto = document.getElementById('ricercaRistorantePerPiatto').value.trim();
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

async function cercaPerIngrediente() {
    const ingrediente = document.getElementById('ricercaPerIngrediente').value.trim();
    if (!ingrediente) {
        alert('Inserisci un ingrediente');
        return;
    }
    
    try {
        showLoading();
        const res = await fetch(`http://localhost:3000/ricerca-avanzata?tipo=piatto&ingrediente=${encodeURIComponent(ingrediente)}`);
        const risultati = await res.json();
        mostraRisultatiIngredienti(risultati, ingrediente);
    } catch (err) {
        console.error('Errore ricerca:', err);
        alert('Errore durante la ricerca');
    } finally {
        hideLoading();
    }
}

async function cercaEscludiAllergene() {
    const allergene = document.getElementById('ricercaEscludiAllergene').value.trim();
    if (!allergene) {
        alert('Inserisci un allergene da escludere');
        return;
    }
    
    try {
        showLoading();
        const res = await fetch(`http://localhost:3000/ricerca-avanzata?tipo=piatto&allergene=${encodeURIComponent(allergene)}`);
        const risultati = await res.json();
        mostraRisultatiSenzaAllergene(risultati, allergene);
    } catch (err) {
        console.error('Errore ricerca:', err);
        alert('Errore durante la ricerca');
    } finally {
        hideLoading();
    }
}

function mostraRisultatiGenerici(risultati, termine) {
    const container = document.getElementById('risultatiRicerca');
    container.innerHTML = '';
    
    if (risultati.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-info">Nessun risultato trovato per "${termine}"</div></div>`;
        return;
    }
    
    const titolo = document.createElement('h4');
    titolo.className = 'mb-3';
    titolo.textContent = `Risultati per "${termine}":`;
    container.appendChild(titolo);
    
    risultati.forEach(item => {
        if (item.tipo === 'piatto') {
            const card = creaCardPiatto(item);
            container.appendChild(card);
        } else {
            const card = creaCardRistorante(item);
            container.appendChild(card);
        }
    });
}

function mostraRisultatiPrezzo(risultati, prezzoMin, prezzoMax) {
    const container = document.getElementById('risultatiRicerca');
    container.innerHTML = '';
    
    const range = prezzoMin && prezzoMax ? `€${prezzoMin} - €${prezzoMax}` : 
                 prezzoMin ? `da €${prezzoMin}` : `fino a €${prezzoMax}`;
    
    if (risultati.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-info">Nessun piatto trovato nel range di prezzo ${range}</div></div>`;
        return;
    }
    
    const titolo = document.createElement('h4');
    titolo.className = 'mb-3';
    titolo.textContent = `Piatti nel range di prezzo ${range}:`;
    container.appendChild(titolo);
    
    risultati.forEach(piatto => {
        const card = creaCardPiatto(piatto);
        container.appendChild(card);
    });
}

function mostraRisultatiRistoranti(risultati, titoloTesto) {
    const container = document.getElementById('risultatiRicerca');
    container.innerHTML = '';
    
    if (risultati.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-info">${titoloTesto} - Nessun risultato trovato</div></div>`;
        return;
    }
    
    const titolo = document.createElement('h4');
    titolo.className = 'mb-3';
    titolo.textContent = titoloTesto;
    container.appendChild(titolo);
    
    risultati.forEach(ristorante => {
        const card = creaCardRistorante(ristorante);
        container.appendChild(card);
    });
}

function mostraRistorantiPerPiatto(risultati, piatto) {
    const container = document.getElementById('risultatiRicerca');
    container.innerHTML = '';
    
    if (risultati.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-info">Nessun ristorante trovato che serve "${piatto}"</div></div>`;
        return;
    }
    
    const titolo = document.createElement('h4');
    titolo.className = 'mb-3';
    titolo.textContent = `Ristoranti che servono "${piatto}":`;
    container.appendChild(titolo);
    
    risultati.forEach(risultato => {
        const card = creaCardRistoranteConPiatto(risultato, piatto);
        container.appendChild(card);
    });
}

function mostraRisultatiIngredienti(risultati, ingrediente) {
    const container = document.getElementById('risultatiRicerca');
    container.innerHTML = '';
    
    if (risultati.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-info">Nessun piatto trovato con l'ingrediente "${ingrediente}"</div></div>`;
        return;
    }
    
    const titolo = document.createElement('h4');
    titolo.className = 'mb-3';
    titolo.textContent = `Piatti con l'ingrediente "${ingrediente}":`;
    container.appendChild(titolo);
    
    risultati.forEach(piatto => {
        const card = creaCardPiatto(piatto);
        container.appendChild(card);
    });
}

function mostraRisultatiSenzaAllergene(risultati, allergene) {
    const container = document.getElementById('risultatiRicerca');
    container.innerHTML = '';
    
    if (risultati.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-info">Nessun piatto trovato senza l'allergene "${allergene}"</div></div>`;
        return;
    }
    
    const titolo = document.createElement('h4');
    titolo.className = 'mb-3';
    titolo.textContent = `Piatti senza l'allergene "${allergene}":`;
    container.appendChild(titolo);
    
    risultati.forEach(piatto => {
        const card = creaCardPiatto(piatto);
        container.appendChild(card);
    });
}

function creaCardPiatto(piatto) {
    const card = document.createElement('div');
    card.className = 'col-md-6 mb-3';
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
                                <strong>Ristorante:</strong> ${piatto.ristoranteInfo?.nomeRistorante || piatto.ristoranteNome || 'N/A'}<br>
                                <strong>Prezzo:</strong> €${piatto.prezzo?.toFixed(2) || 'N/A'}<br>
                                <strong>Tempo:</strong> ${piatto.tempo || 'N/A'} min<br>
                                <strong>Categoria:</strong> ${piatto.categoria || 'N/A'}
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
    return card;
}

function creaCardRistorante(ristorante) {
    const card = document.createElement('div');
    card.className = 'col-12 mb-3';
    card.innerHTML = `
        <div class="card shadow-sm">
            <div class="card-body">
                <h5 class="card-title">${ristorante.nomeRistorante}</h5>
                <p class="card-text">
                    <strong>Indirizzo:</strong> ${ristorante.indirizzo || 'N/A'}<br>
                    <strong>Telefono:</strong> ${ristorante.telefono || 'N/A'}<br>
                    <strong>Partita IVA:</strong> ${ristorante.piva || 'N/A'}
                </p>
                <button class="btn btn-outline-primary btn-sm" 
                        onclick="cercaRistorantePerNomeSpecifico('${ristorante.nomeRistorante}')">
                    Vedi Menu Completo
                </button>
            </div>
        </div>
    `;
    return card;
}

function creaCardRistoranteConPiatto(risultato, piattoCercato) {
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
                <h6>Piatti corrispondenti a "${piattoCercato}":</h6>
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
    return card;
}

function cercaRistorantePerNomeSpecifico(nomeRistorante) {
    document.getElementById('ricercaRistoranteNome').value = nomeRistorante;
    cercaRistorantePerNome();
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
    
    setTimeout(() => toast.remove(), 3000);
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
    if (loading) loading.remove();
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}