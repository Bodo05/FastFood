const userId = localStorage.getItem('_id');
const API_URL = 'http://localhost:3000';

const validators = {
    piva: (piva) => /^\d{11}$/.test(piva),
    telefono: (tel) => /^\d{8,15}$/.test(tel)
};

// Funzione Helper Notifiche (usa alert se showToast non è disponibile globalmente)
function msg(text) {
    if(typeof showToast === 'function') showToast(text, 'warning');
    else alert(text);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!userId) {
        alert("Sessione scaduta.");
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/ristoratore/${userId}`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('nomeRistorante').value = data.nomeRistorante || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('indirizzo').value = data.indirizzo || '';
            document.getElementById('telefono').value = data.telefono || '';
            document.getElementById('piva').value = data.piva || '';
        } else {
            console.error("Errore fetch dati:", response.status);
        }
    } catch (error) {
        console.error("Errore di connessione:", error);
    }
});

const form = document.getElementById('formProfilo');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const nomeRist = document.getElementById('nomeRistorante').value.trim();
        const piva = document.getElementById('piva').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const indirizzo = document.getElementById('indirizzo').value.trim();
        const email = document.getElementById('email').value.trim();

        // Validazioni
        if (!nomeRist || !indirizzo || !email || !piva) return msg("Compila i campi obbligatori.");
        if (!validators.piva(piva)) return msg("La P.IVA deve essere di 11 cifre.");
        if (telefono && !validators.telefono(telefono)) return msg("Telefono non valido.");

        const datiAggiornati = {
            nomeRistorante: nomeRist,
            email: email,
            indirizzo: indirizzo,
            telefono: telefono,
            piva: piva
        };

        try {
            const response = await fetch(`${API_URL}/ristoratore/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datiAggiornati)
            });

            if (response.ok) {
                if(typeof showToast === 'function') showToast("Profilo aggiornato!", "success");
                else alert("Profilo aggiornato!");
            } else {
                const err = await response.json();
                msg("Errore: " + (err.message || "Sconosciuto"));
            }
        } catch (error) {
            console.error(error);
            msg("Errore di connessione.");
        }
    });
}

const btnElimina = document.getElementById('btnElimina');
if (btnElimina) {
    btnElimina.addEventListener('click', async () => {
        if (!confirm("Sei sicuro di voler eliminare l'account? Questa azione è irreversibile!")) return;

        try {
            const response = await fetch(`${API_URL}/ristoratore/${userId}`, { method: 'DELETE' });

            if (response.ok) {
                alert("Account eliminato.");
                localStorage.clear();
                window.location.href = 'login.html';
            } else {
                msg("Impossibile eliminare l'account.");
            }
        } catch (error) {
            msg("Errore durante la cancellazione.");
        }
    });
}