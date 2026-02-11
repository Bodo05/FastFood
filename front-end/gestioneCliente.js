//controllo come in ogni js che tipologiautente sia loggata
if (checkLogin('cliente') === false) throw new Error("Redirecting...");
const userId = localStorage.getItem('_id');

//quando la pagina è caricata chiama la funzione caricaDati
document.addEventListener('DOMContentLoaded', caricaDati);

async function caricaDati() {
    try {
        const resCat = await fetch(API_URL + '/categorie-catalogo');
        const categorie = await resCat.json();
        const select = document.getElementById('categoriaPreferita');
        //riempie menu categoriaPreferita con le varue categorie possibili recuperate tramite API sopra
        select.innerHTML = '<option value="">-- Seleziona --</option>';
        categorie.forEach(function(cat) {
            select.innerHTML += '<option value="' + cat + '">' + cat + '</option>';
        });

        //recupero i dati del cliente
        const resUser = await fetch(API_URL + '/cliente/' + userId);
        const utente = await resUser.json();
        
        //riempio i campi utente
        document.getElementById('nome').value = utente.nome || '';
        document.getElementById('cognome').value = utente.cognome || '';
        document.getElementById('email').value = utente.email || '';
        document.getElementById('metodoPagamento').value = utente.metodoPagamento || 'carta_credito';

        if (utente.datiCarta) {
            document.getElementById('profNumeroCarta').value = utente.datiCarta.numero || '';
            document.getElementById('profCVV').value = utente.datiCarta.cvv || '';
            document.getElementById('profScadenza').value = utente.datiCarta.scadenza || '';
        }
        
        if (utente.metodoPagamento) {
            document.getElementById('metodoPagamento').value = utente.metodoPagamento;
        } else {
            document.getElementById('metodoPagamento').value = 'carta_credito';
        }

        if (utente.preferenze && utente.preferenze.length > 0) {
            select.value = utente.preferenze[0];
        }

        //prendo gli ordini del clienye dal DataBase
        const resOrdini = await fetch(API_URL + '/cliente/' + userId + '/ordini');
        const ordini = await resOrdini.json();
        mostraOrdini(ordini);

    } catch (errore) {
        console.error(errore);
        showToast("Errore caricamento dati", "danger");
    }
}

function mostraOrdini(ordini) {
    const container = document.getElementById('storico');
    container.innerHTML = '';

    if (ordini.length === 0) {
        container.innerHTML = '<div class="list-group-item text-center text-muted">Non hai ancora ordini.</div>';
        return;
    }

    //per ogni ordine sceglie colore etichetta in base allo stato dell'ordine
    ordini.forEach(function(ordine) {
        const totale = parseFloat(ordine.totale || 0);
        const consegna = parseFloat(ordine.costoConsegna || 0);
        const cibo = totale - consegna;
        const data = new Date(ordine.dataCreazione).toLocaleDateString();

        let badgeClass = 'bg-secondary';
        if (ordine.stato === 'in_coda') badgeClass = 'bg-warning text-dark';
        if (ordine.stato === 'in_preparazione') badgeClass = 'bg-primary';
        if (ordine.stato === 'consegnato') badgeClass = 'bg-success';

        //uscisce i nomi dei piatti in una singola stringa separata da virgolr
        const piatti = ordine.piatti.map(function(p) {
            return p.nome || p.strMeal;
        }).join(', ');


        //riempie il campo con id storico degli ordini
        container.innerHTML += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between">
                    <h6>${ordine.ristoranteNome || 'Ristorante'}</h6>
                    <span class="badge ${badgeClass}">${ordine.stato.replace('_', ' ')}</span>
                </div>
                <p class="small text-muted mb-1">${piatti}</p>
                <div class="d-flex justify-content-between">
                    <small class="text-muted">${data}</small>
                    <strong class="text-primary">€${totale.toFixed(2)}</strong>
                </div>
            </div>
        `;
    });
}

async function aggiorna() {
    const nome = document.getElementById('nome').value.trim();
    const cognome = document.getElementById('cognome').value.trim();
    const metodo = document.getElementById('metodoPagamento').value;
    const preferenza = document.getElementById('categoriaPreferita').value;
    const numCarta = document.getElementById('profNumeroCarta').value.trim();
    const cvv = document.getElementById('profCVV').value.trim();
    const scadenza = document.getElementById('profScadenza').value.trim();

    if (numCarta && !/^\d{16}$/.test(numCarta)) {
        showToast("Numero carta non valido (16 cifre)", "warning");
        return;
    }

    //prova a chiamare in put la rotta cliente/:id per  aggiornare il profilo
    try {
        const risposta = await fetch(API_URL + '/cliente/' + userId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nome,
                cognome: cognome,
                metodoPagamento: metodo,
                preferenze: preferenza ? [preferenza] : [],
                datiCarta: {
                    numero: numCarta,
                    cvv: cvv,
                    scadenza: scadenza
                }
            })
        });

        if (risposta.ok) {
            showToast('Profilo e Dati Carta aggiornati!', 'success');
        } else {
            showToast('Errore aggiornamento', 'warning');
        }
    } catch (errore) {
        showToast("Errore di connessione", "danger");
    }
}

async function elimina() {
    if (!confirm('Sei sicuro di voler eliminare il tuo account?')) {
        return;
    }

    //chiama API di delete cliente/:id per eliminare il profilo dal database, se elimina riporta 
    //alla pagina di login
    try {
        const risposta = await fetch(API_URL + '/cliente/' + userId, { method: 'DELETE' });
        
        if (risposta.ok) {
            showToast('Account eliminato', 'success');
            localStorage.clear();
            setTimeout(function() {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showToast('Impossibile eliminare', 'danger');
        }
    } catch (errore) {
        showToast("Errore di connessione", "danger");
    }
}