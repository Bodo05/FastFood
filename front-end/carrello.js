let carrello = JSON.parse(localStorage.getItem("carrello")) || [];
const CLIENT_ID = localStorage.getItem('_id');

// Punto di partenza di default (centro città) se l'indirizzo del ristorante non viene trovato
const DEFAULT_START = { lat: 45.4642, lon: 9.1900 }; // Esempio: Milano Duomo

window.onload = () => {
    if (!CLIENT_ID) {
        alert("Devi effettuare il login.");
        window.location.href = 'login.html';
    }
    aggiornaCarrello();
};

function aggiornaCarrello() {
    const container = document.getElementById("carrelloContainer");
    const totaleElement = document.getElementById("totale");
    const totaleCheckout = document.getElementById("totaleCheckout");
    
    container.innerHTML = "";
    
    if (carrello.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">Il carrello è vuoto. <a href="cliente.html">Torna al menu</a></div>';
        totaleElement.innerText = "0.00";
        if(document.getElementById('azioniCarrello')) document.getElementById('azioniCarrello').style.display = 'none';
        if(document.getElementById('checkoutSection')) document.getElementById('checkoutSection').style.display = 'none';
        return;
    }

    if(document.getElementById('azioniCarrello')) document.getElementById('azioniCarrello').style.display = 'block';
    
    let totale = 0;
    carrello.forEach((piatto, index) => {
        const subtotale = (piatto.price || 0) * piatto.quantita;
        totale += subtotale;
        
        const card = document.createElement('div');
        card.className = 'card mb-3 shadow-sm';
        card.innerHTML = `
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${piatto.strMeal}</h6>
                        <small class="text-muted"><i class="bi bi-shop"></i> ${piatto.ristoranteNome || 'Ristorante'}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-secondary" onclick="modificaQuantita(${index}, -1)">-</button>
                        <span class="mx-2 fw-bold">${piatto.quantita}</span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="modificaQuantita(${index}, 1)">+</button>
                        <button class="btn btn-sm btn-danger ms-2" onclick="rimuoviDalCarrello(${index})">×</button>
                    </div>
                </div>
                <div class="text-end mt-2 fw-bold text-primary">€${subtotale.toFixed(2)}</div>
            </div>
        `;
        container.appendChild(card);
    });
    
    totaleElement.innerText = totale.toFixed(2);
    if(totaleCheckout) totaleCheckout.innerText = totale.toFixed(2);
}

function modificaQuantita(index, variazione) {
    carrello[index].quantita += variazione;
    if (carrello[index].quantita < 1) rimuoviDalCarrello(index);
    else salvaEaggiorna();
}

function rimuoviDalCarrello(index) {
    if(confirm('Rimuovere piatto?')) {
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

function mostraCheckout() {
    const checkout = document.getElementById('checkoutSection');
    checkout.style.display = 'block';
    checkout.scrollIntoView({behavior: 'smooth'});
    
    const ristorantiUnici = [...new Set(carrello.map(p => p.ristoranteNome || 'Sconosciuto'))];
    const infoDiv = document.getElementById('infoRistoranti');
    if(infoDiv) infoDiv.innerHTML = `<strong>Il tuo ordine verrà inviato a:</strong> ${ristorantiUnici.join(', ')}.`;
}

function toggleIndirizzo() {
    const tipo = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const div = document.getElementById('divIndirizzo');
    const input = document.getElementById('indirizzo');
    
    if (tipo === 'domicilio') {
        div.style.display = 'block';
        input.required = true;
    } else {
        div.style.display = 'none';
        input.required = false;
    }
}

// --- GEOLOCALIZZAZIONE CON OPENSTREETMAP ---

// 1. Trova le coordinate (Lat, Lon) di un indirizzo
async function getCoordinates(address) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
        return null;
    } catch (e) {
        console.error("Errore geocoding:", e);
        return null;
    }
}

// 2. Calcola la distanza in km tra due coordinate (Formula di Haversine)
function calcolaDistanzaKm(coord1, coord2) {
    const R = 6371; // Raggio della terra in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 3. Recupera l'indirizzo del ristorante dal database (se esiste)
async function getIndirizzoRistorante(id) {
    try {
        const res = await fetch(`http://localhost:3000/ristoratore/${id}`);
        if (res.ok) {
            const data = await res.json();
            return data.indirizzo; // Ritorna l'indirizzo salvato nel profilo
        }
    } catch (e) { console.error(e); }
    return "Roma"; // Fallback generico se non trova l'indirizzo
}

async function inviaOrdine() {
    const btn = document.querySelector('#formOrdine button[type="submit"]');
    const testoOriginale = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Calcolo distanze e costi...";

    const tipoConsegna = document.querySelector('input[name="tipoConsegna"]:checked').value;
    const indirizzoCliente = document.getElementById('indirizzo').value;

    if (tipoConsegna === 'domicilio' && !indirizzoCliente.trim()) {
        alert("Inserisci un indirizzo valido.");
        btn.disabled = false; btn.innerText = testoOriginale;
        return;
    }

    // Raggruppa per ristorante
    const ordiniMap = {};
    carrello.forEach(item => {
        const rId = item.ristoranteId;
        if(!rId) return;
        if (!ordiniMap[rId]) ordiniMap[rId] = { rId, rNome: item.ristoranteNome, piatti: [], totale: 0 };
        ordiniMap[rId].piatti.push(item);
        ordiniMap[rId].totale += (item.price * item.quantita);
    });

    const gruppi = Object.values(ordiniMap);
    if (gruppi.length === 0) {
        alert("Errore nei dati del carrello.");
        btn.disabled = false; btn.innerText = testoOriginale;
        return;
    }

    let successi = 0;
    let coordsCliente = null;

    // Trova coordinate cliente una volta sola
    if (tipoConsegna === 'domicilio') {
        coordsCliente = await getCoordinates(indirizzoCliente);
        if (!coordsCliente) {
            if(!confirm("Indirizzo cliente non trovato sulle mappe. Vuoi procedere con un costo standard?")) {
                btn.disabled = false; btn.innerText = testoOriginale;
                return;
            }
        }
    }

    for (const gruppo of gruppi) {
        let costoConsegna = 0;

        if (tipoConsegna === 'domicilio') {
            let km = 0;
            
            if (coordsCliente) {
                // Cerca indirizzo del ristorante specifico
                const indirizzoRist = await getIndirizzoRistorante(gruppo.rId);
                let coordsRist = await getCoordinates(indirizzoRist);
                
                // Se non trova il ristorante, usa il punto di default
                if (!coordsRist) coordsRist = DEFAULT_START;

                km = calcolaDistanzaKm(coordsRist, coordsCliente);
                costoConsegna = Math.max(2, Math.round(km * 0.50)); // 0.50€ al km, minimo 2€
                console.log(`Distanza per ${gruppo.rNome}: ${km.toFixed(2)}km = €${costoConsegna}`);
            } else {
                costoConsegna = 5; // Costo fisso se geocoding fallisce
            }
        }

        const payload = {
            clienteId: CLIENT_ID,
            ristoranteId: gruppo.rId,
            piatti: gruppo.piatti,
            totale: gruppo.totale + costoConsegna,
            costoConsegna: costoConsegna,
            tipoConsegna,
            indirizzoConsegna: tipoConsegna === 'domicilio' ? indirizzoCliente : null
        };

        try {
            const res = await fetch('http://localhost:3000/ordine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) successi++;
        } catch (e) { console.error(e); }
    }

    if (successi === gruppi.length) {
        alert(`Ordine inviato con successo! (${successi} ordini creati)`);
        carrello = [];
        salvaEaggiorna();
        window.location.href = 'cliente.html';
    } else {
        alert("Errore nell'invio. Riprova.");
        btn.disabled = false; btn.innerText = testoOriginale;
    }
}