if (checkLogin('ristoratore') === false) throw new Error("Redirecting...");
var ristoratoreId = localStorage.getItem('_id');

var piattiNelMenu = [];

document.addEventListener('DOMContentLoaded', function() {
    caricaPiattiMenu();
    caricaCatalogo();
    document.getElementById('btnCerca').addEventListener('click', cercaCatalogo);
});

async function caricaPiattiMenu() {
    try {
        var risposta = await fetch(API_URL + '/ristoratore/' + ristoratoreId + '/piatti');
        var piatti = await risposta.json();
        
        piattiNelMenu = [];
        for (var i = 0; i < piatti.length; i++) {
            var p = piatti[i];
            var nomePiatto = (p.nome || p.strMeal || '').toLowerCase();
            piattiNelMenu.push(nomePiatto);
        }
    } catch (errore) {
        console.error('Errore caricamento menu:', errore);
    }
}

async function caricaCatalogo() {
    var container = document.getElementById('catalogoContainer');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    try {
        var risposta = await fetch(API_URL + '/catalog');
        var piatti = await risposta.json();
        mostraPiatti(piatti);
    } catch (errore) {
        container.innerHTML = '<div class="alert alert-danger">Errore caricamento catalogo</div>';
    }
}

async function cercaCatalogo() {
    var termine = document.getElementById('inputRicerca').value.trim().toLowerCase();
    var container = document.getElementById('catalogoContainer');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    try {
        var risposta = await fetch(API_URL + '/catalog');
        if (!risposta.ok) throw new Error("Errore nel recupero dei dati dal server");

        var tuttiPiatti = await risposta.json();

        if (!termine) {
            mostraPiatti(tuttiPiatti);
            return;
        }

        var piattiFiltrati = [];
        for (var i = 0; i < tuttiPiatti.length; i++) {
            var p = tuttiPiatti[i];
            var nome = (p.nome || p.strMeal || '').toLowerCase();
            var categoria = (p.categoria || p.strCategory || '').toLowerCase();

            if (nome.includes(termine) || categoria.includes(termine)) {
                piattiFiltrati.push(p);
            }
        }

        mostraPiatti(piattiFiltrati);

    } catch (errore) {
        container.innerHTML = '<div class="alert alert-danger">Errore durante la ricerca</div>';
    }
}

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

        var listaIngredienti = [];
        var ingredientiObj = {};

        for (var k = 1; k <= 20; k++) {
            var ing = piatto['strIngredient' + k];
            if (ing && ing.trim() !== "") {
                listaIngredienti.push(ing.trim());
                ingredientiObj['strIngredient' + k] = ing.trim();
            }
        }

        var ingredientiString = listaIngredienti.join(', ');
        var ingredientiEncoded = encodeURIComponent(JSON.stringify(ingredientiObj));
        var nomeNormalizzato = nome.toLowerCase();

        var giaPresente = false;
        for (var j = 0; j < piattiNelMenu.length; j++) {
            if (piattiNelMenu[j] === nomeNormalizzato) {
                giaPresente = true;
                break;
            }
        }

        var htmlPrezzo = '';
        var htmlBottone = '';

        if (giaPresente) {
            htmlBottone = '<button class="btn btn-sm btn-secondary w-100" disabled>Già nel menu</button>';
        } else {
            htmlPrezzo = '<div class="input-group input-group-sm mt-2">' +
                            '<span class="input-group-text">€</span>' +
                            '<input type="number" class="form-control" id="prezzo-' + idPiatto + '" placeholder="Prezzo" min="0.01" step="0.01">' +
                         '</div>';

            var nomeOk = nome.replace(/'/g, "\\'");
            var catOk = categoria.replace(/'/g, "\\'");

            htmlBottone = '<button class="btn btn-sm btn-success w-100" onclick="aggiungiPiatto(\'' 
                + idPiatto + '\', \'' 
                + nomeOk + '\', \'' 
                + catOk + '\', \'' 
                + immagine + '\', \'' 
                + ingredientiEncoded + '\')">+ Aggiungi al menu</button>';
        }

        var card = document.createElement('div');
        card.className = 'col-md-3 mb-3';

        card.innerHTML =
            '<div class="card h-100 shadow-sm">' +
                '<img src="' + immagine + '" class="card-img-top" style="height:150px; object-fit:cover">' +
                '<div class="card-body">' +
                    '<h6 class="card-title">' + nome + '</h6>' +
                    '<small class="text-muted">' + categoria + '</small>' +
                    htmlPrezzo +
                '</div>' +
                '<div class="card-footer bg-white">' +
                    htmlBottone +
                '</div>' +
            '</div>';

        container.appendChild(card);
    });
}

async function aggiungiPiatto(idPiatto, nome, categoria, immagine, ingredientiEncoded) {
    var inputPrezzo = document.getElementById('prezzo-' + idPiatto);
    var prezzo = inputPrezzo ? inputPrezzo.value : '';

    var prezzoNumero = parseFloat(prezzo);

    if (isNaN(prezzoNumero) || prezzoNumero <= 0) {
        showToast('Inserisci un prezzo valido per "' + nome + '"', 'warning');
        if (inputPrezzo) inputPrezzo.focus();
        return;
    }

    var ingredientiObj = {};
    if (ingredientiEncoded) {
        ingredientiObj = JSON.parse(decodeURIComponent(ingredientiEncoded));
    }

    var datiPiatto = {
        piatto: {
            nome: nome,
            prezzo: prezzoNumero,
            categoria: categoria,
            thumb: immagine,
            ingredienti: Object.values(ingredientiObj).join(', '),
            strMeal: nome,
            strCategory: categoria,
            strMealThumb: immagine,
            idCatalog: idPiatto,
            ...ingredientiObj
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
            piattiNelMenu.push(nome.toLowerCase());

            var termine = document.getElementById('inputRicerca').value.trim();
            if (termine) {
                cercaCatalogo();
            } else {
                caricaCatalogo();
            }
        } else {
            showToast('Errore aggiunta piatto', 'danger');
        }
    } catch (errore) {
        showToast('Errore di connessione', 'danger');
    }
}
