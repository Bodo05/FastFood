// Funzione per mostrare notifiche (Toast) nel Login
function showToast(message, type = 'danger') {
    const container = document.getElementById('toastPlaceHolder');
    if (!container) return alert(message); // Fallback di sicurezza

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
    
    // Rimuove l'elemento HTML quando la notifica sparisce
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
    
    // Recupera il tipo utente dai radio button (Cliente o Ristoratore)
    const typeElement = document.querySelector('input[name="userType"]:checked');
    const type = typeElement ? typeElement.value : 'cliente';

    // Disabilita pulsante per evitare doppi click
    const testoOriginale = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Accesso in corso...";

    // Determina l'URL corretto in base al tipo
    const baseUrl = 'http://localhost:3000'; 
    const endpoint = type === 'ristoratore' ? `${baseUrl}/ristoratore/login` : `${baseUrl}/auth/login`;
    
    const payload = { email, password, type };

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            showToast("Login effettuato con successo!", "success");
            
            // Salva i dati essenziali
            localStorage.setItem('_id', data._id);
            localStorage.setItem('userType', type);

            // Redirect dopo 1.5 secondi
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