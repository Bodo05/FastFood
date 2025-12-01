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
    
    container.innerHTML = "";
    
    if (carrello.length === 0) {
        container.innerHTML = '<div class="alert alert-warning text-center">Il carrello è vuoto. <a href="cliente.html">Torna al menu</a></div>';
        if(totaleElement) totaleElement.innerText = "0.00";
        // Nascondi la sezione checkout se vuoto
        const checkoutParams = document.getElementById('azioniCarrello');
        if(checkoutParams) checkoutParams.style.display = 'none';
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
    
    // AGGIORNA IL TOTALE NELLA PAGINA
    if(totaleElement) {
        totaleElement.innerText = totaleCalcolato.toFixed(2);
    }
    
    // Mostra la sezione azioni se c'erano articoli
    const checkoutParams = document.getElementById('azioniCarrello');
    if(checkoutParams) checkoutParams.style.display = 'block';
}

function modificaQuantita(index, variazione) {
    carrello[index].quantita += variazione;
    if (carrello[index].quantita < 1) {
        rimuoviDalCarrello(index);
    } else {
        localStorage.setItem("carrello", JSON.stringify(carrello));
        aggiornaCarrello();
    }
}

function rimuoviDalCarrello(index) {
    if(confirm('Rimuovere questo piatto?')) {
        carrello.splice(index, 1);
        localStorage.setItem("carrello", JSON.stringify(carrello));
        aggiornaCarrello();
    }
}

function svuotaCarrello() {
    if(confirm('Svuotare tutto il carrello?')) {
        carrello = [];
        localStorage.setItem("carrello", JSON.stringify(carrello));
        aggiornaCarrello();
    }
}

async function inviaOrdine() {
    const btn = document.querySelector('#azioniCarrello button.btn-success');
    
    // Calcoliamo il totale finale
    let totaleFinale = 0;
    carrello.forEach(p => totaleFinale += (p.price || p.prezzo || 0) * p.quantita);

    if(totaleFinale === 0) return alert("Carrello vuoto");

    // Prendiamo l'indirizzo se c'è
    const indirizzoInput = document.getElementById('indirizzo');
    const indirizzoConsegna = indirizzoInput ? indirizzoInput.value : '';
    
    // Per semplicità universitaria, prendiamo il primo ristorante ID trovato nel carrello
    // (Idealmente non dovresti mischiare ristoranti, ma se succede prendiamo il primo)
    const ristoranteId = carrello[0].ristoranteId;

    if(!ristoranteId) {
        alert("Errore dati ristorante. Svuota il carrello e riprova.");
        return;
    }

    const payload = {
        clienteId: CLIENT_ID,
        ristoranteId: ristoranteId,
        piatti: carrello,
        totale: totaleFinale, // INVIO IL TOTALE AL SERVER
        tipoConsegna: document.querySelector('input[name="tipoConsegna"]:checked')?.value || 'asporto',
        indirizzoConsegna: indirizzoConsegna
    };

    try {
        const res = await fetch('http://localhost:3000/ordine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert(`Ordine inviato! Totale da pagare: €${totaleFinale.toFixed(2)}`);
            carrello = [];
            localStorage.setItem("carrello", "[]");
            window.location.href = 'cliente.html';
        } else {
            alert("Errore nell'invio dell'ordine.");
        }
    } catch (e) {
        console.error(e);
        alert("Errore di connessione.");
    }
}

function mostraCheckout() {
    // In questa versione semplificata, mostra un form o invia direttamente
    // Se hai un div hidden per l'indirizzo, mostralo qui.
    // Altrimenti chiedi l'indirizzo con un prompt per fare prima:
    
    const tipo = confirm("Vuoi la consegna a domicilio? (OK = Sì, Annulla = Asporto)");
    
    let indirizzo = "";
    let tipoConsegna = "asporto";

    if(tipo) {
        tipoConsegna = "domicilio";
        indirizzo = prompt("Inserisci indirizzo di consegna:", "Via Roma 1, Milano");
        if(!indirizzo) return; // Annullato
    }

    // Creiamo input nascosti o simuliamo il form per la funzione inviaOrdine
    // Oppure chiamiamo direttamente la logica qui:
    
    // Hack per riutilizzare la funzione inviaOrdine senza il form HTML complesso
    // Creiamo al volo gli elementi se non esistono
    if(!document.getElementById('indirizzo')) {
        const i = document.createElement('input'); i.id='indirizzo'; i.value=indirizzo; i.type='hidden'; document.body.appendChild(i);
    } else {
        document.getElementById('indirizzo').value = indirizzo;
    }
    
    // Creiamo input radio fake
    if(!document.querySelector('input[name="tipoConsegna"]')) {
       const r = document.createElement('input'); r.type='radio'; r.name='tipoConsegna'; r.value=tipoConsegna; r.checked=true; document.body.appendChild(r);
    }

    inviaOrdine();
}