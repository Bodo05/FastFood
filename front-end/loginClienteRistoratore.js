
let loginType = 'cliente';

// Cambia tipo di login (cliente / ristoratore)
function setLoginType(type) {
    loginType = type;
    document.getElementById('tabCliente').classList.toggle('tab-active', type === 'cliente');
    document.getElementById('tabRistoratore').classList.toggle('tab-active', type === 'ristoratore');
}

// Validazione email semplice
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Funzione di login (chiamata da button onclick o submit handler)
async function login() {
    const emailEl = document.getElementById("email");
    const passwordEl = document.getElementById("password");

    const email = (emailEl && emailEl.value || "").trim();
    const password = (passwordEl && passwordEl.value || "").trim();

    // Controlli base
    if (!email || !password) {
        alert("Inserisci email e password.");
        return;
    }

    if (!isValidEmail(email)) {
        alert("Inserisci un'email valida.");
        return;
    }

    // Controllo minimo lunghezza password (es. 8)
    if (password.length < 8) {
        alert("La password deve essere almeno di 8 caratteri.");
        return;
    }

    // Preparazione richiesta
    const url = loginType === 'cliente'
        ? 'http://localhost:3000/cliente/login'
        : 'http://localhost:3000/ristoratore/login';

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (res.status === 401) {
            alert('Credenziali errate — controlla email e password.');
            return;
        }

        if (!res.ok) {
            alert('Errore durante il login (server).');
            console.error("Login failed:", await res.text());
            return;
        }

        const json = await res.json();

        if (!json || !json._id) {
            alert('Risposta server non valida (nessun _id).');
            console.error("Invalid response:", json);
            return;
        }

        // Salvataggio sessione simulata in localStorage
        localStorage.setItem("userType", loginType);
        localStorage.setItem("_id", json._id);

        // opzionali: salva email per comodità in UI
        localStorage.setItem("email", email);

        alert(`Login ${loginType} effettuato!`);
        window.location.href = loginType === 'cliente' ? 'cliente.html' : 'ristoratore.html';

    } catch (err) {
        console.error("Errore connessione:", err);
        alert("Impossibile contattare il server. Controlla che index.js sia in esecuzione.");
    }
}