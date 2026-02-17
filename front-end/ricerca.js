//appena carico pagina controllo se ci sono parametri nell'indirizzo
document.addEventListener('DOMContentLoaded', function() {
    aggiornaInterfacciaRicerca();
    controllaParametriUrl();
});

function aggiornaInterfacciaRicerca() {
    const tipo = document.getElementById('tipoRicerca').value;
    const divTesto = document.getElementById('divInputTesto');
    const divPrezzo = document.getElementById('divInputPrezzo');
    const input = document.getElementById('inputRicerca');

    //gestione visibilità campi
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
        //cambio la scritta di esempio quando cambio tipolgia ricerca
        input.placeholder = placeholders[tipo] || "Cerca...";
    }
}

function controllaParametriUrl() {
    //legge url,riempie barra di ricerca e avvia
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const ristorante = params.get('ristorante');

    if (ristorante) {
        document.getElementById('inputRicerca').value = ristorante;
        //imposto manualmente il tipo per la ricerca ristorante da url
        const select = document.getElementById('tipoRicerca');
        //cerco se esiste l'opzione specifica, altrimenti default
        if(select.querySelector('option[value="rist_nome"]')) {
             select.value = 'rist_nome';
        }
        aggiornaInterfacciaRicerca();
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
    const container = document.getElementById('containerRisultati');
    let endpoint = '';

    //logica prezzo
    if (tipo === 'piatto_prezzo') {
        const min = document.getElementById('minPrezzo').value || 0;
        const max = document.getElementById('maxPrezzo').value || 1000;
        endpoint = `/ricerca/prezzo?min=${min}&max=${max}`;
    } 
    //logica testuale
    else {
        const query = document.getElementById('inputRicerca').value.trim();
        if (!query) {
            showToast("Inserisci qualcosa da cercare!", "warning");
            return;
        }

        //costruisco endpoint in base al tipo di ricerca
        switch (tipo) {
            case 'rist_nome': endpoint = `/ricerca/ristorante/nome?q=${query}`; break;
            case 'rist_luogo': endpoint = `/ricerca/ristorante/luogo?q=${query}`; break;
            case 'rist_piatto': endpoint = `/ricerca/ristorante/piatto?q=${query}`; break;
            
            case 'piatto_nome': endpoint = `/ricerca/piatto/nome?q=${query}`; break;
            case 'piatto_tipo': endpoint = `/ricerca/piatto/tipologia?q=${query}`; break;
            case 'piatto_ingrediente': endpoint = `/ricerca/piatto/ingrediente?q=${query}`; break;
            case 'piatto_allergie': endpoint = `/ricerca/piatto/allergie?q=${query}`; break;
        }
    }

    container.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>';

    try {
        //chiamo api e salvo in risposta
        const risposta = await fetch(API_URL + endpoint);
        
        if (!risposta.ok) throw new Error("Errore server");
        
        const risultati = await risposta.json();
        mostraRisultati(risultati, tipo);
        
    } catch (errore) {
        console.error(errore);
        container.innerHTML = '<div class="alert alert-danger">Errore di connessione o nessun risultato.</div>';
    }
}

//la funzione mi permette di mostrare in modo differenze,  se cerco per chi fa questo piatto
//ho il ristorante cin ka lista dei piatti, se cerco per citta mostro i ristoranti e 
//posso vedere il menu tramite un bottone, altrimenti se per ingrediente mostro
//i singoli piatti
function mostraRisultati(risultati, tipo) {
    const container = document.getElementById('containerRisultati');
    container.innerHTML = '';
    
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
        // 2. Ristorante Semplice (se l'oggetto ha nomeRistorante ma non è un piatto con prezzo)
        else if (item.tipo === 'ristorante' || (item.nomeRistorante && item.prezzo === undefined)) {
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
    const tempo = parseInt(piatto.tempo) || 15;
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
    
    //check ordinazione da un solo ristorante
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