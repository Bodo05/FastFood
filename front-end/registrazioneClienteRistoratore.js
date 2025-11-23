// Variabili globali
let tipoUtente = 'cliente'; // Default
let catalogoCompleto = [];  // Tutti i piatti dal DB
let menuRistoratore = [];   // I piatti scelti dal ristoratore

// 1. Al caricamento della pagina
window.onload = async function() {
    console.log("Pagina caricata. Scarico i dati...");
    
    try {
        // Scarico Categorie
        const resCat = await fetch('http://localhost:3000/categorie-catalogo');
        const categorie = await resCat.json();
        
        // Riempio le tendine
        const selCliente = document.getElementById('prefCliente');
        const selFiltro = document.getElementById('filtroCatalogo');
        
        selCliente.innerHTML = '<option value="">-- Seleziona --</option>';
        selFiltro.innerHTML = '<option value="">-- Seleziona --</option>';

        categorie.forEach(cat => {
            // Per il cliente
            selCliente.innerHTML += `<option value="${cat}">${cat}</option>`;
            // Per il filtro ristoratore
            selFiltro.innerHTML += `<option value="${cat}">${cat}</option>`;
        });

        // Scarico il Catalogo Piatti (per il ristoratore)
        const resMeals = await fetch('http://localhost:3000/catalog');
        catalogoCompleto = await resMeals.json();
        console.log(`Catalogo scaricato: ${catalogoCompleto.length} piatti.`);

    } catch (e) {
        console.error("Errore caricamento:", e);
        alert("Errore di connessione al server. Assicurati che 'node index.js' sia attivo.");
    }
};

// 2. Gestione cambio Tab (Cliente <-> Ristoratore)
function cambiaTab(tipo) {
    tipoUtente = tipo;
    
    // Gestione stile bottoni
    document.getElementById('btnTabCliente').className = tipo === 'cliente' ? 'tab-btn active-tab' : 'tab-btn';
    document.getElementById('btnTabRistoratore').className = tipo === 'ristoratore' ? 'tab-btn active-tab' : 'tab-btn';

    // Gestione visibilità campi
    document.getElementById('divCliente').style.display = tipo === 'cliente' ? 'block' : 'none';
    document.getElementById('divRistoratore').style.display = tipo === 'ristoratore' ? 'block' : 'none';
}

// 3. Quando il ristoratore cambia categoria nel filtro
document.getElementById('filtroCatalogo').addEventListener('change', function() {
    const categoriaScelta = this.value;
    const div = document.getElementById('containerPiatti');
    div.innerHTML = ""; // Pulisco

    if (!categoriaScelta) return;

    // Filtro i piatti dal catalogo in memoria
    const piattiFiltrati = catalogoCompleto.filter(p => p.strCategory === categoriaScelta);

    if (piattiFiltrati.length === 0) {
        div.innerHTML = "<p class='text-center text-muted'>Nessun piatto trovato.</p>";
        return;
    }

    // Disegno le card
    piattiFiltrati.forEach((p, index) => {
        // Controllo se è già stato aggiunto
        const giaAggiunto = menuRistoratore.some(m => m.nome === p.strMeal);
        
        div.innerHTML += `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm">
                    <img src="${p.strMealThumb}" class="card-img-top">
                    <div class="card-body p-2">
                        <h6 class="text-truncate" title="${p.strMeal}">${p.strMeal}</h6>
                        
                        <input type="number" id="prezzo_${index}" class="form-control form-control-sm mb-1" placeholder="Prezzo €" min="0" step="0.50" ${giaAggiunto ? 'disabled' : ''}>
                        <input type="number" id="tempo_${index}" class="form-control form-control-sm mb-1" placeholder="Minuti" min="1" ${giaAggiunto ? 'disabled' : ''}>
                        
                        <button onclick='aggiungiAlMenu(${index}, "${p.strMeal}", "${p.strCategory}", "${p.strMealThumb}")' 
                                class="btn btn-sm w-100 ${giaAggiunto ? 'btn-secondary' : 'btn-success'}" 
                                id="btn_${index}"
                                ${giaAggiunto ? 'disabled' : ''}>
                            ${giaAggiunto ? 'Già aggiunto' : 'Aggiungi'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
});

// 4. Aggiungi un piatto alla lista temporanea del ristoratore
function aggiungiAlMenu(index, nome, cat, img) {
    const prezzo = document.getElementById(`prezzo_${index}`).value;
    const tempo = document.getElementById(`tempo_${index}`).value;

    if (!prezzo || !tempo) {
        alert("Inserisci Prezzo e Tempo di preparazione!");
        return;
    }

    // Aggiungo all'array globale
    menuRistoratore.push({
        nome: nome,
        categoria: cat,
        thumb: img,
        prezzo: parseFloat(prezzo),
        tempo: parseInt(tempo),
        ingredienti: "Ingredienti standard" // Semplificazione, potresti prenderli dal catalogo
    });

    // Aggiorno UI
    document.getElementById(`btn_${index}`).className = 'btn btn-sm w-100 btn-secondary';
    document.getElementById(`btn_${index}`).innerText = 'Aggiunto';
    document.getElementById(`btn_${index}`).disabled = true;
    document.getElementById(`prezzo_${index}`).disabled = true;
    document.getElementById(`tempo_${index}`).disabled = true;

    aggiornaRiepilogo();
}

function aggiornaRiepilogo() {
    const div = document.getElementById('menuScelto');
    if (menuRistoratore.length === 0) {
        div.innerHTML = '<small class="text-muted">Nessun piatto aggiunto.</small>';
        return;
    }
    
    let html = '';
    menuRistoratore.forEach(p => {
        html += `<span class="badge bg-primary me-1 mb-1">${p.nome} (€${p.prezzo})</span>`;
    });
    div.innerHTML = html;
}

// 5. FUNZIONE PRINCIPALE DI REGISTRAZIONE
async function registrati() {
    // Dati comuni
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const conf = document.getElementById('confPass').value;

    if (!email || !pass) { alert("Email e Password obbligatorie"); return; }
    if (pass !== conf) { alert("Le password non coincidono"); return; }

    let payload = { email: email, password: pass };
    let urlDestinazione = '';

    if (tipoUtente === 'cliente') {
        urlDestinazione = 'http://localhost:3000/cliente';
        const nome = document.getElementById('nome').value;
        const pref = document.getElementById('prefCliente').value;
        
        if(!nome) { alert("Inserisci il nome"); return; }
        
        payload.nome = nome;
        payload.cognome = document.getElementById('cognome').value;
        payload.preferenze = [pref]; // Il server si aspetta un array
    } 
    else {
        urlDestinazione = 'http://localhost:3000/ristoratore';
        const nomeRist = document.getElementById('nomeRist').value;
        const indirizzo = document.getElementById('indirizzo').value;
        const piva = document.getElementById('piva').value;
        const telefono = document.getElementById('telefono').value;

        if(!nomeRist || !indirizzo || !piva) { alert("Compila tutti i dati del ristorante"); return; }
        if(menuRistoratore.length === 0) { alert("Devi aggiungere almeno un piatto al menu!"); return; }

        payload.nomeRistorante = nomeRist;
        payload.indirizzo = indirizzo;
        payload.piva = piva;
        payload.telefono = telefono;
        payload.piatti = menuRistoratore;
    }

    // Invio al server
    try {
        const res = await fetch(urlDestinazione, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            alert("Registrazione avvenuta con successo! Ora puoi accedere.");
            window.location.href = 'login.html';
        } else {
            alert("Errore: " + (data.message || "Impossibile registrare"));
        }
    } catch (e) {
        console.error(e);
        alert("Errore di connessione al server.");
    }
}