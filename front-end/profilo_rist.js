// Recupera l'ID dal localStorage
const userId = localStorage.getItem('userId');
const API_URL = 'http://localhost:3000'; // Modifica se necessario

// --- 1. CARICAMENTO DATI ALL'AVVIO ---
document.addEventListener('DOMContentLoaded', async () => {
    // Controllo sicurezza: se non c'è ID, torna al login
    if (!userId) {
        alert("Non sei loggato!");
        window.location.href = 'index.html';
        return;
    }

    try {
        // Chiama il backend per ottenere i dati attuali del ristoratore
        const response = await fetch(`${API_URL}/ristoratore/${userId}`);
        
        if (response.ok) {
            const data = await response.json();
            // Popola i campi del form con i dati ricevuti
            document.getElementById('nomeRistorante').value = data.nomeRistorante || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('indirizzo').value = data.indirizzo || '';
            document.getElementById('telefono').value = data.telefono || '';
            document.getElementById('piva').value = data.piva || '';
        } else {
            console.error("Errore fetch dati:", response.status);
            alert("Impossibile caricare i dati del profilo.");
        }
    } catch (error) {
        console.error("Errore di connessione:", error);
    }
});

// --- 2. SALVATAGGIO MODIFICHE (PUT) ---
const form = document.getElementById('formProfilo');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Blocca il ricaricamento della pagina

        const datiAggiornati = {
            nomeRistorante: document.getElementById('nomeRistorante').value,
            email: document.getElementById('email').value,
            indirizzo: document.getElementById('indirizzo').value,
            telefono: document.getElementById('telefono').value,
            piva: document.getElementById('piva').value
        };

        try {
            const response = await fetch(`${API_URL}/ristoratore/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datiAggiornati)
            });

            if (response.ok) {
                alert("Profilo aggiornato con successo!");
            } else {
                const err = await response.json();
                alert("Errore aggiornamento: " + (err.message || "Sconosciuto"));
            }
        } catch (error) {
            console.error("Errore:", error);
            alert("Errore di connessione al server.");
        }
    });
}

// --- 3. ELIMINAZIONE PROFILO (DELETE) ---
const btnElimina = document.getElementById('btnElimina');
if (btnElimina) {
    btnElimina.addEventListener('click', async () => {
        if (!confirm("Sei sicuro di voler eliminare il tuo ristorante? Questa azione è irreversibile!")) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/ristoratore/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("Account eliminato. Verrai reindirizzato alla Home.");
                logout(); // Pulisce sessione e reindirizza
            } else {
                alert("Impossibile eliminare l'account.");
            }
        } catch (error) {
            console.error("Errore:", error);
            alert("Errore durante la cancellazione.");
        }
    });
}

// --- 4. LOGOUT ---
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', logout);
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}