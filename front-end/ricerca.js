//appena carico pagina controllo se ci sono parametri nell'indirizzo
document.addEventListener('DOMContentLoaded', function() {
    aggiornaPlaceholder();
    controllaParametriUrl();
});

function aggiornaPlaceholder() {
    //ogni volta che cambio selezione viene chiamata questa funzione che salva
    //tipologia di ricerca e il testo della ricerca
    const tipo = document.getElementById('tipoRicerca').value;
    const input = document.getElementById('inputRicerca');
    
    const placeholders = {
        generale: "Es. Pizza, Pasta, Dessert...",
        ingrediente: "Es. Pomodoro, Mozzarella...",
        ristorante: "Es. Da Mario, Pizzeria...",
        luogo: "Es. Milano, Roma...",
        allergene: "Es. Glutine, Lattosio...",
        piatto_ristorante: "Es. Carbonara..."
    };
    //cambio la scritta di esempio quando cambio tipolgia ricerca
    input.placeholder = placeholders[tipo] || "Scrivi qui...";
}

function controllaParametriUrl() {
    //legge url,riempie barra di ricerca e avvia
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const ristorante = params.get('ristorante');

    if (ristorante) {
        document.getElementById('inputRicerca').value = ristorante;
        document.getElementById('tipoRicerca').value = 'ristorante';
        aggiornaPlaceholder();
        eseguiRicerca();
    } else if (query) {
        document.getElementById('inputRicerca').value = query;
        eseguiRicerca();
    }
}

async function eseguiRicerca() {
    //controllo che sia loggato e salvo i parametri di ricerca
    if (checkLogin('cliente') === false) return;
    const tipo = document.getElementById('tipoRicerca').value;
    const query = document.getElementById('inputRicerca').value.trim();
    const container = document.getElementById('containerRisultati');

    if (!query) {
        showToast("Inserisci qualcosa da cercare!", "warning");
        return;
    }

    container.innerHTML = '';
    let endpoint = '';
    
    switch (tipo) {
        case 'generale': endpoint = `/ricerca/generale?q=${query}`; break;
        case 'ingrediente': endpoint = `/ricerca/ingrediente?q=${query}`; break;
        case 'ristorante': endpoint = `/ricerca/ristorante?q=${query}`; break;
        case 'luogo': endpoint = `/ricerca/luogo?q=${query}`; break;
        case 'allergene': endpoint = `/ricerca/allergene?q=${query}`; break;
        case 'piatto_ristorante': endpoint = `/ricerca/piatto-ristorante?q=${query}`; break;
    }
    //costruisco endpoint in base al tipo di ricerca

    try {
        //chiamo api e salvo in risposta
        const risposta = await fetch(API_URL + endpoint);
        
        if (!risposta.ok) throw new Error("Errore server");
        
        const risultati = await risposta.json();
        mostraRisultati(risultati, tipo);
        
    } catch (errore) {
        console.error(errore);
        container.innerHTML = '<div class="alert alert-danger">Errore di connessione.</div>';
    }
}

//la funzione mi permette di mostrare in modo differenze,  se cerco per chi fa questo piatto
//ho il ristorante cin ka lista dei piatti, se cerco per citta mostro i ristoranti e 
//posso vedere il menu tramite un bottone, altrimenti se per ingrediente mostro
//i singoli piatti
function mostraRisultati(risultati, tipo) {
    const container = document.getElementById('containerRisultati');
    
    if (!risultati || risultati.length === 0) {
        container.innerHTML = '<div class="col-12 text-center"><div class="alert alert-warning">Nessun risultato trovato.</div></div>';
        return;
    }

    risultati.forEach(function(item) {
        // 1. Menu Ristorante (Priorità)
        if (item.piattiMenu && Array.isArray(item.piattiMenu)) {
            const header = document.createElement('div');
            header.className = 'col-12 mb-2 mt-3';
            header.innerHTML = `
                <div class="card border-primary bg-light shadow-sm">
                    <div class="card-body">
                        <h3 class="text-primary fw-bold">${item.nomeRistorante}</h3>
                        <p class="mb-0"><strong>Indirizzo:</strong> ${item.indirizzo || 'N/D'}</p>
                        <p class="mb-0"><strong>Telefono:</strong> ${item.telefono || 'N/D'}</p>
                    </div>
                </div>
                <h5 class="mt-4 mb-2 ps-2 border-start border-4 border-warning">Menu</h5>
            `;
            container.appendChild(header);

            if(item.piattiMenu.length === 0) {
                container.innerHTML += '<div class="col-12 text-muted text-center py-3">Nessun piatto nel menu.</div>';
            } else {
                item.piattiMenu.forEach(p => creaCardPiatto(p, container));
            }
        } 
        // 2. Ristorante Semplice
        else if (item.nomeRistorante && !item.prezzo) {
            creaCardRistorante(item, container);
        } 
        // 3. Piatto
        else {
            creaCardPiatto(item, container);
        }
    });
}

function creaCardPiatto(piatto, container) {
    const immagine = piatto.thumb || piatto.strMealThumb || 'https://via.placeholder.com/300x200?text=No+Image';
    const nome = piatto.nome || piatto.strMeal || "Senza nome";
    const ristorante = piatto.ristoranteNome || 'Sconosciuto';
    const prezzo = parseFloat(piatto.prezzo || 0).toFixed(2); 
    
    //RECUPERO TEMPO O DEFAULT 15
    const tempo = parseInt(piatto.tempo) || 15;

    //RECUPERO DESCRIZIONE E TAGLIO SE TROPPO LUNGA
    let desc = piatto.ingredienti || piatto.strInstructions || "Nessuna descrizione";
    if (desc.length > 90) {
        desc = desc.substring(0, 90) + '...';
    }

    const col = document.createElement('div');
    col.className = 'col-md-4 col-lg-3'; 
    col.innerHTML = `
        <div class="card h-100 shadow-sm border-0">
            <img src="${immagine}" class="card-img-top" style="height: 180px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/300x200?text=Err+Img'">
            <div class="card-body d-flex flex-column p-3">
                
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title text-truncate fw-bold mb-0" title="${nome}" style="max-width: 70%;">${nome}</h5>
                    <span class="badge bg-success">€${prezzo}</span>
                </div>
                
                <p class="text-muted small mb-2"><i class="bi bi-shop"></i> ${ristorante}</p>
                
                <p class="card-text text-secondary small flex-grow-1 border-top pt-2 mt-1" style="font-size: 0.85rem;">
                    <em>${desc}</em>
                </p>

                <div class="mt-auto">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted"><i class="bi bi-clock"></i> ${tempo} min</small>
                    </div>

                    <button class="btn btn-outline-primary w-100 fw-bold" 
                        onclick="aggiungiCarrello('${piatto._id}', '${nome.replace(/'/g, "\\'")}', ${piatto.prezzo || 0}, '${immagine}', '${piatto.categoria || ''}', '${piatto.ristoranteId || ''}', '${ristorante.replace(/'/g, "\\'")}', ${tempo})">
                        Aggiungi al Carrello
                    </button>
                </div>
            </div>
        </div>
    `;
    container.appendChild(col);
}

function creaCardRistorante(ristorante, container) {
    const col = document.createElement('div');
    col.className = 'col-md-6';
    col.innerHTML = `
        <div class="card h-100 border-primary shadow-sm">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0 fw-bold">${ristorante.nomeRistorante}</h5>
            </div>
            <div class="card-body">
                <p class="mb-1"><strong>Indirizzo:</strong> ${ristorante.indirizzo || 'N/D'}</p>
                <p class="mb-3"><strong>Telefono:</strong> ${ristorante.telefono || 'N/D'}</p>
                <a href="ricerca.html?ristorante=${encodeURIComponent(ristorante.nomeRistorante)}" class="btn btn-primary w-100">
                    Vedi Menu
                </a>
            </div>
        </div>
    `;
    container.appendChild(col);
}

function aggiungiCarrello(id, nome, prezzo, thumb, categoria, ristoranteId, ristoranteNome, tempo) {
    if (!localStorage.getItem('_id')) {
        showToast("Devi fare il Login!", "danger");
        return;
    }
    
    let carrello = JSON.parse(localStorage.getItem('carrello') || '[]');
    
    //CHECK MULTI RISTORANTE
    if (carrello.length > 0 && carrello[0].ristoranteId !== ristoranteId) {
        showToast("Puoi ordinare da un solo ristorante alla volta! Svuota prima il carrello.", "warning");
        return; 
    }
    
    const esistente = carrello.find(function(i) { return i.idMeal === id; });
    
    if (esistente) {
        esistente.quantita++;
    } else {
        carrello.push({
            idMeal: id,
            strMeal: nome,
            price: parseFloat(prezzo), 
            strMealThumb: thumb,
            strCategory: categoria,
            ristoranteId: ristoranteId,
            ristoranteNome: ristoranteNome,
            tempo: parseInt(tempo) || 15,
            quantita: 1
        });
    }
    
    localStorage.setItem('carrello', JSON.stringify(carrello));
    showToast(nome + ' aggiunto al carrello!', 'success');
}