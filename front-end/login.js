// Funzione per mostrare notifiche (Toast)
function showToast(message, type = 'danger') {
    const container = document.getElementById('toastPlaceHolder');
    if (!container) return alert(message);

    // Creazione dinamica dell'elemento HTML per il Toast
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="toast align-items-center text-bg-${type} border-0 mb-2 shadow" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body fw-bold">
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;
    
    container.appendChild(wrapper.firstElementChild);
    const toastEl = container.lastElementChild;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
    
    //rimuove l'elemento HTML quando la notifica sparisce
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

async function login() {
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const btn = document.getElementById('btnLogin');

    // Controllo campi vuoti
    if (!emailField.value || !passwordField.value) {
        showToast("Inserisci email e password", "warning");
        return;
    }

    const email = emailField.value;
    const password = passwordField.value;
    
    // Recupera il tipo utente
    const typeElement = document.querySelector('input[name="userType"]:checked');
    const type = typeElement ? typeElement.value : 'cliente';

    const testoOriginale = btn.innerText;
    btn.disabled = true; //disabilito pulsante per evitare doppi input
    btn.innerText = "Accesso in corso...";

    //costruzione indirizzo endpoint in base al ruolo selezionato
    const baseUrl = 'http://localhost:3000'; 
    const endpoint = type === 'ristoratore' ? `${baseUrl}/ristoratore/login` : `${baseUrl}/cliente/login`;
    
    const dati = { email, password, type };

    try {

        //chiamata al backend asincrona
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(dati)
        });

        const data = await res.json();

        if (res.ok) {
            showToast("Login effettuato con successo!", "success");
            
            // Salva i dati essenziali
            localStorage.setItem('_id', data._id); // Salviamo solo l'ID grezzo
            localStorage.setItem('userType', type);

            setTimeout(() => {
                if (type === 'ristoratore') window.location.href = 'ristoratore.html';
                else window.location.href = 'cliente.html';
            }, 1500);
        } else {
            showToast(data.message || "Credenziali non valide", "danger");
            btn.disabled = false;
            btn.innerText = testoOriginale;
        }
    } catch (e) {
        console.error(e);
        showToast("Errore di connessione al server", "danger");
        btn.disabled = false;
        btn.innerText = testoOriginale;
    }
}

// aspetta che la pagina sia pronta prima di cercare gli elementi
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Blocca il ricaricamento standard della pagina
            login(); // Chiama la tua funzione
        });
    }
});