const userId = localStorage.getItem('_id');
if (!userId) {
    alert("Sessione scaduta.");
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', caricaProfilo);

async function caricaProfilo() {
    try {
        const risposta = await fetch(API_URL + '/ristoratore/' + userId);
        
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

const form = document.getElementById('formProfilo');
if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const nomeRist = document.getElementById('nomeRistorante').value.trim();
        const piva = document.getElementById('piva').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const indirizzo = document.getElementById('indirizzo').value.trim();
        const email = document.getElementById('email').value.trim();

        if (!nomeRist || !indirizzo || !email || !piva) {
            showToast("Compila tutti i campi obbligatori", "warning");
            return;
        }

        if (!/^\d{11}$/.test(piva)) {
            showToast("La P.IVA deve essere di 11 cifre", "warning");
            return;
        }

        try {
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

const btnElimina = document.getElementById('btnElimina');
if (btnElimina) {
    btnElimina.addEventListener('click', async function() {
        if (!confirm("Sei sicuro di voler eliminare l'account? Questa azione è irreversibile!")) {
            return;
        }

        try {
            const risposta = await fetch(API_URL + '/ristoratore/' + userId, { method: 'DELETE' });

            if (risposta.ok) {
                alert("Account eliminato.");
                localStorage.clear();
                window.location.href = 'login.html';
            } else {
                showToast("Impossibile eliminare l'account", "danger");
            }
        } catch (errore) {
            showToast("Errore durante la cancellazione", "danger");
        }
    });
}