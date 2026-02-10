if (checkLogin('cliente') === false) {
    throw new Error("Redirecting...");
}

const CLIENT_ID = localStorage.getItem('_id');
let carrello = JSON.parse(localStorage.getItem("carrello")) || [];

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

function toggleIndirizzo() {
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const div = document.getElementById('divIndirizzo');
    const box = document.getElementById('boxPreventivo');
    
    if (tipo === 'domicilio') {
        div.style.display = 'block';
    } else {
        div.style.display = 'none';
        box.style.display = 'none';
    }
}


async function caricaDatiSalvati() {
    try {
        const risposta = await fetch(API_URL + '/cliente/' + CLIENT_ID);
        const utente = await risposta.json();
        
        console.log("Dati scaricati:", utente);

        // Imposta Metodo Pagamento
        if (utente.metodoPagamento) {
            const select = document.getElementById('selectMetodoPagamento');
            if(select) select.value = utente.metodoPagamento;
        }

        // Imposta Dati Carta
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

// 2. Calcolo visivo costi (Simulato nel frontend)
async function calcolaPreventivo() {
    const indirizzo = document.getElementById('indirizzo').value.trim();
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    
    if (tipo !== 'domicilio' || !indirizzo) return;

    let totCibo = 0;
    carrello.forEach(p => totCibo += (p.price * p.quantita));

    document.getElementById('boxPreventivo').style.display = 'block';
    document.getElementById('prevCibo').innerText = '€' + totCibo.toFixed(2);
    document.getElementById('prevCosto').innerText = '(Calcolato al pagamento)';
    document.getElementById('prevTotale').innerText = 'Totale Cibo + Spedizione';
}

// 3. Invio Ordine
async function inviaOrdine(e) {
    if(e) e.preventDefault();

    const btn = document.getElementById('btnPaga');
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const indirizzo = document.getElementById('indirizzo').value.trim();
    
    // Leggi i valori (che l'utente potrebbe aver modificato)
    const metodo = document.getElementById('selectMetodoPagamento').value;
    const numCarta = document.getElementById('numeroCarta').value.replace(/\s/g, '');
    const scadenza = document.getElementById('scadenzaCarta').value;
    const cvv = document.getElementById('cvvCarta').value;

    // Validazioni
    if (tipo === 'domicilio' && !indirizzo) {
        showToast("Inserisci l'indirizzo di consegna", "warning");
        return;
    }
    
    if (!/^\d{16}$/.test(numCarta)) {
        showToast("Numero carta non valido (servono 16 cifre)", "warning");
        return;
    }
    if (!scadenza || !cvv) {
        showToast("Completa i dati di scadenza e CVV", "warning");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Elaborazione...';

    let totPiatti = 0;
    carrello.forEach(p => totPiatti += (p.price * p.quantita));

    try {
        const payload = {
            clienteId: CLIENT_ID,
            ristoranteId: carrello[0].ristoranteId,
            piatti: carrello,
            totale: totPiatti,
            tipoConsegna: tipo,
            indirizzoConsegna: tipo === 'domicilio' ? indirizzo : null,
            // Inviamo i dati del pagamento scelti al momento
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
            showToast("✅ Pagamento riuscito! Ordine inviato.", "success");
            localStorage.removeItem("carrello");
            setTimeout(() => window.location.href = 'cliente.html', 2500);
        } else {
            const err = await risposta.json();
            showToast("Errore: " + (err.message || "Problema col server"), "danger");
            btn.disabled = false;
            btn.innerText = "PAGAMENTO SICURO E ORDINA";
        }

    } catch (errore) {
        console.error(errore);
        showToast("Errore di connessione", "danger");
        btn.disabled = false;
        btn.innerText = "PAGAMENTO SICURO E ORDINA";
    }
}