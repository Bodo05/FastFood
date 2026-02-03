document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }
});

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btnLogin');

    if (!email || !password) {
        showToast("Inserisci email e password", "warning");
        return;
    }

    const tipoRadio = document.querySelector('input[name="userType"]:checked');
    const tipo = tipoRadio ? tipoRadio.value : 'cliente';

    btn.disabled = true;
    btn.innerText = "Accesso in corso...";

    const endpoint = tipo === 'ristoratore' 
        ? API_URL + '/ristoratore/login' 
        : API_URL + '/cliente/login';

    try {
        const risposta = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const dati = await risposta.json();

        if (risposta.ok) {
            localStorage.setItem('_id', dati._id);
            localStorage.setItem('userType', tipo);

            showToast("Login effettuato!", "success");
            
            setTimeout(function() {
                if (tipo === 'ristoratore') {
                    window.location.href = 'ristoratore.html';
                } else {
                    window.location.href = 'cliente.html';
                }
            }, 1500);
        } else {
            showToast(dati.message || "Credenziali non valide", "danger");
            btn.disabled = false;
            btn.innerText = "Accedi";
        }
    } catch (errore) {
        console.error(errore);
        showToast("Errore di connessione al server", "danger");
        btn.disabled = false;
        btn.innerText = "Accedi";
    }
}