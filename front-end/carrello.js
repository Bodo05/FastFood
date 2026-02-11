if (checkLogin('cliente') === false) {
    throw new Error("Redirecting...");
}

const CLIENT_ID = localStorage.getItem('_id');
let carrello = JSON.parse(localStorage.getItem("carrello")) || [];
let costoSpedizioneAttuale = 0;

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

    if (carrello.length === 0) {
        container.innerHTML = '<div class="alert alert-warning text-center">Il tuo carrello è vuoto.</div>';
        azioniEl.style.display = 'none';
        checkoutEl.style.display = 'none';
        return;
    }

    let totale = 0;
    
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

function modificaQuantita(id, delta) {
    const item = carrello.find(i => i.idMeal === id);
    if (item) {
        item.quantita += delta;
        if (item.quantita <= 0) {
            carrello = carrello.filter(i => i.idMeal !== id);
        }
        localStorage.setItem("carrello", JSON.stringify(carrello));
        aggiornaCarrello();
    }
}

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

//funzione che permette di mostrare o meno la possibilità di inserire
//l'indirizzo di consegna in base alla selection usata
function toggleIndirizzo() {
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const div = document.getElementById('divIndirizzo');
    const box = document.getElementById('boxPreventivo');
    
    if (tipo === 'domicilio') {
        div.style.display = 'block';
    } else {
        div.style.display = 'none';
        box.style.display = 'none';
        costoSpedizioneAttuale = 0;
        aggiornaTotaleVisivo();
    }
}

async function caricaDatiSalvati() {
    try {
        const risposta = await fetch(API_URL + '/cliente/' + CLIENT_ID);
        const utente = await risposta.json();
        
        console.log("Dati scaricati:", utente);

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
    const indirizzo = document.getElementById('indirizzo').value.trim();
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const box = document.getElementById('boxPreventivo');

    if (tipo !== 'domicilio') {
        costoSpedizioneAttuale = 0;
        box.style.display = 'none';
        aggiornaTotaleVisivo();
        return;
    }

    if (!indirizzo) return;

    try {
        const res = await fetch(API_URL + '/preventivo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                indirizzo: indirizzo,
                ristoranteId: carrello[0].ristoranteId
            })
        });

        if (res.ok) {
            const dati = await res.json();
            costoSpedizioneAttuale = parseFloat(dati.costo);

            box.style.display = 'block';
            document.getElementById('prevCosto').innerText = '€' + costoSpedizioneAttuale.toFixed(2);
            aggiornaTotaleVisivo();
        }
    } catch (e) {
        console.error(e);
    }
}

function aggiornaTotaleVisivo() {
    let totCibo = 0;
    carrello.forEach(p => totCibo += (p.price * p.quantita));
    
    const totFinale = totCibo + costoSpedizioneAttuale;

    const prevCibo = document.getElementById('prevCibo');
    const prevTotale = document.getElementById('prevTotale');
    const totaleEl = document.getElementById('totale');

    if (prevCibo) prevCibo.innerText = '€' + totCibo.toFixed(2);
    if (prevTotale) prevTotale.innerText = '€' + totFinale.toFixed(2);
    if (totaleEl) totaleEl.innerText = totFinale.toFixed(2);
}

async function inviaOrdine(e) {
    if(e) e.preventDefault();

    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const indirizzo = document.getElementById('indirizzo').value.trim();
    
    const metodo = document.getElementById('selectMetodoPagamento').value;
    const numCarta = document.getElementById('numeroCarta').value.replace(/\s/g, '');
    const scadenza = document.getElementById('scadenzaCarta').value;
    const cvv = document.getElementById('cvvCarta').value;

    if (tipo === 'domicilio' && !indirizzo) {
        showToast("Inserisci indirizzo", "warning");
        return;
    }
    
    if (!/^\d{16}$/.test(numCarta)) {
        showToast("Numero carta non valido", "warning");
        return;
    }
    if (!scadenza || !cvv) {
        showToast("Dati carta incompleti", "warning");
        return;
    }

    if (tipo === 'domicilio' && costoSpedizioneAttuale === 0) {
        await calcolaPreventivo();
        if (costoSpedizioneAttuale === 0) {
            showToast("Indirizzo non valido per la consegna", "danger");
            return;
        }
    }

    let totPiatti = 0;
    carrello.forEach(p => totPiatti += (p.price * p.quantita));
    const totaleFinale = totPiatti + costoSpedizioneAttuale;

    const messaggio = `Riepilogo Ordine:
    
Cibo: €${totPiatti.toFixed(2)}
Spedizione: €${costoSpedizioneAttuale.toFixed(2)}
---------------------
TOTALE: €${totaleFinale.toFixed(2)}

Vuoi procedere al pagamento?`;

    if (!confirm(messaggio)) {
        return; 
    }

    const btn = document.getElementById('btnPaga');
    btn.disabled = true;

    try {
        const payload = {
            clienteId: CLIENT_ID,
            ristoranteId: carrello[0].ristoranteId,
            piatti: carrello,
            totale: totaleFinale,
            costoSpedizione: costoSpedizioneAttuale,
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
            showToast("Ordine Inviato!", "success");
            localStorage.removeItem("carrello");
            setTimeout(() => window.location.href = 'cliente.html', 2000);
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