//controllo che il cliente sia loggato
if (checkLogin('cliente') === false) {
    throw new Error("Redirecting...");
}

const CLIENT_ID = localStorage.getItem('_id');
let carrello = JSON.parse(localStorage.getItem("carrello")) || [];
let costoSpedizioneAttuale = 0;
//variabile per sapere se l'indirizzo è confermato col bottone
let indirizzoConfermato = false; 

//a schermata caricata chiamo seguenti funzioni
window.onload = function() {
    aggiornaCarrello();
    toggleIndirizzo();
    caricaDatiSalvati(); 
};

function aggiornaCarrello() {
    const container = document.getElementById("carrelloContainer");
    const totaleEl = document.getElementById("totale");
    const azioniEl = document.getElementById("azioniCarrello");
    const checkoutEl = document.getElementById("checkoutSection");

    container.innerHTML = "";
    //controllo che carrello non sia vuoto
    if (carrello.length === 0) {
        container.innerHTML = '<div class="alert alert-warning text-center">Il tuo carrello è vuoto.</div>';
        azioniEl.style.display = 'none';
        checkoutEl.style.display = 'none';
        return;
    }

    let totale = 0;
    
    //altrimenti per ogni oggetto nel localstorage (carrello) calcolo il totale e creo card dell'oggetto con bottoni per modificare quantità
    carrello.forEach(function(p) {
        const subtotale = (p.price || 0) * p.quantita;
        totale += subtotale;

        const card = document.createElement('div');
        card.className = 'card mb-3 shadow-sm border-0';
        card.innerHTML = `
            <div class="row g-0 align-items-center p-2">
                <div class="col-3 col-md-2">
                    <img src="${p.strMealThumb}" class="img-fluid rounded" style="height: 80px; object-fit: cover; width: 100%;">
                </div>
                <div class="col-9 col-md-6">
                    <div class="card-body p-2">
                        <h6 class="card-title mb-1">${p.strMeal}</h6>
                        <small class="text-muted">€${p.price.toFixed(2)} cad.</small>
                    </div>
                </div>
                <div class="col-12 col-md-4 text-end mt-2 mt-md-0">
                    <div class="d-flex align-items-center justify-content-end">
                        <button class="btn btn-sm btn-light border me-2" onclick="modificaQuantita('${p.idMeal}', -1)">-</button>
                        <span class="fw-bold mx-2">${p.quantita}</span>
                        <button class="btn btn-sm btn-light border ms-2" onclick="modificaQuantita('${p.idMeal}', 1)">+</button>
                        <span class="fw-bold ms-4">€${subtotale.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    totaleEl.innerText = totale.toFixed(2);
    azioniEl.style.display = 'flex';
}

//cerco il piatto tramite id
function modificaQuantita(id, delta) {
    var item = null;
    var indice = -1;

    for (var i = 0; i < carrello.length; i++) {
        if (carrello[i].idMeal === id) {
            item = carrello[i];
            indice = i; //salvo la posizione per poterlo cancellare dopo
            break; 
        }
    }
    if (item) {
        item.quantita += delta;
        //se quantità minore o uguale a 0 scarto il prodotto dalla lista carrello 
        //la funzione filter prende la lista originale, la filtra creandone una nuova
        if (item.quantita <= 0) {
            carrello = carrello.filter(i => i.idMeal !== id);
        }
        localStorage.setItem("carrello", JSON.stringify(carrello));
        aggiornaCarrello();
        //se modifico quantità ricalcolo anche preventivo se c'è indirizzo
        if(indirizzoConfermato) calcolaPreventivo();
    }
}

//libera local storage carrello per fare si che non ci siano piu piatti nel carrello virtuale
function svuotaCarrello() {
    if(confirm("Svuotare il carrello?")) {
        carrello = [];
        localStorage.removeItem("carrello");
        aggiornaCarrello();
    }
}

function mostraCheckout() {
    document.getElementById('checkoutSection').style.display = 'block';
    document.getElementById('checkoutSection').scrollIntoView({ behavior: 'smooth' });
}

function toggleIndirizzo() {
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const div = document.getElementById('divIndirizzo');
    const btnPaga = document.getElementById('btnPaga');

    if (tipo === 'domicilio') {
        div.style.display = 'block';

        if (!indirizzoConfermato) {
            btnPaga.disabled = true;
        }

    } else { 
        // ASPORTO
        div.style.display = 'none';
        indirizzoConfermato = true; 
        btnPaga.disabled = false;

        // Calcolo subito il tempo stimato
        calcolaPreventivo();
    }
}


//chiamata dal bottone inserisci
async function confermaIndirizzoManuale() {
    const indirizzo = document.getElementById('indirizzo').value.trim();
    const msg = document.getElementById('msgIndirizzo');

    if (!indirizzo) {
        alert("Scrivi un indirizzo valido");
        return;
    }

    await calcolaPreventivo();

    indirizzoConfermato = true;
    msg.style.display = 'block';
    msg.innerText = "Indirizzo confermato: " + indirizzo;
    document.getElementById('btnPaga').disabled = false;
}

async function caricaDatiSalvati() {
    try {
        //tramite api di get riesco a prendere i dati del cliente per riempire i campi con le sue informazioni
        const risposta = await fetch(API_URL + '/cliente/' + CLIENT_ID);
        const utente = await risposta.json();
        
        if (utente.metodoPagamento) {
            const select = document.getElementById('selectMetodoPagamento');
            if(select) select.value = utente.metodoPagamento;
        }

        if (utente.datiCarta) {
            const num = document.getElementById('numeroCarta');
            const scad = document.getElementById('scadenzaCarta');
            const cv = document.getElementById('cvvCarta');

            if(num) num.value = utente.datiCarta.numero || '';
            if(scad) scad.value = utente.datiCarta.scadenza || '';
            if(cv) cv.value = utente.datiCarta.cvv || '';
        }

    } catch (error) {
        console.error("Errore caricamento profilo:", error);
    }
}

async function calcolaPreventivo() {

    if (carrello.length === 0) return;

    const indirizzo = document.getElementById('indirizzo').value.trim();
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const box = document.getElementById('boxPreventivo');

    const elCosto = document.getElementById('prevCosto');
    const elOrario = document.getElementById('prevOrario');

    // Mostro box e stato loading
    box.style.display = 'block';
    elCosto.innerText = '...';
    elOrario.innerText = 'Calcolo...';

    try {

        const res = await fetch(API_URL + '/preventivo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                indirizzo: tipo === 'domicilio' ? indirizzo : null,
                ristoranteId: carrello[0].ristoranteId,
                piatti: carrello,
                tipo: tipo
            })
        });

        if (!res.ok) {
            const err = await res.json();
            showToast(err.message || "Errore preventivo", "warning");
            box.style.display = 'none';
            return;
        }

        const dati = await res.json();

        // Spedizione
        costoSpedizioneAttuale = parseFloat(dati.costo) || 0;
        elCosto.innerText = '€' + costoSpedizioneAttuale.toFixed(2);

        // Orario pronto
        elOrario.innerHTML =
            dati.orario +
            ' <small class="text-muted fw-normal">(tra ' +
            dati.minutiTotali +
            ' min)</small>';

        aggiornaTotaleVisivo();

    } catch (e) {
        console.error(e);
        showToast("Errore calcolo preventivo", "danger");
        box.style.display = 'none';
    }
}


function aggiornaTotaleVisivo() {
    let totCibo = 0;

    carrello.forEach(p => totCibo += (p.price * p.quantita));
    
    const totFinale = totCibo + costoSpedizioneAttuale;

    const prevCibo = document.getElementById('prevCibo');
    const prevTotale = document.getElementById('prevTotale');
    
    if (prevCibo) prevCibo.innerText = '€' + totCibo.toFixed(2);
    if (prevTotale) prevTotale.innerText = '€' + totFinale.toFixed(2);
}

async function inviaOrdine(e) {
    if(e) e.preventDefault();

    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const indirizzo = document.getElementById('indirizzo').value.trim();
    const btn = document.getElementById('btnPaga');
    
    //controlli validazione
    const metodo = document.getElementById('selectMetodoPagamento').value;
    const numCarta = document.getElementById('numeroCarta').value.replace(/\s/g, '');
    const scadenza = document.getElementById('scadenzaCarta').value;
    const cvv = document.getElementById('cvvCarta').value;

    if (tipo === 'domicilio' && !indirizzoConfermato) {
        alert("Clicca su Inserisci per confermare l'indirizzo.");
        return;
    }
    
    if (!/^\d{16}$/.test(numCarta)) {
        showToast("Numero carta non valido", "warning");
        return;
    }

    let totPiatti = 0;
    carrello.forEach(p => totPiatti += (p.price * p.quantita));

    btn.disabled = true;

    try {
        const payload = {
            clienteId: CLIENT_ID,
            ristoranteId: carrello[0].ristoranteId,
            piatti: carrello,
            totale: totPiatti,
            tipoConsegna: tipo,
            indirizzoConsegna: tipo === 'domicilio' ? indirizzo : null,
            datiPagamento: {
                metodo: metodo,
                numero: numCarta,
                scadenza: scadenza,
                cvv: cvv
            }
        };

        const risposta = await fetch(API_URL + '/ordine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (risposta.ok) {
            const datiOrdine = await risposta.json();
            localStorage.removeItem("carrello");

            const main = document.getElementById('mainContainer');
            main.innerHTML = `
                <div class="text-center py-5">
                    <h2 class="mb-4">Grazie per il tuo ordine!</h2>
                    <p class="lead">Abbiamo ricevuto la tua richiesta di <strong>€${parseFloat(datiOrdine.totaleFinale).toFixed(2)}</strong>.</p>
                    <p class="text-muted">Il tuo cibo arriverà presto.</p>
                    <a href="cliente.html" class="btn btn-primary mt-4">Torna alla Home</a>
                </div>
            `;
            
        } else {
            const err = await risposta.json();
            showToast("Errore: " + err.message, "danger");
            btn.disabled = false;
        }

    } catch (errore) {
        console.error(errore);
        showToast("Errore di connessione", "danger");
        btn.disabled = false;
    }
}