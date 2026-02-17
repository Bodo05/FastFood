//appena la pagina html viene carucata vengono chiamate queste due funzioni
document.addEventListener('DOMContentLoaded', function() {
    aggiornaInterfacciaRicerca();
    controllaParametriUrl();
});

//funzione che permette di mostrare o noscondere i campi in base alla ricerca
function aggiornaInterfacciaRicerca() {
    const tipo = document.getElementById('tipoRicerca').value;
    const divTesto = document.getElementById('divInputTesto');
    const divPrezzo = document.getElementById('divInputPrezzo');
    const input = document.getElementById('inputRicerca');

    if (tipo === 'piatto_prezzo') {
        divTesto.style.display = 'none';
        divPrezzo.style.display = 'flex';
    } else {
        divTesto.style.display = 'block';
        divPrezzo.style.display = 'none';
        
        const placeholders = {
            rist_nome: "Es. Ristorante1...",
            rist_luogo: "Es. Milano...",
            rist_piatto: "Es. Pasta...",
            piatto_nome: "Es. Pasta...",
            piatto_tipo: "Es. Starter...",
            piatto_ingrediente: "Es. Butter...",
            piatto_allergie: "Es. Butter..."
        };
        input.placeholder = placeholders[tipo] || "Cerca...";
    }
}

//lettura parametru URL
function controllaParametriUrl() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const ristorante = params.get('ristorante');

    if (ristorante) {
        //se trova il nome del ristorante allora l'endpoint costruito sarà per
        //prendere tutti i piatti del ristorante per poi mostrarli
        document.getElementById('inputRicerca').value = ristorante;
        eseguiRicerca('rist_dettaglio');
    } else if (query) {
        document.getElementById('inputRicerca').value = query;
        eseguiRicerca();
    }
}

async function eseguiRicerca(tipoForzato = null) {
    //controllo che il cliente sia loggato
    if (checkLogin('cliente') === false) return;
    
    const tipo = tipoForzato || document.getElementById('tipoRicerca').value;
    const container = document.getElementById('containerRisultati');
    let endpoint = '';

    //se la tipologia di ricerca è  per prezzo prendo i valori min e max e costruisco l'endpoint
    if (tipo === 'piatto_prezzo') {
        const min = document.getElementById('minPrezzo').value || 0;
        const max = document.getElementById('maxPrezzo').value || 1000;
        endpoint = `/ricerca/piatto/prezzo?min=${min}&max=${max}`;
    } else {
        const query = document.getElementById('inputRicerca').value.trim();
        if (!query) {
            showToast("Inserisci qualcosa da cercare!", "warning");
            return;
        }

        switch (tipo) {
            case 'rist_dettaglio': endpoint = `/ricerca/ristorante/dettaglio?q=${query}`; break;
            case 'rist_nome': endpoint = `/ricerca/ristorante/nome?q=${query}`; break;
            case 'rist_luogo': endpoint = `/ricerca/ristorante/luogo?q=${query}`; break;
            case 'rist_piatto': endpoint = `/ricerca/ristorante/piatto?q=${query}`; break;
            case 'piatto_nome': endpoint = `/ricerca/piatto/nome?q=${query}`; break;
            case 'piatto_tipo': endpoint = `/ricerca/piatto/tipologia?q=${query}`; break;
            case 'piatto_ingrediente': endpoint = `/ricerca/piatto/ingrediente?q=${query}`; break;
            case 'piatto_allergie': endpoint = `/ricerca/piatto/allergie?q=${query}`; break;
            default: endpoint = `/ricerca/piatto/nome?q=${query}`; break;
        }
    }

    container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>';

    try {
        //chiamata al server e attesa di risposta, poi salvo il json in risposta
        const risposta = await fetch(API_URL + endpoint);
        
        if (!risposta.ok) throw new Error("Errore server");
        
        const risultati = await risposta.json();
        //chiamo funzione per modificare la grafica e mostrare i risultati
        mostraRisultati(risultati, tipo);
        
    } catch (errore) {
        console.error(errore);
        container.innerHTML = '<div class="alert alert-danger">Errore di connessione o nessun risultato.</div>';
    }
}

function mostraRisultati(risultati, tipo) {
    const container = document.getElementById('containerRisultati');
    container.innerHTML = '';
    
    //se non trovo nulla
    if (!risultati || risultati.length === 0) {
        container.innerHTML = '<div class="col-12 text-center"><div class="alert alert-warning">Nessun risultato trovato.</div></div>';
        return;
    }

    risultati.forEach(function(item) {
        //piatti menu è l'array ritornato da API dopo aver confrontato la collection
        //ristoratore con la collection piatti per trovare i piatti del ristorante
        if (item.piattiMenu && Array.isArray(item.piattiMenu)) {
            //se l'oggetto ritornato presenta un array di piatti (rist_dettaglio) allora
            //preparo una card con le info del ristorante prima di mostrare i piatti
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
                //per ogni piatto del ristorante creo la card
                item.piattiMenu.forEach(p => creaCardPiatto(p, container));
            }
        //se ho il tipo ristorante ma non i piatti allora creo le card dei ristoranti
        } else if (item.tipo === 'ristorante' || (item.nomeRistorante && item.prezzo === undefined)) {
            creaCardRistorante(item, container);
        //altrimenti creo le card dei piatti
        } else {
            creaCardPiatto(item, container);
        }
    });
}

function creaCardPiatto(piatto, container) {
    const immagine = piatto.thumb || piatto.strMealThumb || 'https://via.placeholder.com/300x200?text=No+Image';
    const nome = piatto.nome || piatto.strMeal || "Senza nome";
    const ristorante = piatto.ristoranteNome || 'Sconosciuto';
    const prezzo = parseFloat(piatto.prezzo || 0).toFixed(2); 
    const tempo = parseInt(piatto.tempo) || 15;
    let desc = piatto.ingredienti || piatto.strInstructions || "Nessuna descrizione";

    if (desc.length > 90) {
        desc = desc.substring(0, 90) + '...';
    }

    //creo la card con le varie info e il bottone che se schiacciato chiama funzione aggiungiCarrello 
    //passando le info
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

//funzione che crea la card con il bottone per vedere il menu
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