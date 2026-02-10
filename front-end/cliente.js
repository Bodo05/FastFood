if (checkLogin('cliente') === false) throw new Error("Redirecting...");
const CLIENT_ID = localStorage.getItem('_id');

window.onload = caricaPiatti;

async function caricaPiatti() {
    try {
        // vengono presi i dati del cliente tramite api /cliente/:id
        const resCliente = await fetch(API_URL + '/cliente/' + CLIENT_ID);
        const cliente = await resCliente.json();
        const preferenze = cliente.preferenze || [];

        //carico tutti i piatti in resPiatti
        const resPiatti = await fetch(API_URL + '/meals');
        const piatti = await resPiatti.json();

        //se l'utente ha scelto una preferenza i piatti vengono filtrati
        let daVisualizzare = piatti;
        if (preferenze.length > 0) {
            const filtrati = piatti.filter(function(p) {
                return preferenze.some(function(pref) {
                    return (p.categoria || '').includes(pref);
                });
            });
            if (filtrati.length > 0) {
                daVisualizzare = filtrati;
            }
        }

        //se l'utente ha preferenze viene mostrata anche la categoria, altrimenti messaggio comune
        const titolo = document.querySelector('h4');
        if (titolo) {
            titolo.textContent = preferenze.length > 0 
                ? 'Consigliati per te (' + preferenze.join(', ') + ')'
                : 'Tutti i Piatti';
        }

        mostraPiatti(daVisualizzare);

    } catch (errore) {
        console.error('Errore:', errore);
        showToast('Errore caricamento piatti. Server acceso?', 'danger');
    }
}

function mostraPiatti(piatti) {
    const container = document.getElementById('piattiContainer');
    container.innerHTML = '';

    if (piatti.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">Nessun piatto disponibile.</div></div>';
        return;
    }
    //costruzione delle card con i piatti 
    piatti.forEach(function(p) {
        const immagine = p.thumb || 'https://via.placeholder.com/300x200?text=No+Image';
        const prezzo = p.prezzo ? '€' + parseFloat(p.prezzo).toFixed(2) : 'N/D';
        const ristorante = p.ristoranteNome || 'Sconosciuto';

        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card h-100 shadow-sm border-0">
                <img src="${immagine}" class="card-img-top" style="height:200px; object-fit:cover" onerror="this.src='https://via.placeholder.com/300x200?text=Err+Img'">
                <div class="card-body">
                    <h5 class="card-title text-truncate">${p.nome}</h5>
                    <p class="text-muted small">Da: ${ristorante}</p>
                    <p class="text-primary fw-bold">${prezzo}</p>
                    <button class="btn btn-outline-primary w-100" onclick="aggiungiCarrello('${p._id}', '${p.nome.replace(/'/g, "\\'")}', ${p.prezzo || 0}, '${immagine}', '${p.categoria || ''}', '${p.ristoranteId || ''}', '${ristorante.replace(/'/g, "\\'")}')">
                        Aggiungi al Carrello
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

//la funzione aggiungi carrello fa si che se viene selezionato un piatto venga aggiunto al carrello nel localStorage
function aggiungiCarrello(id, nome, prezzo, thumb, categoria, ristoranteId, ristoranteNome) {
    let carrello = JSON.parse(localStorage.getItem('carrello') || '[]');
    
    // FIX: Impedisce ordini misti
    if (carrello.length > 0 && carrello[0].ristoranteId !== ristoranteId) {
        showToast("Puoi ordinare da un solo ristorante alla volta! Svuota il carrello prima.", "warning");
        return; 
    }
    
    const esistente = carrello.find(function(item) {
        return item.idMeal === id;
    });
    
    if (esistente) {
        esistente.quantita += 1;
    } else {
        carrello.push({
            idMeal: id,
            strMeal: nome,
            strMealThumb: thumb,
            price: parseFloat(prezzo),
            strCategory: categoria,
            ristoranteId: ristoranteId,
            ristoranteNome: ristoranteNome,
            quantita: 1
        });
    }
    
    localStorage.setItem('carrello', JSON.stringify(carrello));
    showToast(nome + ' aggiunto al carrello!', 'success');
}