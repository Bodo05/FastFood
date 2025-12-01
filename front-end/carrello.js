let carrello = JSON.parse(localStorage.getItem("carrello")) || [];
const CLIENT_ID = localStorage.getItem('_id');

window.onload = () => {
    if (!CLIENT_ID) {
        alert("Devi effettuare il login.");
        window.location.href = 'login.html';
        return;
    }
    aggiornaCarrello();
};

function aggiornaCarrello() {
    const container = document.getElementById("carrelloContainer");
    const totaleElement = document.getElementById("totale");
    const azioniDiv = document.getElementById("azioniCarrello");
    const checkoutDiv = document.getElementById("checkoutSection");
    
    container.innerHTML = "";
    
    if (carrello.length === 0) {
        container.innerHTML = '<div class="alert alert-warning text-center">Il carrello è vuoto. <a href="cliente.html">Torna al menu</a></div>';
        if(totaleElement) totaleElement.innerText = "0.00";
        if(azioniDiv) azioniDiv.style.display = 'none';
        if(checkoutDiv) checkoutDiv.style.display = 'none';
        return;
    }

    let totaleCalcolato = 0;

    carrello.forEach((piatto, index) => {
        const prezzo = parseFloat(piatto.price || piatto.prezzo || 0);
        const subtotale = prezzo * piatto.quantita;
        totaleCalcolato += subtotale;
        
        const card = document.createElement('div');
        card.className = 'card mb-3 shadow-sm';
        card.innerHTML = `
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <img src="${piatto.strMealThumb || piatto.thumb || 'https://via.placeholder.com/50'}" class="rounded me-3" style="width: 60px; height: 60px; object-fit: cover;">
                        <div>
                            <h6 class="mb-0">${piatto.strMeal || piatto.nome}</h6>
                            <small class="text-muted">€${prezzo.toFixed(2)} cad.</small>
                        </div>
                    </div>
                    <div class="d-flex align-items-center">
                        <button class="btn btn-sm btn-outline-secondary me-2" onclick="modificaQuantita(${index}, -1)">-</button>
                        <span class="fw-bold mx-2">${piatto.quantita}</span>
                        <button class="btn btn-sm btn-outline-secondary ms-2" onclick="modificaQuantita(${index}, 1)">+</button>
                        <button class="btn btn-sm btn-danger ms-4" onclick="rimuoviDalCarrello(${index})">&times;</button>
                    </div>
                </div>
                <div class="text-end mt-2 fw-bold text-primary">
                    Subtotale: €${subtotale.toFixed(2)}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    
    if(totaleElement) totaleElement.innerText = totaleCalcolato.toFixed(2);
    if(azioniDiv) azioniDiv.style.display = 'block';
}

function modificaQuantita(index, variazione) {
    carrello[index].quantita += variazione;
    if (carrello[index].quantita < 1) {
        rimuoviDalCarrello(index);
    } else {
        salvaEaggiorna();
    }
}

function rimuoviDalCarrello(index) {
    if(confirm('Rimuovere questo piatto?')) {
        carrello.splice(index, 1);
        salvaEaggiorna();
    }
}

function svuotaCarrello() {
    if(confirm('Svuotare tutto il carrello?')) {
        carrello = [];
        salvaEaggiorna();
    }
}

function salvaEaggiorna() {
    localStorage.setItem("carrello", JSON.stringify(carrello));
    aggiornaCarrello();
}

// --- FUNZIONI DI CHECKOUT ---

function mostraCheckout() {
    const checkout = document.getElementById('checkoutSection');
    checkout.style.display = 'block';
    // Scorrimento fluido verso il basso
    checkout.scrollIntoView({ behavior: 'smooth' });
}

function toggleIndirizzo() {
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const divIndirizzo = document.getElementById('divIndirizzo');
    const inputIndirizzo = document.getElementById('indirizzo');
    
    if (tipo === 'domicilio') {
        divIndirizzo.style.display = 'block';
        inputIndirizzo.required = true;
    } else {
        divIndirizzo.style.display = 'none';
        inputIndirizzo.required = false;
        inputIndirizzo.value = ''; // Pulisce se si sceglie asporto
    }
}

async function inviaOrdine() {
    const btn = document.querySelector('#formOrdine button[type="submit"]');
    const testoOriginale = btn.innerText;
    
    // Disabilita bottone per evitare doppi click
    btn.disabled = true;
    btn.innerText = "Elaborazione in corso...";

    // 1. Calcola Totale
    let totaleFinale = 0;
    carrello.forEach(p => totaleFinale += (p.price || p.prezzo || 0) * p.quantita);

    // 2. Recupera Dati dal Form
    const tipoConsegna = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const indirizzoConsegna = document.getElementById('indirizzo').value;
    const ristoranteId = carrello[0].ristoranteId;

    if (!ristoranteId) {
        alert("Errore dati ristorante. Riprova.");
        btn.disabled = false; btn.innerText = testoOriginale;
        return;
    }

    const payload = {
        clienteId: CLIENT_ID,
        ristoranteId: ristoranteId,
        piatti: carrello,
        totale: totaleFinale,
        tipoConsegna: tipoConsegna,
        indirizzoConsegna: tipoConsegna === 'domicilio' ? indirizzoConsegna : null
    };

    try {
        const res = await fetch('http://localhost:3000/ordine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            // Se c'è stato un calcolo del tempo viaggio, mostralo
            let msg = `Ordine inviato con successo!\nTotale pagato: €${totaleFinale.toFixed(2)}`;
            if(data.minutiTotali) {
                msg += `\nTempo stimato: ${data.minutiTotali} minuti.`;
            }
            alert(msg);
            
            // Pulisci e esci
            carrello = [];
            salvaEaggiorna();
            window.location.href = 'cliente.html';
        } else {
            alert("Errore: " + (data.message || "Impossibile inviare ordine"));
            btn.disabled = false; btn.innerText = testoOriginale;
        }
    } catch (e) {
        console.error(e);
        alert("Errore di connessione.");
        btn.disabled = false; btn.innerText = testoOriginale;
    }
}