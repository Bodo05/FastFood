document.addEventListener('DOMContentLoaded', function() {
    loadCategorie();
    
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    
    if (query) {
        const input = document.getElementById('navbarSearchInput');
        if (input) {
            input.value = query;
        }
        cercaGenerica(query);
    }
});

async function loadCategorie() {
    try {
        const res = await fetch('http://localhost:3000/categorie');
        const categorie = await res.json();
        
        const select = document.getElementById('ricercaPiattoCategoria');
        if(select) {
            select.innerHTML = '<option value="">Seleziona categoria...</option>';
            categorie.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            });
        }
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
    if (window.location.pathname.endsWith('ricerca.html')) {
        cercaGenerica(q);
    } else {
        window.location.href = `ricerca.html?q=${encodeURIComponent(q)}`;
    }
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

// (Le altre funzioni di ricerca avanzata restano, chiamano le API che ora sono filtrate)
async function cercaPiattoPerNome() {
    const q = document.getElementById('ricercaPiattoNome').value.trim();
    if (!q) {alert('Inserisci il nome'); return;}
    cercaGenerica(q);
}

// ... (Puoi mantenere le altre funzioni helper se presenti, la logica chiave è sopra)

function mostraRisultatiGenerici(risultati, termine) {
    const container = document.getElementById('risultatiRicerca');
    container.innerHTML = '';
    
    if (risultati.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-info">Nessun piatto o ristorante attivo trovato per "${termine}"</div></div>`;
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

function creaCardPiatto(piatto) {
    const card = document.createElement('div');
    card.className = 'col-md-6 mb-3';
    
    const ristorante = piatto.ristoranteInfo?.nomeRistorante || piatto.ristoranteNome || 'N/A';
    const rId = piatto.ristoranteId || '';

    card.innerHTML = `
        <div class="card h-100 shadow-sm">
            <div class="row g-0 h-100">
                <div class="col-md-4">
                    <img src="${piatto.thumb || 'https://via.placeholder.com/150'}" class="img-fluid rounded-start h-100 w-100" style="object-fit: cover">
                </div>
                <div class="col-md-8">
                    <div class="card-body d-flex flex-column h-100">
                        <h5 class="card-title">${piatto.nome}</h5>
                        <div class="flex-grow-1">
                            <p class="card-text mb-1">
                                <strong>Ristorante:</strong> ${ristorante}<br>
                                <strong>Prezzo:</strong> €${piatto.prezzo ? piatto.prezzo.toFixed(2) : 'N/A'}<br>
                                <small class="text-muted">${piatto.categoria || 'Generale'}</small>
                            </p>
                        </div>
                        <div class="mt-auto">
                            <button class="btn btn-primary btn-sm" 
                                onclick="aggiungiAlCarrello('${piatto._id}', '${(piatto.nome||'').replace(/'/g, "\\'")}', ${piatto.prezzo || 0}, '${piatto.thumb}', '${piatto.categoria}', '${rId}', '${ristorante.replace(/'/g, "\\'")}')">
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
                    <strong>Telefono:</strong> ${ristorante.telefono || 'N/A'}
                </p>
                <button class="btn btn-outline-primary btn-sm">Vedi Menu Completo</button>
            </div>
        </div>
    `;
    return card;
}

function aggiungiAlCarrello(id, nome, prezzo, thumb, cat, rId, rNome) {
    // Stessa logica di cliente.js per il carrello
    let carrello = JSON.parse(localStorage.getItem('carrello') || '[]');
    const item = carrello.find(i => i.idMeal === id);
    if(item) item.quantita++;
    else carrello.push({idMeal:id, strMeal:nome, price:prezzo, strMealThumb:thumb, strCategory:cat, ristoranteId:rId, ristoranteNome:rNome, quantita:1});
    localStorage.setItem('carrello', JSON.stringify(carrello));
    alert(nome + ' aggiunto al carrello!');
}

function showLoading() { /* ... */ }
function hideLoading() { /* ... */ }
function logout() { localStorage.clear(); window.location.href = 'login.html'; }