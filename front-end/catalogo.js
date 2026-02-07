// Verifica login ristoratore
var ristoratoreId = localStorage.getItem('_id');
if (!ristoratoreId || localStorage.getItem('userType') !== 'ristoratore') {
    window.location.href = 'login.html';
}

// Lista dei piatti già nel menu (per evitare duplicati)
var piattiNelMenu = [];

// Quando la pagina è pronta
document.addEventListener('DOMContentLoaded', function() {
    // Carica i piatti già presenti nel menu
    caricaPiattiMenu();
    
    // Carica tutto il catalogo all'inizio
    caricaCatalogo();

    // Gestione ricerca
    document.getElementById('btnCerca').addEventListener('click', cercaCatalogo);
    document.getElementById('inputRicerca').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            cercaCatalogo();
        }
    });
});

/**
 * Carica i piatti già nel menu del ristoratore
 */
async function caricaPiattiMenu() {
    try {
        var risposta = await fetch(API_URL + '/ristoratore/' + ristoratoreId + '/piatti');
        var piatti = await risposta.json();
        
        // Salva i nomi dei piatti per confronto
        piattiNelMenu = piatti.map(function(p) {
            return (p.nome || p.strMeal || '').toLowerCase();
        });
    } catch (errore) {
        console.error('Errore caricamento menu:', errore);
    }
}

/**
 * Carica tutti i piatti dal catalogo
 */
async function caricaCatalogo() {
    var container = document.getElementById('catalogoContainer');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    try {
        var risposta = await fetch(API_URL + '/catalog');
        var piatti = await risposta.json();

        mostraPiatti(piatti);
    } catch (errore) {
        console.error('Errore caricamento catalogo:', errore);
        container.innerHTML = '<div class="alert alert-danger">Errore caricamento catalogo</div>';
    }
}

/**
 * Cerca piatti nel catalogo per nome
 */
async function cercaCatalogo() {
    var termine = document.getElementById('inputRicerca').value.trim();
    var container = document.getElementById('catalogoContainer');

    // Se il campo è vuoto, mostra tutto il catalogo
    if (!termine) {
        caricaCatalogo();
        return;
    }

    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    try {
        // Cerca nel catalogo (se l'API supporta la ricerca)
        var risposta = await fetch(API_URL + '/catalog?search=' + encodeURIComponent(termine));
        var piatti = await risposta.json();

        // Se l'API non supporta la ricerca, filtra lato client
        if (!piatti.length) {
            risposta = await fetch(API_URL + '/catalog');
            var tuttiPiatti = await risposta.json();
            piatti = tuttiPiatti.filter(function(p) {
                var nome = (p.nome || p.strMeal || '').toLowerCase();
                return nome.includes(termine.toLowerCase());
            });
        }

        mostraPiatti(piatti);
    } catch (errore) {
        console.error('Errore ricerca:', errore);
        container.innerHTML = '<div class="alert alert-danger">Errore durante la ricerca</div>';
    }
}

/**
 * Mostra i piatti nel container
 */
function mostraPiatti(piatti) {
    var container = document.getElementById('catalogoContainer');
    container.innerHTML = '';

    if (!piatti || piatti.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Nessun piatto trovato nel catalogo.</p>';
        return;
    }

    piatti.forEach(function(piatto) {
        var nome = piatto.nome || piatto.strMeal || 'Senza nome';
        var categoria = piatto.categoria || piatto.strCategory || '';
        var immagine = piatto.thumb || piatto.strMealThumb || 'https://via.placeholder.com/150';
        var idPiatto = piatto._id || piatto.idMeal;

        var nomeNormalizzato = nome.toLowerCase();
        var giaPresente = piattiNelMenu.includes(nomeNormalizzato);

        var card = document.createElement('div');
        card.className = 'col-md-3 mb-3';
        card.innerHTML = 
            '<div class="card h-100 shadow-sm">' +
                '<img src="' + immagine + '" class="card-img-top" style="height:150px; object-fit:cover">' +
                '<div class="card-body">' +
                    '<h6 class="card-title">' + nome + '</h6>' +
                    '<small class="text-muted">' + categoria + '</small>' +
                    (giaPresente 
                        ? ''
                        : '<div class="input-group input-group-sm mt-2">' +
                            '<span class="input-group-text">€</span>' +
                            '<input type="number" class="form-control" id="prezzo-' + idPiatto + '" placeholder="Prezzo" min="0.01" step="0.01">' +
                          '</div>'
                    ) +
                '</div>' +
                '<div class="card-footer bg-white">' +
                    (giaPresente 
                        ? '<button class="btn btn-sm btn-secondary w-100" disabled>Già nel menu</button>'
                        : '<button class="btn btn-sm btn-success w-100" onclick="aggiungiPiatto(\'' + 
                            idPiatto + '\', \'' + 
                            nome.replace(/'/g, "\\'") + '\', \'' + 
                            categoria.replace(/'/g, "\\'") + '\', \'' + 
                            immagine + '\')">+ Aggiungi al menu</button>'
                    ) +
                '</div>' +
            '</div>';
        container.appendChild(card);
    });
}

/**
 * Aggiunge un piatto dal catalogo al menu del ristoratore
 */
async function aggiungiPiatto(idPiatto, nome, categoria, immagine) {
    // Leggi il prezzo dal campo input
    var inputPrezzo = document.getElementById('prezzo-' + idPiatto);
    var prezzo = inputPrezzo ? inputPrezzo.value : '';
    
    var prezzoNumero = parseFloat(prezzo);
    if (isNaN(prezzoNumero) || prezzoNumero <= 0) {
        showToast('Inserisci un prezzo valido per "' + nome + '"', 'warning');
        if (inputPrezzo) inputPrezzo.focus();
        return;
    }

    // Prepara i dati del piatto
    var datiPiatto = {
        piatto: {
            nome: nome,
            prezzo: prezzoNumero,
            categoria: categoria,
            thumb: immagine,
            strMeal: nome,
            strCategory: categoria,
            strMealThumb: immagine,
            idCatalog: idPiatto // ID originale dal catalogo
        }
    };

    try {
        var risposta = await fetch(API_URL + '/ristoratore/' + ristoratoreId + '/piatti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datiPiatto)
        });

        if (risposta.ok) {
            showToast('Piatto "' + nome + '" aggiunto al menu!', 'success');
            
            // Aggiorna la lista locale
            piattiNelMenu.push(nome.toLowerCase());
            
            // Ricarica il catalogo per aggiornare i pulsanti
            var termine = document.getElementById('inputRicerca').value.trim();
            if (termine) {
                cercaCatalogo();
            } else {
                caricaCatalogo();
            }
        } else {
            var errore = await risposta.json();
            showToast('Errore: ' + (errore.message || 'Impossibile aggiungere'), 'danger');
        }
    } catch (errore) {
        console.error('Errore aggiunta piatto:', errore);
        showToast('Errore di connessione', 'danger');
    }
}
