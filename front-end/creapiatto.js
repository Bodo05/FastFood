// Lista ingredienti
let ingredienti = [];

// Aggiunge un ingrediente alla lista
function aggiungiIngrediente() {
    const input = document.getElementById('ingrediente');
    const nomeIngrediente = input.value.trim();
    
    if (nomeIngrediente === '') {
        mostraMessaggio('Inserisci il nome di un ingrediente', 'warning');
        return;
    }
    
    if (ingredienti.includes(nomeIngrediente)) {
        mostraMessaggio('Ingrediente già presente', 'info');
        return;
    }
    
    ingredienti.push(nomeIngrediente);
    aggiornaListaIngredienti();
    input.value = '';
    mostraMessaggio('Ingrediente aggiunto', 'success');
}

// Aggiorna la visualizzazione degli ingredienti
function aggiornaListaIngredienti() {
    const container = document.getElementById('listaIngredienti');
    
    if (ingredienti.length === 0) {
        container.innerHTML = '<small class="text-muted">Nessun ingrediente aggiunto</small>';
        return;
    }
    
    let html = '';
    ingredienti.forEach((ingrediente, index) => {
        html += `
            <span class="badge bg-primary me-1 mb-1 d-inline-flex align-items-center">
                ${ingrediente}
                <span class="ms-1" style="cursor:pointer" onclick="rimuoviIngrediente(${index})">×</span>
            </span>
        `;
    });
    
    container.innerHTML = html;
}

// Rimuove un ingrediente
function rimuoviIngrediente(index) {
    ingredienti.splice(index, 1);
    aggiornaListaIngredienti();
    mostraMessaggio('Ingrediente rimosso', 'info');
}

// Crea il piatto
function creaPiatto() {
    // Prendi i valori dal form
    const nome = document.getElementById('nome').value.trim();
    const prezzo = document.getElementById('prezzo').value;
    const tempo = document.getElementById('tempo').value;
    const categoria = document.getElementById('categoria').value;
    const foto = document.getElementById('foto').value;
    
    // Validazione
    if (!nome) {
        mostraMessaggio('Inserisci il nome del piatto', 'warning');
        return;
    }
    
    if (!prezzo || prezzo <= 0) {
        mostraMessaggio('Inserisci un prezzo valido', 'warning');
        return;
    }
    
    if (!tempo || tempo < 1) {
        mostraMessaggio('Inserisci un tempo di preparazione valido', 'warning');
        return;
    }
    
    if (!categoria) {
        mostraMessaggio('Seleziona una categoria', 'warning');
        return;
    }
    
    if (ingredienti.length === 0) {
        mostraMessaggio('Aggiungi almeno un ingrediente', 'warning');
        return;
    }
    
    // Crea l'oggetto piatto
    const piatto = {
        nome: nome,
        prezzo: parseFloat(prezzo),
        tempoPreparazione: parseInt(tempo),
        foto: foto || 'default.jpg',
        ingredienti: [...ingredienti],
        categoria: categoria,
        dataCreazione: new Date().toISOString()
    };
    
    // Simula salvataggio (nella realtà qui faremmo una chiamata API)
    console.log('Piatto creato:', piatto);
    salvaPiatto(piatto);
    
    // Mostra conferma
    mostraMessaggio(`Piatto "${piatto.nome}" creato con successo!`, 'success');
    
    // Resetta il form dopo 2 secondi
    setTimeout(() => {
        resetForm();
        // Reindirizza al menu (opzionale)
        // window.location.href = 'menu.html';
    }, 2000);
}

// Simula il salvataggio del piatto
function salvaPiatto(piatto) {
    // Qui normalmente salveremmo sul server
    // Per ora salviamo in localStorage per dimostrazione
    const piattiEsistenti = JSON.parse(localStorage.getItem('piatti') || '[]');
    piattiEsistenti.push(piatto);
    localStorage.setItem('piatti', JSON.stringify(piattiEsistenti));
}

// Resetta il form
function resetForm() {
    document.getElementById('formPiatto').reset();
    ingredienti = [];
    aggiornaListaIngredienti();
    mostraMessaggio('Form resettato', 'info');
}

// Mostra messaggio
function mostraMessaggio(testo, tipo) {
    const toast = document.getElementById('messaggioToast');
    const toastBody = document.getElementById('toastBody');
    
    // Colore in base al tipo
    const colori = {
        success: 'bg-success text-white',
        warning: 'bg-warning text-dark',
        info: 'bg-info text-white',
        error: 'bg-danger text-white'
    };
    
    toastBody.className = `toast-body ${colori[tipo] || 'bg-light text-dark'}`;
    toastBody.textContent = testo;
    
    // Mostra il toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Logout
function logout() {
    if (confirm('Sei sicuro di voler uscire?')) {
        localStorage.removeItem('utenteLoggato');
        window.location.href = 'login.html';
    }
}

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    aggiornaListaIngredienti();
    
    // Aggiungi ingrediente con Enter
    document.getElementById('ingrediente').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            aggiungiIngrediente();
        }
    });
    
    // Simula login per test
    localStorage.setItem('utenteLoggato', 'true');
});
