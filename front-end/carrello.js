let carrello = JSON.parse(localStorage.getItem("carrello")) || [];
const CLIENT_ID = localStorage.getItem('_id');

window.onload = () => {
    if (!CLIENT_ID) { alert("Login richiesto"); location.href='login.html'; return; }
    aggiornaCarrello();
};

function aggiornaCarrello() {
    const container = document.getElementById("carrelloContainer");
    const totaleEl = document.getElementById("totale");
    const checkoutEl = document.getElementById("checkoutSection");
    const azioniEl = document.getElementById("azioniCarrello");

    container.innerHTML = "";
    if (carrello.length === 0) {
        container.innerHTML = '<div class="alert alert-warning text-center">Carrello vuoto.</div>';
        if(checkoutEl) checkoutEl.style.display = 'none';
        if(azioniEl) azioniEl.style.display = 'none';
        return;
    }

    let totale = 0;
    carrello.forEach((p, i) => {
        const sub = (p.price || p.prezzo || 0) * p.quantita;
        totale += sub;
        container.innerHTML += `
            <div class="card mb-2 p-2 shadow-sm">
                <div class="d-flex justify-content-between align-items-center">
                    <div><b>${p.strMeal||p.nome}</b> <span class="text-muted">x${p.quantita}</span></div>
                    <div class="text-primary fw-bold">€${sub.toFixed(2)}</div>
                </div>
                <div class="text-end mt-1">
                    <button class="btn btn-sm btn-outline-secondary py-0" onclick="modifica(${i}, 1)">+</button>
                    <button class="btn btn-sm btn-outline-secondary py-0" onclick="modifica(${i}, -1)">-</button>
                    <button class="btn btn-sm btn-danger py-0" onclick="rimuovi(${i})">×</button>
                </div>
            </div>`;
    });
    if(totaleEl) totaleEl.innerText = totale.toFixed(2);
    if(azioniEl) azioniEl.style.display = 'block';
}

function modifica(i, q) {
    carrello[i].quantita += q;
    if (carrello[i].quantita < 1) carrello.splice(i, 1);
    salva();
}
function rimuovi(i) { carrello.splice(i, 1); salva(); }
function svuotaCarrello() { carrello = []; salva(); }
function salva() { localStorage.setItem("carrello", JSON.stringify(carrello)); aggiornaCarrello(); }

function mostraCheckout() {
    document.getElementById('checkoutSection').style.display = 'block';
    document.getElementById('checkoutSection').scrollIntoView({behavior:'smooth'});
    
    // Se è asporto, non serve l'indirizzo, calcola subito il preventivo
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    if(tipo === 'asporto') {
        calcolaPreventivo();
    }
}

function toggleIndirizzo() {
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    document.getElementById('divIndirizzo').style.display = (tipo === 'domicilio') ? 'block' : 'none';
    calcolaPreventivo(); 
}

async function calcolaPreventivo() {
    const indirizzo = document.getElementById('indirizzo').value;
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const btn = document.getElementById('btnPaga');
    const box = document.getElementById('boxPreventivo');

    // Se domicilio ma senza indirizzo, nascondi e disabilita
    if(tipo === 'domicilio' && !indirizzo) {
        box.style.display = 'none';
        btn.disabled = true;
        return;
    }

    // Calcolo totale piatti locale per visualizzazione
    let totPiatti = carrello.reduce((sum, p) => sum + ((p.price||0)*p.quantita), 0);

    const payload = {
        piatti: carrello,
        tipoConsegna: tipo,
        indirizzoConsegna: indirizzo,
        ristoranteId: carrello[0].ristoranteId
    };

    try {
        // Chiamata all'API di preventivo
        const res = await fetch('http://localhost:3000/ordine/preventivo', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const d = await res.json();

        // Aggiorna UI
        document.getElementById('prevPrep').innerText = d.tempoPreparazione + " min";
        document.getElementById('prevViaggio').innerText = d.tempoViaggio + " min";
        document.getElementById('prevCosto').innerText = "€" + d.costoConsegna.toFixed(2);
        
        const finale = totPiatti + d.costoConsegna;
        document.getElementById('prevTotale').innerText = "€" + finale.toFixed(2);

        box.style.display = 'block';
        btn.disabled = false; // Abilita pagamento
    } catch(e) { console.error(e); }
}

async function inviaOrdine() {
    let totPiatti = carrello.reduce((sum, p) => sum + ((p.price||0)*p.quantita), 0);
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const indirizzo = document.getElementById('indirizzo').value;

    const payload = {
        clienteId: CLIENT_ID,
        ristoranteId: carrello[0].ristoranteId,
        piatti: carrello,
        totale: totPiatti, 
        tipoConsegna: tipo,
        indirizzoConsegna: tipo === 'domicilio' ? indirizzo : null
    };

    const res = await fetch('http://localhost:3000/ordine', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
    });

    if(res.ok) {
        alert("Ordine confermato!");
        svuotaCarrello();
        window.location.href = 'cliente.html';
    } else {
        alert("Errore invio");
    }
}