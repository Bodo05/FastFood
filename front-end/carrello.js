let carrello = JSON.parse(localStorage.getItem("carrello")) || [];
const CLIENT_ID = localStorage.getItem('_id');

window.onload = () => {
    if (!CLIENT_ID) { 
        // Nota: qui alert va bene perché è un redirect bloccante, 
        // oppure usa showToast ma devi aspettare prima del redirect
        alert("Login richiesto"); 
        location.href='login.html'; return; 
    }
    aggiornaCarrello();
    toggleIndirizzo(); 
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
    const gruppi = carrello.reduce((acc, item) => {
        const key = item.ristoranteId;
        if (!acc[key]) acc[key] = { id: key, nome: item.ristoranteNome, piatti: [] };
        acc[key].piatti.push(item);
        return acc;
    }, {});

    Object.values(gruppi).forEach(gruppo => {
        let htmlPiatti = '';
        gruppo.piatti.forEach(p => {
            const sub = (p.price || p.prezzo || 0) * p.quantita;
            totale += sub;
            htmlPiatti += `
                <li class="list-group-item d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center">
                        <img src="${p.strMealThumb || 'https://via.placeholder.com/50'}" class="rounded me-3" style="width: 50px; height: 50px; object-fit: cover;">
                        <span class="badge bg-secondary me-2">${p.quantita}x</span>
                        <strong>${p.strMeal || p.nome}</strong>
                    </div>
                    <div>
                        <span>€${sub.toFixed(2)}</span>
                        <button class="btn btn-sm btn-outline-secondary ms-2 me-1 py-0" onclick="modifica('${p.idMeal}', 1)">+</button>
                        <button class="btn btn-sm btn-outline-secondary py-0" onclick="modifica('${p.idMeal}', -1)">-</button>
                    </div>
                </li>`;
        });
        container.innerHTML += `<ul class="list-group mb-3">${htmlPiatti}</ul>`;
    });

    if(totaleEl) totaleEl.innerText = totale.toFixed(2);
    if(azioniEl) azioniEl.style.display = 'block';
}

function trovaIndice(idMeal) { return carrello.findIndex(item => item.idMeal === idMeal); }
function modifica(idMeal, q) {
    const i = trovaIndice(idMeal);
    if (i !== -1) { carrello[i].quantita += q; if (carrello[i].quantita < 1) carrello.splice(i, 1); salva(); }
}
function rimuovi(idMeal) { const i = trovaIndice(idMeal); if (i !== -1) carrello.splice(i, 1); salva(); }
function svuotaCarrello() { carrello = []; salva(); }
function salva() { localStorage.setItem("carrello", JSON.stringify(carrello)); aggiornaCarrello(); calcolaPreventivo(); }

function mostraCheckout() {
    document.getElementById('checkoutSection').style.display = 'block';
    document.getElementById('checkoutSection').scrollIntoView({behavior:'smooth'});
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    if(tipo === 'asporto') calcolaPreventivo();
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
    const totPiatti = carrello.reduce((sum, p) => sum + ((p.price||0)*p.quantita), 0);

    box.style.display = 'none';
    btn.disabled = true;

    if (carrello.length === 0) return;
    if(tipo === 'domicilio' && indirizzo.length < 5) return;

    const payload = { piatti: carrello, tipoConsegna: tipo, indirizzoConsegna: indirizzo, ristoranteId: carrello[0].ristoranteId };

    try {
        const res = await fetch('http://localhost:3000/ordine/preventivo', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        const d = await res.json();

        document.getElementById('prevPrep').innerText = d.tempoPreparazione + " min";
        document.getElementById('prevViaggio').innerText = d.tempoViaggio + " min";
        document.getElementById('prevCosto').innerText = "€" + d.costoConsegna.toFixed(2);
        
        const finale = totPiatti + d.costoConsegna;
        document.getElementById('prevTotale').innerText = "€" + finale.toFixed(2);

        box.style.display = 'block';
        btn.disabled = false;
    } catch(e) { console.error(e); }
}

async function inviaOrdine() {
    const btn = document.querySelector('#formOrdine button[type="submit"]');
    const testoOriginale = btn.innerText;
    
    btn.disabled = true;
    btn.innerText = "Invio...";

    let totPiatti = carrello.reduce((sum, p) => sum + ((p.price||0)*p.quantita), 0);
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const indirizzo = document.getElementById('indirizzo').value;

    const payload = {
        clienteId: CLIENT_ID, ristoranteId: carrello[0].ristoranteId,
        piatti: carrello, totale: totPiatti, tipoConsegna: tipo,
        indirizzoConsegna: tipo === 'domicilio' ? indirizzo : null
    };

    try {
        const res = await fetch('http://localhost:3000/ordine', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });

        if(res.ok) {
            showToast("Ordine confermato! Grazie.", "success");
            svuotaCarrello();
            setTimeout(() => window.location.href = 'cliente.html', 2000);
        } else {
            showToast("Errore invio ordine", "danger");
            btn.disabled = false; btn.innerText = testoOriginale;
        }
    } catch(e) {
        showToast("Errore connessione", "danger");
        btn.disabled = false; btn.innerText = testoOriginale;
    }
}