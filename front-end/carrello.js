const CLIENT_ID = localStorage.getItem('_id');
if (!CLIENT_ID) {
    alert("Login richiesto");
    window.location.href = 'login.html';
}

let carrello = JSON.parse(localStorage.getItem("carrello")) || [];

window.onload = function() {
    aggiornaCarrello();
    toggleIndirizzo();
};

function aggiornaCarrello() {
    const container = document.getElementById("carrelloContainer");
    const totaleEl = document.getElementById("totale");
    const azioniEl = document.getElementById("azioniCarrello");
    const checkoutEl = document.getElementById("checkoutSection");

    container.innerHTML = "";

    //nell'HTML imposto a display none, cosi poi da qui posso mostrare se carrello non è vuoto
    if (carrello.length === 0) {
        container.innerHTML = '<div class="alert alert-warning text-center">Carrello vuoto.</div>';
        azioniEl.style.display = 'none';
        checkoutEl.style.display = 'none';
        return;
    }

    let totale = 0;
    
    // i due bottoni alla fine chiamano la funzione di modifica quantità passando 1 se aggiunto 1 piatto o - 1 se togli 1 piatto
    carrello.forEach(function(p) {
        const subtotale = (p.price || 0) * p.quantita;
        totale += subtotale;
        //aggiungo le card dei piatti con i vari dettagli nel container
        container.innerHTML += `
            <div class="card mb-2">
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${p.strMeal}</strong>
                        <span class="badge bg-secondary ms-2">${p.quantita}x</span>
                    </div>
                    <div>
                        <span class="me-3">€${subtotale.toFixed(2)}</span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="modificaQuantita('${p.idMeal}', 1)">+</button> 
                        <button class="btn btn-sm btn-outline-secondary" onclick="modificaQuantita('${p.idMeal}', -1)">-</button>
                    </div>
                </div>
            </div>
        `;
    });

    totaleEl.innerText = totale.toFixed(2);
    azioniEl.style.display = 'block';
}

function modificaQuantita(idMeal, variazione) {
    const index = carrello.findIndex(function(item) {
        return item.idMeal === idMeal;
    });
    
    if (index !== -1) {
        carrello[index].quantita += variazione;
        
        if (carrello[index].quantita < 1) {
            carrello.splice(index, 1);
        }
        
        salvaCarrello();
    }
}

// svuoto il mio array e chiamo salvacarrello per salvare il lacalstorage carrello come vuoto
function svuotaCarrello() {
    carrello = [];
    salvaCarrello();
}

function salvaCarrello() {
    localStorage.setItem("carrello", JSON.stringify(carrello));
    aggiornaCarrello();
    calcolaPreventivo();
}

function mostraCheckout() {
    document.getElementById('checkoutSection').style.display = 'block';
    calcolaPreventivo();
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
    
    if (carrello.length === 0) return;
    
    let totPiatti = 0;
    carrello.forEach(function(p) {
        totPiatti += (p.price || 0) * p.quantita;
    });

    box.style.display = 'none';
    btn.disabled = true;

    if (tipo === 'domicilio' && indirizzo.length < 5) return;

    try {
        const risposta = await fetch(API_URL + '/ordine/preventivo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                piatti: carrello,
                tipoConsegna: tipo,
                indirizzoConsegna: indirizzo,
                ristoranteId: carrello[0].ristoranteId
            })
        });
        
        const dati = await risposta.json();

        document.getElementById('prevPrep').innerText = dati.tempoPreparazione + " min";
        document.getElementById('prevViaggio').innerText = dati.tempoViaggio + " min";
        document.getElementById('prevCosto').innerText = "€" + dati.costoConsegna.toFixed(2);
        document.getElementById('prevTotale').innerText = "€" + (totPiatti + dati.costoConsegna).toFixed(2);

        box.style.display = 'block';
        btn.disabled = false;
        
    } catch (errore) {
        console.error(errore);
    }
}

async function inviaOrdine() {
    const btn = document.getElementById('btnPaga');
    btn.disabled = true;
    btn.innerText = "Invio...";

    let totPiatti = 0;
    carrello.forEach(function(p) {
        totPiatti += (p.price || 0) * p.quantita;
    });

    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const indirizzo = document.getElementById('indirizzo').value;

    try {
        const risposta = await fetch(API_URL + '/ordine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clienteId: CLIENT_ID,
                ristoranteId: carrello[0].ristoranteId,
                piatti: carrello,
                totale: totPiatti,
                tipoConsegna: tipo,
                indirizzoConsegna: tipo === 'domicilio' ? indirizzo : null
            })
        });

        if (risposta.ok) {
            showToast("Ordine confermato! Grazie.", "success");
            svuotaCarrello();
            setTimeout(function() {
                window.location.href = 'cliente.html';
            }, 2000);
        } else {
            showToast("Errore nell'invio dell'ordine", "danger");
            btn.disabled = false;
            btn.innerText = "CONFERMA ORDINE";
        }
    } catch (errore) {
        showToast("Errore di connessione", "danger");
        btn.disabled = false;
        btn.innerText = "CONFERMA ORDINE";
    }
}