//controllo che ristoratore sia loggato
if (checkLogin('ristoratore') === false) throw new Error("Redirecting...");
const rId = localStorage.getItem('_id');

caricaStatistiche();

async function caricaStatistiche() {
    try {
        //prendo dal database le statistiche di un ristoratore
        const risposta = await fetch(API_URL + '/ristoratore/' + rId + '/statistiche');
        const dati = await risposta.json();

        //riempio il testo delle card con i dati appena presi
        document.getElementById('totaleGuadagni').innerText = dati.totaleGuadagni.toFixed(2);
        document.getElementById('numeroOrdini').innerText = dati.numeroOrdini;

        const lista = document.getElementById('listaPopolari');
        lista.innerHTML = '';

        if (dati.classificaPiatti.length === 0) {
            lista.innerHTML = '<li class="list-group-item text-muted">Nessun dato disponibile.</li>';
            return;
        }

        //se un piatto primo in classifica medaglia oro e cosi via, poi c'è jn badge blu che contiene il numero di ordini di quel piatto
        dati.classificaPiatti.forEach(function(piatto, i) {
            let medaglia = '';
            if (i === 0) medaglia = '🥇';
            else if (i === 1) medaglia = '🥈';
            else if (i === 2) medaglia = '🥉';

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between';
            li.innerHTML = `
                <span>${medaglia} <strong>${piatto.nome}</strong></span>
                <span class="badge bg-primary">${piatto.quantita} venduti</span>
            `;
            lista.appendChild(li);
        });

    } catch (errore) {
        console.error(errore);
        showToast("Errore caricamento statistiche", "danger");
    }
}