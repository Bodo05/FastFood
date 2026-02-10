//aseptta finche login non è caricata
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
    //prendo i valori tramite id oggetti dell'html
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btnLogin');

    if (!email || !password) {
        showToast("Inserisci email e password", "warning");
        return;
    }

    //istruzion i per verificare quale delle due opzioni è stata scelta, nel caso di imprevisti è previsto l'uso di cliente
    const tipoRadio = document.querySelector('input[name="userType"]:checked');
    const tipo = tipoRadio ? tipoRadio.value : 'cliente';

    //per evitare du fare piu submit disabilito il bottone 
    btn.disabled = true;
    btn.innerText = "Accesso in corso...";

    //costruisco endpoint per api in base alla tipologia di utente
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

        //se andata a buon fine setto nel local storage i parametri id e tipologia utente
        if (risposta.ok) {
            localStorage.setItem('_id', dati._id);
            localStorage.setItem('userType', tipo);

            showToast("Login effettuato!", "success");
            
            //in base alla tipologia di utente mi ridirigo alla loro pagina home predefinita dopo un delay di 1,5s
            setTimeout(function() {
                if (tipo === 'ristoratore') {
                    window.location.href = 'ristoratore.html';
                } else {
                    window.location.href = 'cliente.html';
                }
            }, 1500);
        } else {
            //se non va a buon fine mostro notifica e riabilito il bottone
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