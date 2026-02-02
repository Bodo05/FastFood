/**
 * Gestione Coda Ordini Ristoratore
 * Aggiornamento automatico ogni 3 secondi per monitorare lo stato degli ordini.
 */

const rId = localStorage.getItem('_id');
const API_URL = 'http://localhost:3000';

// Redirect se non loggato
if (!rId) location.href = 'login.html';

// Avvio timer: aggiorna orologio e ricarica dati ogni 3 secondi
setInterval(() => {
    const orologio = document.getElementById('orologio');
    if (orologio) orologio.innerText = new Date().toLocaleTimeString();
    loadOrders();
}, 3000);

// Caricamento iniziale immediato
document.addEventListener('DOMContentLoaded', loadOrders);

/**
 * Funzione principale per caricare e renderizzare gli ordini
 */
async function loadOrders() {
    try {
        const res = await fetch(`${API_URL}/ristoratore/${rId}/ordini`);
        const data = await res.json();
        const div = document.getElementById('containerOrdini');
        
        if (!div) return;

        if (data.length === 0) {
            div.innerHTML = '<div class="col-12 text-center py-5 text-muted">Nessun ordine presente in coda.</div>';
            return;
        }

        let htmlContent = '';
        
        data.forEach(o => {
            // Calcoli economici
            const tot = parseFloat(o.totale || 0);
            const cons = parseFloat(o.costoConsegna || 0);
            const cibo = tot - cons;
            
            // Calcoli temporali
            const tPrep = o.tempoPreparazione || 15;
            const tViaggio = o.tempoViaggio || 0;

            // Calcolo percentuale avanzamento (barra di progressione)
            const now = new Date().getTime();
            const start = new Date(o.orarioInizio).getTime();
            const end = new Date(o.orarioFine).getTime();
            let pct = 0;
            
            if (o.stato === 'consegnato') {
                pct = 100;
            } else if (o.stato !== 'in_coda') {
                // Calcola la percentuale basata sul tempo trascorso tra inizio e fine prevista
                pct = Math.min(100, Math.max(0, (now - start) / (end - start) * 100));
            }

            const tipoConsegnaIcon = o.tipoConsegna === 'domicilio' ? '🚚' : '🥡';
            const tipoConsegnaText = o.tipoConsegna === 'domicilio' 
                ? ' Consegna a Domicilio' 
                : ' Ritiro in Negozio (Asporto)';
            
            // Dettagli specifici per la consegna a domicilio
            let spedizioneDetails = '';
            if (o.tipoConsegna === 'domicilio') {
                spedizioneDetails = `
                    <div class="d-flex justify-content-between small text-muted">
                        <span>Spedizione:</span> <span>€${cons.toFixed(2)}</span>
                    </div>
                    <div class="mb-2 small text-muted">
                         Tempo Viaggio: <b>${tViaggio}m</b>
                    </div>`;
            }

            htmlContent += `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm border-${o.stato === 'in_preparazione' ? 'warning' : 'light'}">
                    <div class="card-header d-flex justify-content-between align-items-center bg-white">
                        <span class="fw-bold">#${o._id.slice(-4).toUpperCase()}</span>
                        <span class="badge st-${o.stato} rounded-pill">${o.stato.replace('_', ' ')}</span>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title mb-0">${o.clienteInfo.nome}</h5>
                        <p class="mb-3 small fw-bold text-primary">${tipoConsegnaIcon}${tipoConsegnaText}</p>
                        
                        <div class="bg-light p-2 rounded mb-3 small border">
                            <div class="d-flex justify-content-between"><span>Cibo:</span> <b>€${cibo.toFixed(2)}</b></div>
                            ${spedizioneDetails}
                            <div class="d-flex justify-content-between border-top pt-1 mt-1 fw-bold text-success fs-6">
                                <span>TOTALE:</span> <span>€${tot.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="d-flex justify-content-between mb-1 small text-muted">
                            <span>Progresso preparazione</span>
                            <span>${tPrep}m</span>
                        </div>
                        <div class="progress mb-3" style="height: 8px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" style="width: ${pct}%"></div>
                        </div>

                        <h6 class="small fw-bold border-bottom pb-1">Dettaglio Piatti:</h6>
                        <ul class="small mb-0 ps-3">
                            ${o.piatti.map(p => `<li>${p.nome || p.strMeal} <small class="text-muted">x${p.quantita || 1}</small></li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>`;
        });

        div.innerHTML = htmlContent;

    } catch (e) {
        console.error("Errore nel caricamento ordini:", e);
    }
}

/**
 * Helper per mostrare notifiche a video
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastPlaceHolder');
    if (!container) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="toast align-items-center text-bg-${type} border-0 mb-2 shadow" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body fw-bold">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>`;
    container.appendChild(wrapper.firstElementChild);
    const toastEl = container.lastElementChild;
    new bootstrap.Toast(toastEl).show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}