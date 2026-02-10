if (checkLogin('ristoratore') === false) throw new Error("Redirecting...");
const rId = localStorage.getItem('_id');

caricaStatistiche();

async function caricaStatistiche() {
    try {
        const risposta = await fetch(API_URL + '/ristoratore/' + rId + '/statistiche');
        const dati = await risposta.json();

        document.getElementById('totaleGuadagni').innerText = dati.totaleGuadagni.toFixed(2);
        document.getElementById('numeroOrdini').innerText = dati.numeroOrdini;

        const lista = document.getElementById('listaPopolari');
        lista.innerHTML = '';

        if (dati.classificaPiatti.length === 0) {
            lista.innerHTML = '<li class="list-group-item text-muted">Nessun dato disponibile.</li>';
            return;
        }

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