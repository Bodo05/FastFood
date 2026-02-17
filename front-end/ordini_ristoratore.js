//controlla che ristoratore sia loggato
if (checkLogin('ristoratore') === false) throw new Error("Redirecting...");
const rId = localStorage.getItem('_id');

//aspetta che la pagina sia caricata e poi chiama la funzione caricaOrdini
document.addEventListener('DOMContentLoaded', caricaOrdini);

// polling ogni 3 secondi degli ordini (interroga api /ordini) chiamando carica ordini automaticamente
setInterval(function() {
    const orologio = document.getElementById('orologio');
    if (orologio) {
        orologio.innerText = new Date().toLocaleTimeString();
    }
    caricaOrdini();
}, 3000);

async function caricaOrdini() {
    try {
        //prendo dal database la lista degli ordini del ristoratore
        const risposta = await fetch(API_URL + '/ristoratore/' + rId + '/ordini');
        const ordini = await risposta.json();
        const container = document.getElementById('containerOrdini');
        //se non ci sono ordini riempio il container dicendo che non ci sono stati ordini fin'ora
        if (ordini.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5 text-muted">Nessun ordine in coda.</div>';
            return;
        }

        let html = ''; //variabile per creazione cad
        //per ogni ordine calcolo i vari costi
        ordini.forEach(function(ordine) {
            const totale = parseFloat(ordine.totale || 0);
            const consegna = parseFloat(ordine.costoConsegna || 0);
            const cibo = totale - consegna;

            //determino la percentuale doi preparazione dell'ordine che mi servirà dopo per la barra di completamento ordine
            let percentuale = 0;
            if (ordine.stato === 'consegnato') {
                percentuale = 100;
            } else if (ordine.stato !== 'in_coda') {
                const now = new Date().getTime();
                const inizio = new Date(ordine.orarioInizio).getTime();
                const fine = new Date(ordine.orarioFine).getTime();
                percentuale = Math.min(100, Math.max(0, (now - inizio) / (fine - inizio) * 100));
            }

            const tipoTesto = ordine.tipoConsegna === 'domicilio' ? 'Domicilio' : 'Asporto';
            //determino la lista dei piatti
            let listaPiatti = '';
            
            //controllo che ci siano piatti
            if (ordine.piatti && ordine.piatti.length > 0) {
                for (let j = 0; j < ordine.piatti.length; j++) {
                    let p = ordine.piatti[j];
                    let nomePiatto = p.nome || p.strMeal;
                    let quantitaPiatto = p.quantita || 1;
                    
                    //aggiungo riga nella lista
                    listaPiatti += '<li>' + nomePiatto + ' x' + quantitaPiatto + '</li>';
                }
            }
            //costrusco la card in base ai parametri (ordine info costruito nel backend)
            html += `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-header d-flex justify-content-between">
                        <span class="fw-bold">#${String(ordine._id).slice(-6).toUpperCase()}</span>
                        <span class="badge st-${ordine.stato}">${ordine.stato.replace('_', ' ')}</span>
                    </div>
                    <div class="card-body">
                        <h5>${ordine.clienteInfo.nome}</h5>
                        <p class="text-primary">${tipoTesto}</p>
                        
                        <div class="bg-light p-2 rounded mb-3">
                            <div class="d-flex justify-content-between">
                                <span>Cibo:</span> <b>€${cibo.toFixed(2)}</b>
                            </div>
                            ${ordine.tipoConsegna === 'domicilio' ? '<div class="d-flex justify-content-between"><span>Consegna:</span> <span>€' + consegna.toFixed(2) + '</span></div>' : ''}
                            <div class="d-flex justify-content-between border-top pt-1 mt-1 fw-bold text-success">
                                <span>TOTALE:</span> <span>€${totale.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="progress mb-3" style="height: 8px;">
                            <div class="progress-bar bg-success" style="width: ${percentuale}%"></div>
                        </div>

                        <h6 class="small fw-bold">Piatti:</h6>
                        <ul class="small">${listaPiatti}</ul>
                    </div>
                </div>
            </div>
            `;
        });

        //applica l'html al mio container
        container.innerHTML = html;

    } catch (errore) {
        console.error("Errore:", errore);
    }
}