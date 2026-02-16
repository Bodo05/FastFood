//controlla che il ristoratore sia loggato
if (checkLogin('ristoratore') === false) throw new Error("Redirecting...");
const rId = localStorage.getItem('_id');

//nel caso in cui ci sia modifica del piatto queste 2 righe seguenti servono a prendere l'ultima parte di indirizzo
//in cui è presente l'id del piatto per poi caricare le informazioni da modificare di quel piatti

const urlParams = new URLSearchParams(window.location.search);
const piattoId = urlParams.get('piattoId');

//aspetta che la pagina sia caricata e poi chiama la funzione caricaPiatto se rispettata la condizione
document.addEventListener('DOMContentLoaded', function() {
    if (piattoId) {
        //caso in cui si modifica perchè ha riscontrato un id
        document.getElementById('formTitle').innerText = "Modifica Piatto";
        document.getElementById('btnSubmit').innerText = "Salva Modifiche";
        caricaPiatto(piattoId);
    }

    //chiama le seguenti funzioni
    document.getElementById('formPiatto').addEventListener('submit', function(e) {
        e.preventDefault(); //blocca il pulsante salva
        salvaPiatto(); //chiama funzione salvaPiatto
    });
});

//chiamata nel caso di modifica del piatto
async function caricaPiatto(id) {
    try {
        //prendo i piatti del ristoratore e confronto l'elenco dei piatti con l'id del piatto in questione
        const risposta = await fetch(API_URL + '/ristoratore/' + rId + '/piatti');
        const piatti = await risposta.json();
        let piatto = null;
        
        for (let i = 0; i < piatti.length; i++) {
            if (piatti[i]._id === id) {
                piatto = piatti[i];
                break;
            }
        }

        //riempio i campi 
        if (piatto) {
            document.getElementById('nome').value = piatto.nome || piatto.strMeal || '';
            document.getElementById('prezzo').value = piatto.prezzo || '';
            document.getElementById('tempo').value = piatto.tempo || 15;
            document.getElementById('categoria').value = piatto.categoria || piatto.strCategory || '';
            document.getElementById('thumb').value = piatto.thumb || piatto.strMealThumb || '';
            document.getElementById('descrizione').value = piatto.ingredienti || '';
        } else {
            //altrimenti mostro notifica di piatto non trovato
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
    const tempo = parseInt(document.getElementById('tempo').value) || 15;
    const thumb = document.getElementById('thumb').value.trim();
    const descrizione = document.getElementById('descrizione').value.trim();

    //prendo i valori e se qualcosa non è presente mando notifica e non lascio proseguire
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
    if (!tempo) {
        showToast("Inserisci il tempo", "warning");
        return;
    }

    //creo oggetto
    const dati = {
        piatto: {
            nome: nome,
            prezzo: prezzo,
            categoria: categoria,
            tempo: tempo,
            thumb: thumb,
            ingredienti: descrizione,
            strMeal: nome,
            strCategory: categoria,
            strMealThumb: thumb
        }
    };

    //url base in POST perchè stiamo creando il piatto
    let url = API_URL + '/ristoratore/' + rId + '/piatti';
    let metodo = 'POST';

    //se siamo in modifica modifico url API cambiando il metodo in PUT perche si tratta di aggiornamento
    if (piattoId) {
        url = API_URL + '/ristoratore/' + rId + '/piatti/' + piattoId;
        metodo = 'PUT';
    }


    //chiamo il backend che va a salvare i dati nel database
    try {
        const risposta = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dati)
        });

        //se va a buon fine riporta alla home del ristoratore dopo 1,5 secondi, mostrando prima la notifica
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