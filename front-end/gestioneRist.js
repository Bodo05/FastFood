//controlla che ristoratore sia loggato
if (checkLogin('ristoratore') === false) throw new Error("Redirecting...");
const userId = localStorage.getItem('_id');

//aspetta che la pagina sia carica per chiamare la funzione caricaProfilo
document.addEventListener('DOMContentLoaded', caricaProfilo);

async function caricaProfilo() {
    try {
        //prendo le informazioni de, ristoratore dal database
        const risposta = await fetch(API_URL + '/ristoratore/' + userId);
        
        //se andata a buon fine riempio le caselle di testo con i valori appena presi
        if (risposta.ok) {
            const dati = await risposta.json();
            document.getElementById('nomeRistorante').value = dati.nomeRistorante || '';
            document.getElementById('email').value = dati.email || '';
            document.getElementById('indirizzo').value = dati.indirizzo || '';
            document.getElementById('telefono').value = dati.telefono || '';
            document.getElementById('piva').value = dati.piva || '';
        }
    } catch (errore) {
        console.error("Errore:", errore);
    }
}

//se schiaccio il salva modifiche viene svolta questa funzione
const form = document.getElementById('formProfilo');
if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const nomeRist = document.getElementById('nomeRistorante').value.trim();
        const piva = document.getElementById('piva').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const indirizzo = document.getElementById('indirizzo').value.trim();
        const email = document.getElementById('email').value.trim();

        //controllo validità dei valori inseriti

        if (!nomeRist || !indirizzo || !email || !piva) {
            showToast("Compila tutti i campi obbligatori", "warning");
            return;
        }

        if (!/^\d{11}$/.test(piva)) {
            showToast("La P.IVA deve essere di 11 cifre", "warning");
            return;
        }

        try {
            //effettuo una PUT al server con i dati aggiornati per salvarli nel database
            const risposta = await fetch(API_URL + '/ristoratore/' + userId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nomeRistorante: nomeRist,
                    email: email,
                    indirizzo: indirizzo,
                    telefono: telefono,
                    piva: piva
                })
            });
            //se va a buon fine notitica positiva, altrimenti di colore rosso
            if (risposta.ok) {
                showToast("Profilo aggiornato!", "success");
            } else {
                const err = await risposta.json();
                showToast("Errore: " + (err.message || "Sconosciuto"), "danger");
            }
        } catch (errore) {
            console.error(errore);
            showToast("Errore di connessione", "danger");
        }
    });
}

//gestione eliminazione dell'account
const btnElimina = document.getElementById('btnElimina');
if (btnElimina) {
    btnElimina.addEventListener('click', async function() {
        //apre finestra per richiesta du conferma
        if (!confirm("Sei sicuro di voler eliminare l'account? Questa azione è irreversibile!")) {
            return;
        }

        try {
            //se arriva qui si può eliminare l'account tramite apposita API di DELETE
            const risposta = await fetch(API_URL + '/ristoratore/' + userId, { method: 'DELETE' });

            if (risposta.ok) {
                alert("Account eliminato.");
                localStorage.clear(); //pulizia local storage 
                window.location.href = 'login.html'; //passo alla pagina di login
            } else {
                showToast("Impossibile eliminare l'account", "danger");
            }
        } catch (errore) {
            showToast("Errore durante la cancellazione", "danger");
        }
    });
}