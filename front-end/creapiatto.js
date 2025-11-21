const rId = localStorage.getItem('_id');
if (!rId || localStorage.getItem('userType') !== 'ristoratore') {
    window.location.href = 'login.html';
}

let ingredienti = [];
let catalogoGlobal = []; // Per salvare i dati scaricati

document.addEventListener('DOMContentLoaded', async () => {
    await caricaCatalogo();
    aggiornaListaIngredienti();
    
    // Listener Enter su ingrediente
    document.getElementById('ingrediente').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); aggiungiIngrediente(); }
    });
});

// 1. Carica il JSON dal server (rotta /catalog)
async function caricaCatalogo() {
    try {
        const res = await fetch('http://localhost:3000/catalog');
        if(!res.ok) throw new Error('Errore catalogo');
        
        catalogoGlobal = await res.json();
        
        const select = document.getElementById('selectCatalogo');
        // Ordina alfabeticamente
        catalogoGlobal.sort((a,b) => a.strMeal.localeCompare(b.strMeal));
        
        catalogoGlobal.forEach((piatto, index) => {
            const option = document.createElement('option');
            option.value = index; // Usiamo l'indice dell'array
            option.text = piatto.strMeal;
            select.appendChild(option);
        });
    } catch (err) {
        console.error(err);
    }
}

// 2. Quando l'utente seleziona dalla tendina
function selezionaDaCatalogo() {
    const index = document.getElementById('selectCatalogo').value;
    if (index === "") return;

    const p = catalogoGlobal[index];

    // Compila i campi
    document.getElementById('nome').value = p.strMeal;
    document.getElementById('categoria').value = p.strCategory;
    document.getElementById('foto').value = p.strMealThumb;
    document.getElementById('previewImg').src = p.strMealThumb;
    
    // Gestione Ingredienti (dal JSON possono essere sparsi)
    ingredienti = [];
    // Prova a prendere ingredienti se sono in array 'ingredients' o campi singoli strIngredient
    if(p.ingredients && Array.isArray(p.ingredients)) {
        ingredienti = [...p.ingredients];
    } else {
        // Fallback per la struttura standard di TheMealDB
        for(let i=1; i<=20; i++) {
            const ing = p[`strIngredient${i}`];
            if(ing && ing.trim()) ingredienti.push(ing);
        }
    }
    aggiornaListaIngredienti();
    
    // Focus sul prezzo (l'unico dato che manca sempre)
    document.getElementById('prezzo').focus();
}

function aggiornaPreview() {
    const url = document.getElementById('foto').value;
    document.getElementById('previewImg').src = url || 'https://via.placeholder.com/150';
}

// --- Gestione Ingredienti ---
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

// --- SALVATAGGIO FINALE ---
async function salvaPiatto() {
    const nome = document.getElementById('nome').value;
    const prezzo = parseFloat(document.getElementById('prezzo').value);
    const tempo = parseInt(document.getElementById('tempo').value);
    const categoria = document.getElementById('categoria').value;
    const foto = document.getElementById('foto').value;

    if (!nome || !prezzo || !categoria) {
        alert('Compila almeno Nome, Prezzo e Categoria');
        return;
    }

    const nuovoPiatto = {
        nome,
        prezzo,
        tempo,
        categoria,
        ingredienti: ingredienti.join(', '),
        thumb: foto || 'https://via.placeholder.com/150'
    };

    try {
        const res = await fetch(`http://localhost:3000/ristoratore/${rId}/piatti`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ piatto: nuovoPiatto })
        });

        if (res.ok) {
            mostraToast('Piatto aggiunto al Menu!', 'success');
            setTimeout(() => window.location.href = 'ristoratore.html', 1000);
        } else {
            mostraToast('Errore nel salvataggio', 'error');
        }
    } catch (err) {
        console.error(err);
        mostraToast('Errore connessione', 'error');
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