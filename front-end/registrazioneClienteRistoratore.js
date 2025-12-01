// Variabili globali
let tipoUtente = 'cliente'; // Default
let catalogoCompleto = [];  // Tutti i piatti dal DB
let menuRistoratore = [];   // I piatti scelti dal ristoratore

// 1. Al caricamento della pagina
window.onload = async function() {
    
    try {
        // Scarico Categorie
        const resCat = await fetch('http://localhost:3000/categorie-catalogo');
        const categorie = await resCat.json();
        
        const selCliente = document.getElementById('prefCliente');
        const selFiltro = document.getElementById('filtroCatalogo');
        
        selCliente.innerHTML = '<option value="">-- Seleziona --</option>';
        selFiltro.innerHTML = '<option value="">-- Seleziona --</option>';

        categorie.forEach(cat => {
            selCliente.innerHTML += `<option value="${cat}">${cat}</option>`;
            selFiltro.innerHTML += `<option value="${cat}">${cat}</option>`;
        });

        // Scarico il Catalogo Piatti (per il ristoratore)
        const resMeals = await fetch('http://localhost:3000/catalog');
        catalogoCompleto = await resMeals.json();

    } catch (e) {
        console.error("Errore caricamento:", e);
        // Alert rimosso per pulizia, ma l'errore è loggato
    }
};

// 2. Gestione cambio Tab (Cliente <-> Ristoratore)
function cambiaTab(tipo) {
    tipoUtente = tipo;
    
    document.getElementById('btnTabCliente').classList.toggle('active-tab', tipo === 'cliente');
    document.getElementById('btnTabRistoratore').classList.toggle('active-tab', tipo === 'ristoratore');

    document.getElementById('divCliente').style.display = tipo === 'cliente' ? 'block' : 'none';
    document.getElementById('divRistoratore').style.display = tipo === 'ristoratore' ? 'block' : 'none';
}

// 3. Quando il ristoratore cambia categoria nel filtro
document.getElementById('filtroCatalogo')?.addEventListener('change', function() {
    const categoriaScelta = this.value;
    const div = document.getElementById('containerPiatti');
    div.innerHTML = ""; 

    if (!categoriaScelta) return;

    const piattiFiltrati = catalogoCompleto.filter(p => p.strCategory === categoriaScelta);

    if (piattiFiltrati.length === 0) {
        div.innerHTML = "<p class='text-center text-muted'>Nessun piatto trovato.</p>";
        return;
    }

    piattiFiltrati.forEach((p, index) => {
        const giaAggiunto = menuRistoratore.some(m => m.nome === p.strMeal);
        
        div.innerHTML += `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm">
                    <img src="${p.strMealThumb}" class="card-img-top">
                    <div class="card-body p-2">
                        <h6 class="text-truncate" title="${p.strMeal}">${p.strMeal}</h6>
                        
                        <input type="number" id="prezzo_${index}" class="form-control form-control-sm mb-1" placeholder="Prezzo €" min="0" step="0.50" ${giaAggiunto ? 'disabled' : ''}>
                        <input type="number" id="tempo_${index}" class="form-control form-control-sm mb-1" placeholder="Minuti" min="1" ${giaAggiunto ? 'disabled' : ''}>
                        
                        <button onclick='aggiungiAlMenu(${index}, "${p.strMeal.replace(/"/g, '\\"')}", "${p.strCategory}", "${p.strMealThumb}")' 
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

    // --- RECUPERO INGREDIENTI VERI DAL CATALOGO ---
    const piattoOriginale = catalogoCompleto.find(p => p.strMeal === nome) || {}; 
    let listaIngredienti = [];

    if (piattoOriginale.ingredients && Array.isArray(piattoOriginale.ingredients)) {
        listaIngredienti = piattoOriginale.ingredients;
    } else {
        for(let i=1; i<=20; i++) {
            const ing = piattoOriginale[`strIngredient${i}`];
            if(ing && ing.trim()) listaIngredienti.push(ing);
        }
    }
    
    const stringaIngredienti = listaIngredienti.join(', ');
    // ----------------------------------------------

    // Aggiungo all'array globale
    menuRistoratore.push({
        nome: nome,
        categoria: cat,
        thumb: img,
        prezzo: parseFloat(prezzo),
        tempo: parseInt(tempo),
        ingredienti: stringaIngredienti // Salva gli ingredienti veri
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

// 5. FUNZIONE PRINCIPALE DI REGISTRAZIONE (CON PROTEZIONE DA DOPPIO CLICK)
async function registrati() {
    const btn = document.querySelector('button[onclick="registrati()"]');
    const testoOriginale = btn.innerText;

    // Dati comuni
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const conf = document.getElementById('confPass').value;

    if (!email || !pass) { alert("Email e Password obbligatorie"); return; }
    if (pass !== conf) { alert("Le password non coincidono"); return; }

    // --- BLOCCO DOPPIO CLICK ---
    btn.disabled = true;
    btn.innerText = "Registrazione in corso...";
    // --------------------------
    
    function resetBtn() {
        btn.disabled = false;
        btn.innerText = testoOriginale;
    }

    let payload = { email: email, password: pass };
    let urlDestinazione = '';

    if (tipoUtente === 'cliente') {
        urlDestinazione = 'http://localhost:3000/cliente';
        const nome = document.getElementById('nome').value;
        const cognome = document.getElementById('cognome').value;
        const pref = document.getElementById('prefCliente').value;
        
        if(!nome) { alert("Inserisci il nome"); resetBtn(); return; }
        
        payload.nome = nome;
        payload.cognome = cognome;
        payload.preferenze = [pref]; 
    } 
    else {
        urlDestinazione = 'http://localhost:3000/ristoratore';
        const nomeRist = document.getElementById('nomeRist').value;
        const indirizzo = document.getElementById('indirizzo').value;
        const piva = document.getElementById('piva').value;
        const telefono = document.getElementById('telefono').value;

        if(!nomeRist || !indirizzo || !piva) { alert("Compila tutti i dati del ristorante"); resetBtn(); return; }
        if(menuRistoratore.length === 0) { alert("Devi aggiungere almeno un piatto al menu!"); resetBtn(); return; }

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
            resetBtn(); // Riabilita se il server dà errore
        }
    } catch (e) {
        console.error(e);
        alert("Errore di connessione al server.");
        resetBtn(); // Riabilita se cade la connessione
    }
}