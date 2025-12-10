document.addEventListener('DOMContentLoaded', function() {
    loadCategorie();
    
    // Se c'è un parametro ?q= nell'URL, lo rimettiamo nella casella di input
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    
    if (query) {
        const input = document.getElementById('navbarSearchInput');
        if (input) input.value = query;
    }
});

// Carica le categorie nel menu a tendina (se presente)
async function loadCategorie() {
    try {
        const res = await fetch('http://localhost:3000/categorie-catalogo');
        if(res.ok) {
            const categorie = await res.json();
            const select = document.getElementById('ricercaPiattoCategoria'); 
            if(select) {
                select.innerHTML = '<option value="">Tutte le categorie</option>';
                categorie.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    select.appendChild(option);
                });
            }
        }
    } catch (err) {
        console.error('Errore caricamento categorie:', err);
    }
}

// Funzione collegata al pulsante "Cerca" della Navbar
function effettuaRicercaNavbar() {
    const input = document.getElementById('navbarSearchInput');
    const q = input ? input.value.trim() : '';

    // Validazione input vuoto con NOTIFICA TOAST
    if (!q) {
        if(typeof showToast === 'function') {
            showToast('Inserisci un termine di ricerca', 'warning');
        } else {
            alert('Inserisci un termine di ricerca');
        }
        return;
    }

    // LOGICA DI REINDIRIZZAMENTO INTELLIGENTE
    
    // CASO 1: Siamo già nella pagina di ricerca?
    if (window.location.pathname.endsWith('ricerca.html')) {
        // Cerca l'input principale della pagina ricerca
        const mainInput = document.getElementById('inputRicerca');
        if(mainInput) {
            mainInput.value = q;
            // Chiama direttamente la funzione di ricerca della pagina (senza ricaricare)
            if(typeof eseguiRicerca === 'function') {
                eseguiRicerca(); 
            }
        }
    } 
    // CASO 2: Siamo in qualsiasi altra pagina (Home, Carrello, ecc.)
    else {
        // Ci spostiamo sulla pagina ricerca portandoci dietro la parola cercata
        window.location.href = `ricerca.html?q=${encodeURIComponent(q)}`;
    }
}