const rId = localStorage.getItem('_id');
if (!rId) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', caricaOrdini);

setInterval(function() {
    const orologio = document.getElementById('orologio');
    if (orologio) {
        orologio.innerText = new Date().toLocaleTimeString();
    }
    caricaOrdini();
}, 3000);

async function caricaOrdini() {
    try {
        const risposta = await fetch(API_URL + '/ristoratore/' + rId + '/ordini');
        const ordini = await risposta.json();
        const container = document.getElementById('containerOrdini');

        if (ordini.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5 text-muted">Nessun ordine in coda.</div>';
            return;
        }

        let html = '';

        ordini.forEach(function(ordine) {
            const totale = parseFloat(ordine.totale || 0);
            const consegna = parseFloat(ordine.costoConsegna || 0);
            const cibo = totale - consegna;

            let percentuale = 0;
            if (ordine.stato === 'consegnato') {
                percentuale = 100;
            } else if (ordine.stato !== 'in_coda') {
                const now = new Date().getTime();
                const inizio = new Date(ordine.orarioInizio).getTime();
                const fine = new Date(ordine.orarioFine).getTime();
                percentuale = Math.min(100, Math.max(0, (now - inizio) / (fine - inizio) * 100));
            }

            const icona = ordine.tipoConsegna === 'domicilio' ? '🚚' : '🥡';
            const tipoTesto = ordine.tipoConsegna === 'domicilio' ? 'Domicilio' : 'Asporto';

            const listaPiatti = ordine.piatti.map(function(p) {
                return '<li>' + (p.nome || p.strMeal) + ' x' + (p.quantita || 1) + '</li>';
            }).join('');

            html += `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-header d-flex justify-content-between">
                        <span class="fw-bold">#${ordine._id.slice(-4).toUpperCase()}</span>
                        <span class="badge st-${ordine.stato}">${ordine.stato.replace('_', ' ')}</span>
                    </div>
                    <div class="card-body">
                        <h5>${ordine.clienteInfo.nome}</h5>
                        <p class="text-primary">${icona} ${tipoTesto}</p>
                        
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

        container.innerHTML = html;

    } catch (errore) {
        console.error("Errore:", errore);
    }
}