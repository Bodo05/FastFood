//verifica che il ristoratore sia loggato
if (checkLogin('ristoratore') === false) throw new Error("Redirecting...");
var ristoratoreId = localStorage.getItem('_id');

//creo array vuoto che conterrà i piatti già nel menu
var piattiNelMenu = [];

//aspetto che la pagina sia caricata
document.addEventListener('DOMContentLoaded', function() {
    //chiamo le seguenti funzioni
    caricaPiattiMenu(); //prendo i piatti che ristoratore ha già
    caricaCatalogo(); //prendo i piatti disponibili dal database

    //se clicco il bottone chiama la funzione cerca catalogo
    document.getElementById('btnCerca').addEventListener('click', cercaCatalogo);
    
});


async function caricaPiattiMenu() {
    try {
        //prendo tramite API i piatti del ristoratore
        var risposta = await fetch(API_URL + '/ristoratore/' + ristoratoreId + '/piatti');
        var piatti = await risposta.json();
        
        //salvo i nomi dei piatti nell'array creato precedentemente
        piattiNelMenu = piatti.map(function(p) {
            return (p.nome || p.strMeal || '').toLowerCase();
        });

    } catch (errore) {
        console.error('Errore caricamento menu:', errore);
    }
}


async function caricaCatalogo() {
    var container = document.getElementById('catalogoContainer');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    try {
        //prendo dal databse tutti i piatti disponibili
        var risposta = await fetch(API_URL + '/catalog');
        var piatti = await risposta.json();

        //chiamo la funzione mostra piatti
        mostraPiatti(piatti);
    } catch (errore) {
        console.error('Errore caricamento catalogo:', errore);
        container.innerHTML = '<div class="alert alert-danger">Errore caricamento catalogo</div>';
    }
}

async function cercaCatalogo() {
    var termine = document.getElementById('inputRicerca').value.trim().toLowerCase();
    var container = document.getElementById('catalogoContainer');

    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    try {
        //prendo tutto il catalogo
        var risposta = await fetch(API_URL + '/catalog');
        
        if (!risposta.ok) {
            throw new Error("Errore nel recupero dei dati dal server");
        }

        var tuttiPiatti = await risposta.json();

        //se la ricerca è nulla mostro tutto
        if (!termine) {
            mostraPiatti(tuttiPiatti);
            return;
        }

        //filtro l'array dei piatti
        var piattiFiltrati = tuttiPiatti.filter(function(p) {
            var nome = (p.nome || p.strMeal || '').toLowerCase();
            var categoria = (p.categoria || p.strCategory || '').toLowerCase();
            
            //cerco se il termine è nel nome o nella categoria
            return nome.includes(termine) || categoria.includes(termine);
        });

        //chiamo mostra piatti passando i piatti che rispettano la mia ricerca
        mostraPiatti(piattiFiltrati);

    } catch (errore) {
        console.error('Errore ricerca:', errore);
        container.innerHTML = '<div class="alert alert-danger">Errore durante la ricerca: ' + errore.message + '</div>';
    }
}

function mostraPiatti(piatti) {
    var container = document.getElementById('catalogoContainer');
    container.innerHTML = '';

    //se piatti trovati 0, allora nessun piatto nel catalogo
    if (!piatti || piatti.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Nessun piatto trovato nel catalogo.</p>';
        return;
    }

    //altrimenti per ogni piatto
    piatti.forEach(function(piatto) {
        //salvo informazioni
        var nome = piatto.nome || piatto.strMeal || 'Senza nome';
        var categoria = piatto.categoria || piatto.strCategory || '';
        var immagine = piatto.thumb || piatto.strMealThumb || 'https://via.placeholder.com/150';
        var idPiatto = piatto._id || piatto.idMeal;

        var nomeNormalizzato = nome.toLowerCase();
        //verifico se è già nel menu
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
                        <!-- se non è giaPresente, condizione dopo :, aggiungo la possibilità di inserire prezzo -->
                        ? ''
                        : '<div class="input-group input-group-sm mt-2">' +
                            '<span class="input-group-text">€</span>' +
                            '<input type="number" class="form-control" id="prezzo-' + idPiatto + '" placeholder="Prezzo" min="0.01" step="0.01">' +
                          '</div>'
                    ) +
                '</div>' +
                '<div class="card-footer bg-white">' +
                    (giaPresente 
                        <!-- se è già presente pulsante grigio disabilitato, altrimenti verde e se schiacciato chiama aggiungiPiatto e i suoi parametri -->
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
 
//funzione che permette di aggiungere al database il piatto
async function aggiungiPiatto(idPiatto, nome, categoria, immagine) {
    //prendo il prezzo di input
    var inputPrezzo = document.getElementById('prezzo-' + idPiatto);
    var prezzo = inputPrezzo ? inputPrezzo.value : '';
    
    var prezzoNumero = parseFloat(prezzo);
    //controllo validità del valore inserito
    if (isNaN(prezzoNumero) || prezzoNumero <= 0) {
        showToast('Inserisci un prezzo valido per "' + nome + '"', 'warning');
        if (inputPrezzo) inputPrezzo.focus();
        return;
    }

    //preparo oggetto che poi andrà al database
    var datiPiatto = {
        piatto: {
            nome: nome,
            prezzo: prezzoNumero,
            categoria: categoria,
            thumb: immagine,
            strMeal: nome,
            strCategory: categoria,
            strMealThumb: immagine,
            idCatalog: idPiatto 
        }
    };

    try {
        //eseguo chiamata in post verso la seguente rotta per salvare i dati nel database
        var risposta = await fetch(API_URL + '/ristoratore/' + ristoratoreId + '/piatti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datiPiatto)
        });

        if (risposta.ok) {
            showToast('Piatto "' + nome + '" aggiunto al menu!', 'success');
            
            //aggiorno l'array iniziale aggiungendo il piatto appena inserito nel menu
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
