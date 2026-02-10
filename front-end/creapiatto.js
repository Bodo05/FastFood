if (checkLogin('ristoratore') === false) throw new Error("Redirecting...");
const rId = localStorage.getItem('_id');

const urlParams = new URLSearchParams(window.location.search);
const piattoId = urlParams.get('piattoId');

document.addEventListener('DOMContentLoaded', function() {
    if (piattoId) {
        document.getElementById('formTitle').innerText = "Modifica Piatto";
        document.getElementById('btnSubmit').innerText = "Salva Modifiche";
        caricaPiatto(piattoId);
    }

    document.getElementById('formPiatto').addEventListener('submit', function(e) {
        e.preventDefault();
        salvaPiatto();
    });
});

async function caricaPiatto(id) {
    try {
        const risposta = await fetch(API_URL + '/ristoratore/' + rId + '/piatti');
        const piatti = await risposta.json();
        const piatto = piatti.find(function(p) { return p._id === id; });

        if (piatto) {
            document.getElementById('nome').value = piatto.nome || piatto.strMeal || '';
            document.getElementById('prezzo').value = piatto.prezzo || '';
            document.getElementById('categoria').value = piatto.categoria || piatto.strCategory || '';
            document.getElementById('thumb').value = piatto.thumb || piatto.strMealThumb || '';
            document.getElementById('descrizione').value = piatto.ingredienti || '';
        } else {
            showToast("Piatto non trovato", "danger");
        }
    } catch (errore) {
        console.error(errore);
        showToast("Errore caricamento dati", "danger");
    }
}

async function salvaPiatto() {
    const nome = document.getElementById('nome').value.trim();
    const prezzo = parseFloat(document.getElementById('prezzo').value);
    const categoria = document.getElementById('categoria').value.trim();
    const thumb = document.getElementById('thumb').value.trim();
    const descrizione = document.getElementById('descrizione').value.trim();

    if (!nome) {
        showToast("Inserisci il nome del piatto", "warning");
        return;
    }
    if (isNaN(prezzo) || prezzo <= 0) {
        showToast("Inserisci un prezzo valido", "warning");
        return;
    }
    if (!categoria) {
        showToast("Inserisci una categoria", "warning");
        return;
    }

    const dati = {
        piatto: {
            nome: nome,
            prezzo: prezzo,
            categoria: categoria,
            thumb: thumb,
            ingredienti: descrizione,
            strMeal: nome,
            strCategory: categoria,
            strMealThumb: thumb
        }
    };

    let url = API_URL + '/ristoratore/' + rId + '/piatti';
    let metodo = 'POST';

    if (piattoId) {
        url = API_URL + '/ristoratore/' + rId + '/piatti/' + piattoId;
        metodo = 'PUT';
    }

    try {
        const risposta = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dati)
        });

        if (risposta.ok) {
            showToast(piattoId ? "Piatto aggiornato!" : "Piatto creato!", "success");
            setTimeout(function() {
                window.location.href = 'ristoratore.html';
            }, 1500);
        } else {
            const errore = await risposta.json();
            showToast("Errore: " + (errore.message || "Salvataggio fallito"), "danger");
        }
    } catch (errore) {
        console.error(errore);
        showToast("Errore di connessione", "danger");
    }
}