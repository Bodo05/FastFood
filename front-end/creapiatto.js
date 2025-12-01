const rId = localStorage.getItem('_id');
if (!rId || localStorage.getItem('userType') !== 'ristoratore') {
    window.location.href = 'login.html';
}

let ingredienti = [];
let catalogoGlobal = []; 
let piattoInModificaId = null;

document.addEventListener('DOMContentLoaded', async () => {
    aggiornaListaIngredienti();
    
    const urlParams = new URLSearchParams(window.location.search);
    const pId = urlParams.get('piattoId');

    if (pId) {
        piattoInModificaId = pId;
        await caricaPiattoEsistente(pId);
        document.getElementById('catalogoImport').style.display = 'none';
    } else {
        await caricaCatalogo();
    }
    
    document.getElementById('ingrediente').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); aggiungiIngrediente(); }
    });
});

// --- CARICAMENTO DATI PER LA MODIFICA ---
async function caricaPiattoEsistente(pId) {
    try {
        const res = await fetch(`http://localhost:3000/ristoratore/${rId}/piatti`);
        const piatti = await res.json();
        const piatto = piatti.find(p => p._id === pId);

        if (!piatto) throw new Error('Piatto non trovato nel menu.');

        // Aggiorna la UI per la modalità Modifica
        document.getElementById('formTitle').innerText = `Modifica: ${piatto.nome}`;
        document.getElementById('titlePage').innerText = `Modifica Piatto`;
        document.getElementById('btnSalva').innerText = `💾 Salva Modifiche`;
        document.getElementById('btnSalva').classList.remove('btn-success');
        document.getElementById('btnSalva').classList.add('btn-warning', 'text-dark');
        
        // Pre-compila i campi
        document.getElementById('nome').value = piatto.nome;
        document.getElementById('prezzo').value = piatto.prezzo;
        document.getElementById('tempo').value = piatto.tempo;
        document.getElementById('categoria').value = piatto.categoria;
        document.getElementById('foto').value = piatto.thumb;
        aggiornaPreview();

        // Popola ingredienti
        if (piatto.ingredienti) {
            ingredienti = piatto.ingredienti.split(',').map(s => s.trim()).filter(s => s);
        } else if (piatto.ingredients && Array.isArray(piatto.ingredients)) {
             ingredienti = piatto.ingredients;
        }

        aggiornaListaIngredienti();

    } catch (err) {
        mostraToast('Errore nel caricamento del piatto', 'error');
    }
}


// --- LOGICA DI CREAZIONE (Catalogo) ---
async function caricaCatalogo() {
    try {
        const res = await fetch('http://localhost:3000/catalog');
        if(!res.ok) throw new Error('Errore catalogo');
        
        catalogoGlobal = await res.json();
        
        const select = document.getElementById('selectCatalogo');
        catalogoGlobal.sort((a,b) => (a.strMeal || '').localeCompare(b.strMeal || ''));
        
        catalogoGlobal.forEach((piatto, index) => {
            const option = document.createElement('option');
            option.value = index; 
            option.text = piatto.strMeal;
            select.appendChild(option);
        });
    } catch (err) {
        console.error(err);
    }
}

function selezionaDaCatalogo() {
    const index = document.getElementById('selectCatalogo').value;
    if (index === "") return;

    const p = catalogoGlobal[index];
    
    document.getElementById('nome').value = p.strMeal;
    document.getElementById('categoria').value = p.strCategory;
    document.getElementById('foto').value = p.strMealThumb;
    document.getElementById('previewImg').src = p.strMealThumb;
    
    ingredienti = [];
    if(p.ingredients && Array.isArray(p.ingredients)) {
        ingredienti = [...p.ingredients];
    } else {
        for(let i=1; i<=20; i++) {
            const ing = p[`strIngredient${i}`];
            if(ing && ing.trim()) ingredienti.push(ing);
        }
    }
    aggiornaListaIngredienti();
    document.getElementById('prezzo').focus();
}

function aggiornaPreview() {
    const url = document.getElementById('foto').value;
    document.getElementById('previewImg').src = url || 'https://via.placeholder.com/150';
}

function aggiungiIngrediente() {
    const input = document.getElementById('ingrediente');
    const val = input.value.trim();
    if (val && !ingredienti.includes(val)) {
        ingredienti.push(val);
        aggiornaListaIngredienti();
        input.value = '';
    }
}

function aggiornaListaIngredienti() {
    const div = document.getElementById('listaIngredienti');
    if (ingredienti.length === 0) {
        div.innerHTML = '<small class="text-muted">Nessun ingrediente.</small>';
        return;
    }
    div.innerHTML = ingredienti.map((ing, i) => 
        `<span class="badge bg-secondary me-1 mb-1">${ing} <span style="cursor:pointer" onclick="rimuoviIng(${i})">&times;</span></span>`
    ).join('');
}

function rimuoviIng(i) {
    ingredienti.splice(i, 1);
    aggiornaListaIngredienti();
}

// --- SALVATAGGIO FINALE (GESTIONE PUT vs POST) ---
async function salvaPiatto() {
    const nome = document.getElementById('nome').value;
    const prezzo = parseFloat(document.getElementById('prezzo').value);
    const tempo = parseInt(document.getElementById('tempo').value);
    const categoria = document.getElementById('categoria').value;
    const foto = document.getElementById('foto').value;
    const btn = document.getElementById('btnSalva');
    
    if (!nome || !prezzo || !categoria) {
        mostraToast('Compila almeno Nome, Prezzo e Categoria', 'error');
        return;
    }
    
    btn.disabled = true;

    const piattoPayload = {
        nome, prezzo, tempo, categoria,
        ingredienti: ingredienti.join(', '), 
        thumb: foto || 'https://via.placeholder.com/150'
    };

    let url;
    let method;
    
    if (piattoInModificaId) {
        // MODALITA' EDITING: Usa PUT
        url = `http://localhost:3000/ristoratore/${rId}/piatti/${piattoInModificaId}`;
        method = 'PUT';
    } else {
        // MODALITA' CREAZIONE: Usa POST
        url = `http://localhost:3000/ristoratore/${rId}/piatti`;
        method = 'POST';
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ piatto: piattoPayload })
        });

        if (res.ok) {
            mostraToast(`Piatto ${method === 'PUT' ? 'modificato' : 'aggiunto'} con successo!`, 'success');
            setTimeout(() => window.location.href = 'ristoratore.html', 1000);
        } else {
            const data = await res.json();
            mostraToast(`Errore nel salvataggio: ${data.message || res.status}`, 'error');
        }
    } catch (err) {
        mostraToast('Errore di connessione', 'error');
    } finally {
        btn.disabled = false;
    }
}

function mostraToast(msg, type) {
    const tBody = document.getElementById('toastBody');
    tBody.textContent = msg;
    tBody.className = type === 'success' ? 'toast-body bg-success text-white' : 'toast-body bg-danger text-white';
    new bootstrap.Toast(document.getElementById('messaggioToast')).show();
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}