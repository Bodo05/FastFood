/**
 * GESTIONE PIATTO (CREAZIONE E MODIFICA)
 */

const API_URL = 'http://localhost:3000';
const rId = localStorage.getItem('_id'); 
const urlParams = new URLSearchParams(window.location.search);
const piattoId = urlParams.get('piattoId');

// Array locale per gestire gli ingredienti prima del salvataggio
let ingredientiTemp = [];

// Funzione Notifiche (riutilizziamo quella globale se c'è, altrimenti alert)
function notifica(msg, tipo='success') {
    if(typeof showToast === 'function') showToast(msg, tipo);
    else alert(msg);
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Sicurezza
    if (!rId || localStorage.getItem('userType') !== 'ristoratore') {
        window.location.href = 'login.html';
        return;
    }

    // 2. Gestione Modalità (Modifica o Creazione)
    if (piattoId) {
        document.getElementById('formTitle').innerText = "Modifica Piatto";
        document.getElementById('btnSalva').innerText = "Salva Modifiche";
        await caricaDatiPiatto(piattoId);
    }

    // 3. Gestione Anteprima Immagine
    document.getElementById('foto').addEventListener('input', aggiornaPreview);
});

// Funzione per caricare i dati in fase di modifica
async function caricaDatiPiatto(pId) {
    try {
        // Poiché non esiste una rotta GET /piatti/:id pubblica singola, 
        // prendiamo tutti i piatti del ristoratore e filtriamo.
        const res = await fetch(`${API_URL}/ristoratore/${rId}/piatti`);
        const menu = await res.json();
        const p = menu.find(item => item._id === pId);

        if (p) {
            document.getElementById('nome').value = p.nome || p.strMeal || '';
            document.getElementById('prezzo').value = p.prezzo || '';
            document.getElementById('categoria').value = p.categoria || p.strCategory || '';
            document.getElementById('foto').value = p.thumb || p.strMealThumb || '';
            document.getElementById('tempo').value = p.tempo || '15';
            
            // Gestione Ingredienti
            // Il backend potrebbe averli salvati come stringa o array, gestiamo entrambi
            if(p.ingredienti) {
                if(Array.isArray(p.ingredienti)) ingredientiTemp = p.ingredienti;
                else ingredientiTemp = p.ingredienti.split(',').map(s => s.trim());
            } else if (p.ingredients) {
                 ingredientiTemp = p.ingredients;
            }
            
            renderIngredienti();
            aggiornaPreview();
        } else {
            notifica("Piatto non trovato.", "danger");
            setTimeout(() => window.location.href = 'ristoratore.html', 1500);
        }
    } catch (err) {
        console.error(err);
        notifica("Errore caricamento dati.", "danger");
    }
}

// Funzione per aggiornare l'immagine di anteprima
function aggiornaPreview() {
    const url = document.getElementById('foto').value;
    const img = document.getElementById('previewImg');
    if (url) {
        img.src = url;
        img.onerror = () => { img.src = 'https://via.placeholder.com/150?text=Err+Img'; };
    } else {
        img.src = 'https://via.placeholder.com/150';
    }
}

// Funzione chiamata dal pulsante "+" dell'HTML
function aggiungiIngrediente() {
    const input = document.getElementById('ingrediente');
    const val = input.value.trim();
    if (val) {
        ingredientiTemp.push(val);
        input.value = '';
        renderIngredienti();
    }
}

// Renderizza la lista visuale degli ingredienti
function renderIngredienti() {
    const div = document.getElementById('listaIngredienti');
    if (ingredientiTemp.length === 0) {
        div.innerHTML = '<small class="text-muted">Nessun ingrediente.</small>';
        return;
    }
    
    div.innerHTML = '';
    ingredientiTemp.forEach((ing, index) => {
        const span = document.createElement('span');
        span.className = 'badge bg-secondary me-1 mb-1';
        span.innerHTML = `${ing} <i class="bi bi-x-circle" style="cursor:pointer; margin-left:5px;" onclick="rimuoviIngrediente(${index})">x</i>`;
        // Nota: onclick inline richiede che rimuoviIngrediente sia globale
        span.querySelector('i').onclick = () => rimuoviIngrediente(index);
        div.appendChild(span);
    });
}

function rimuoviIngrediente(index) {
    ingredientiTemp.splice(index, 1);
    renderIngredienti();
}

// Funzione chiamata dal pulsante "Seleziona" del catalogo comune
function selezionaDaCatalogo() {
    // Questa funzione richiede che l'HTML del catalogo sia popolato.
    // Se non implementata, la lasciamo vuota o la completiamo se serve.
    // (Nel tuo codice HTML c'era una select, ma mancava la logica di popolamento qui).
}

// --- FUNZIONE PRINCIPALE DI SALVATAGGIO ---
async function salvaPiatto() {
    const nome = document.getElementById('nome').value.trim();
    const prezzo = parseFloat(document.getElementById('prezzo').value);
    const tempo = document.getElementById('tempo').value;
    const categoria = document.getElementById('categoria').value.trim();
    const thumb = document.getElementById('foto').value.trim();

    // 1. Validazioni
    if (!nome) return notifica("Inserisci il nome del piatto", "warning");
    if (isNaN(prezzo) || prezzo <= 0) return notifica("Prezzo non valido", "warning");
    if (!categoria) return notifica("Inserisci una categoria", "warning");

    // 2. Preparazione Payload
    // Il backend si aspetta { piatto: { ... } }
    const datiPiatto = {
        nome: nome,
        prezzo: prezzo,
        categoria: categoria,
        thumb: thumb,
        tempo: tempo,
        descrizione: document.getElementById('descrizione')?.value || "", // se presente
        ingredienti: ingredientiTemp.join(', '), // Salviamo come stringa per semplicità nel DB
        // Campi compatibilità catalogo
        strMeal: nome,
        strCategory: categoria,
        strMealThumb: thumb
    };

    let url = `${API_URL}/ristoratore/${rId}/piatti`;
    let method = 'POST';

    if (piattoId) {
        url = `${API_URL}/ristoratore/${rId}/piatti/${piattoId}`;
        method = 'PUT';
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ piatto: datiPiatto })
        });

        if (res.ok) {
            notifica(piattoId ? "Piatto aggiornato!" : "Piatto creato!", "success");
            setTimeout(() => window.location.href = 'ristoratore.html', 1500);
        } else {
            const err = await res.json();
            notifica("Errore: " + (err.message || "Salvataggio fallito"), "danger");
        }
    } catch (err) {
        console.error(err);
        notifica("Errore di connessione.", "danger");
    }
}