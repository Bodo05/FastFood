/**
 * GESTIONE PIATTO (CREAZIONE E MODIFICA)
 */

const API_URL = 'http://localhost:3000';
const rId = localStorage.getItem('_id'); 

// Recupera parametri URL
const urlParams = new URLSearchParams(window.location.search);
const piattoId = urlParams.get('piattoId');

document.addEventListener('DOMContentLoaded', async () => {
    // Sicurezza
    if (!rId || localStorage.getItem('userType') !== 'ristoratore') {
        window.location.href = 'login.html';
        return;
    }

    // Modalità MODIFICA
    if (piattoId) {
        document.getElementById('formTitle').innerText = "Modifica Piatto";
        document.getElementById('btnSubmit').innerText = "Salva Modifiche";
        // L'API per ottenere il singolo piatto non esiste specifica nel backend fornito
        // quindi dobbiamo cercare tra i piatti del ristoratore quello giusto
        await caricaDatiPiatto(piattoId);
    }
});

async function caricaDatiPiatto(pId) {
    try {
        // Usiamo l'endpoint che restituisce TUTTI i piatti del ristoratore e filtriamo in JS
        // (Perché nel tuo index.js non c'è una rotta GET /piatti/:id singola pubblica o privata facile)
        const res = await fetch(`${API_URL}/ristoratore/${rId}/piatti`);
        if (!res.ok) throw new Error("Errore recupero piatti");
        
        const menu = await res.json();
        const p = menu.find(item => item._id === pId);

        if (p) {
            document.getElementById('nome').value = p.nome || p.strMeal || '';
            document.getElementById('prezzo').value = p.prezzo || '';
            document.getElementById('categoria').value = p.categoria || p.strCategory || '';
            document.getElementById('descrizione').value = p.descrizione || '';
            document.getElementById('thumb').value = p.thumb || p.strMealThumb || '';
        } else {
            alert("Piatto non trovato nel tuo menu.");
            window.location.href = 'ristoratore.html';
        }
        
    } catch (err) {
        console.error(err);
        alert("Errore caricamento dati.");
    }
}

document.getElementById('formPiatto').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Preparazione dati
    const rawData = {
        nome: document.getElementById('nome').value,
        prezzo: parseFloat(document.getElementById('prezzo').value),
        categoria: document.getElementById('categoria').value,
        descrizione: document.getElementById('descrizione').value,
        thumb: document.getElementById('thumb').value,
        // Altri campi necessari per coerenza
        strMeal: document.getElementById('nome').value, 
        strCategory: document.getElementById('categoria').value,
        strMealThumb: document.getElementById('thumb').value
    };

    // COSTRUZIONE URL E BODY CORRETTI PER IL TUO BACKEND
    let url, method;

    if (piattoId) {
        // UPDATE: PUT /ristoratore/:rId/piatti/:pId
        url = `${API_URL}/ristoratore/${rId}/piatti/${piattoId}`;
        method = 'PUT';
    } else {
        // CREATE: POST /ristoratore/:id/piatti
        url = `${API_URL}/ristoratore/${rId}/piatti`;
        method = 'POST';
    }

    // NOTA BENE: Nel tuo index.js leggi "req.body.piatto".
    // Quindi dobbiamo avvolgere i dati in un oggetto "piatto".
    const payload = { piatto: rawData };

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert(piattoId ? "Piatto aggiornato!" : "Piatto aggiunto al menu!");
            window.location.href = 'ristoratore.html';
        } else {
            const errData = await res.json();
            alert("Errore: " + (errData.message || "Sconosciuto"));
        }
    } catch (err) {
        console.error(err);
        alert("Errore di connessione al server.");
    }
});