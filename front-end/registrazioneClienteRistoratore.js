let tipoUtente = 'cliente';
let catalogoCompleto = [];
let menuRistoratore = [];

// Funzione Helper per le Notifiche (Toast)
function showToast(message, type = 'danger') {
    const toastEl = document.getElementById('liveToast');
    const toastBody = document.getElementById('toastMessage');
    if(!toastEl) return alert(message); // Fallback se manca HTML
    
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    toastBody.innerText = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

window.onload = async function() {
    try {
        const resCat = await fetch('http://localhost:3000/categorie-catalogo');
        const categorie = await resCat.json();
        
        const selCliente = document.getElementById('prefCliente');
        const selFiltro = document.getElementById('filtroCatalogo');
        
        if(selCliente) selCliente.innerHTML = '<option value="">-- Seleziona --</option>';
        if(selFiltro) selFiltro.innerHTML = '<option value="">-- Seleziona --</option>';

        categorie.forEach(cat => {
            if(selCliente) selCliente.innerHTML += `<option value="${cat}">${cat}</option>`;
            if(selFiltro) selFiltro.innerHTML += `<option value="${cat}">${cat}</option>`;
        });

        const resMeals = await fetch('http://localhost:3000/catalog');
        catalogoCompleto = await resMeals.json();
    } catch (e) {
        console.error("Errore caricamento:", e);
        showToast("Errore connessione server", "danger");
    }
};

function cambiaTab(tipo) {
    tipoUtente = tipo;
    const btnC = document.getElementById('btnTabCliente');
    const btnR = document.getElementById('btnTabRistoratore');
    
    if (tipo === 'cliente') {
        btnC.classList.add('active', 'btn-primary'); btnC.classList.remove('btn-outline-primary');
        btnR.classList.remove('active', 'btn-primary'); btnR.classList.add('btn-outline-primary'); 
        document.getElementById('divCliente').style.display = 'block';
        document.getElementById('divRistoratore').style.display = 'none';
    } else {
        btnR.classList.add('active', 'btn-primary'); btnR.classList.remove('btn-outline-primary');
        btnC.classList.remove('active', 'btn-primary'); btnC.classList.add('btn-outline-primary');
        document.getElementById('divCliente').style.display = 'none';
        document.getElementById('divRistoratore').style.display = 'block';
    }
}

document.getElementById('filtroCatalogo')?.addEventListener('change', function() {
    const categoriaScelta = this.value;
    const div = document.getElementById('containerPiatti');
    div.innerHTML = ""; 

    if (!categoriaScelta) return;
    const piattiFiltrati = catalogoCompleto.filter(p => p.strCategory === categoriaScelta);

    if (piattiFiltrati.length === 0) {
        div.innerHTML = "<div class='col-12 text-center text-muted'>Nessun piatto trovato.</div>";
        return;
    }

    piattiFiltrati.forEach((p, index) => {
        const giaAggiunto = menuRistoratore.some(m => m.nome === p.strMeal);
        div.innerHTML += `
            <div class="col-md-4 col-lg-3">
                <div class="card h-100 shadow-sm border-0">
                    <img src="${p.strMealThumb}" class="card-img-top" style="height: 120px; object-fit: cover;">
                    <div class="card-body p-2 d-flex flex-column">
                        <h6 class="card-title text-truncate" title="${p.strMeal}">${p.strMeal}</h6>
                        <div class="mt-auto">
                            <input type="number" id="prezzo_${index}" class="form-control form-control-sm mb-1" placeholder="Prezzo €" min="0" step="0.50" ${giaAggiunto ? 'disabled' : ''}>
                            <input type="number" id="tempo_${index}" class="form-control form-control-sm mb-2" placeholder="Minuti" min="1" value="15" ${giaAggiunto ? 'disabled' : ''}>
                            <button onclick='aggiungiAlMenu(${index}, "${p.strMeal.replace(/"/g, '\\"')}", "${p.strCategory}", "${p.strMealThumb}")' 
                                    class="btn btn-sm w-100 ${giaAggiunto ? 'btn-secondary' : 'btn-outline-success'}" 
                                    id="btn_${index}" ${giaAggiunto ? 'disabled' : ''}>
                                ${giaAggiunto ? 'In Menu' : 'Aggiungi'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
    });
});

function aggiungiAlMenu(index, nome, cat, img) {
    const prezzo = document.getElementById(`prezzo_${index}`).value;
    const tempo = document.getElementById(`tempo_${index}`).value;

    if (!prezzo || !tempo) {
        showToast("Inserisci Prezzo e Tempo!", "warning");
        return;
    }

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
    
    menuRistoratore.push({
        nome: nome, categoria: cat, thumb: img,
        prezzo: parseFloat(prezzo), tempo: parseInt(tempo),
        ingredienti: listaIngredienti.join(', ')
    });

    const btn = document.getElementById(`btn_${index}`);
    btn.className = 'btn btn-sm w-100 btn-secondary';
    btn.innerText = 'In Menu';
    btn.disabled = true;
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
        html += `<span class="badge bg-primary me-1 mb-1 p-2">${p.nome} <span class="badge bg-white text-primary">€${p.prezzo}</span></span>`;
    });
    div.innerHTML = html;
}

async function registrati() {
    const btn = document.getElementById('btnRegistra');
    const testoOriginale = btn.innerText;
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const conf = document.getElementById('confPass').value;

    if (!email || !pass) { showToast("Compila i campi obbligatori", "warning"); return; }
    if (pass !== conf) { showToast("Le password non coincidono", "warning"); return; }

    btn.disabled = true;
    btn.innerText = "Registrazione...";
    
    function resetBtn() { btn.disabled = false; btn.innerText = testoOriginale; }

    let payload = { email: email, password: pass };
    let urlDestinazione = '';

    if (tipoUtente === 'cliente') {
        urlDestinazione = 'http://localhost:3000/cliente';
        const nome = document.getElementById('nome').value;
        const cognome = document.getElementById('cognome').value;
        const pref = document.getElementById('prefCliente').value;
        
        if(!nome) { showToast("Inserisci il nome", "warning"); resetBtn(); return; }
        payload.nome = nome; payload.cognome = cognome; payload.preferenze = [pref]; 
    } else {
        urlDestinazione = 'http://localhost:3000/ristoratore';
        const nomeRist = document.getElementById('nomeRist').value;
        const indirizzo = document.getElementById('indirizzo').value;
        const piva = document.getElementById('piva').value;
        const telefono = document.getElementById('telefono').value;

        if(!nomeRist || !indirizzo || !piva) { showToast("Compila dati ristorante", "warning"); resetBtn(); return; }
        if(menuRistoratore.length === 0) { showToast("Aggiungi almeno un piatto!", "warning"); resetBtn(); return; }

        payload.nomeRistorante = nomeRist; payload.indirizzo = indirizzo;
        payload.piva = piva; payload.telefono = telefono; payload.piatti = menuRistoratore;
    }

    try {
        const res = await fetch(urlDestinazione, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
            showToast("Registrazione OK! Reindirizzamento...", "success");
            setTimeout(() => window.location.href = 'login.html', 1500);
        } else {
            showToast(data.message || "Errore server", "danger");
            resetBtn(); 
        }
    } catch (e) {
        showToast("Errore di connessione", "danger");
        resetBtn(); 
    }
}