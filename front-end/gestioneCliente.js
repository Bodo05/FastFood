const id = localStorage.getItem('_id');
const API_URL = 'http://localhost:3000';

if(!id || localStorage.getItem('userType') !== 'cliente') {
    location.href='login.html';
}

function showToast(message, type = 'danger') {
    const container = document.getElementById('toastPlaceHolder');
    if(!container) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="toast align-items-center text-bg-${type} border-0 mb-2 shadow" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex"><div class="toast-body fw-bold">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>
      </div>`;
    container.appendChild(wrapper.firstElementChild);
    const toastEl = container.lastElementChild;
    new bootstrap.Toast(toastEl).show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Categorie
        const resCat = await fetch(`${API_URL}/categorie-catalogo`);
        const cats = await resCat.json();
        const sel = document.getElementById('categoriaPreferita');
        sel.innerHTML = '<option value="">-- Seleziona --</option>';
        cats.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);

        // 2. Dati Utente
        const resUser = await fetch(`${API_URL}/cliente/${id}`);
        const user = await resUser.json();
        document.getElementById('nome').value = user.nome || '';
        document.getElementById('cognome').value = user.cognome || '';
        document.getElementById('email').value = user.email || '';
        if(user.preferenze?.length) sel.value = user.preferenze[0];

        // 3. Ordini
        const resOrdini = await fetch(`${API_URL}/cliente/${id}/ordini`);
        const ordini = await resOrdini.json();
        const div = document.getElementById('storico');
        div.innerHTML = '';
        
        if(ordini.length === 0) {
            div.innerHTML = '<div class="list-group-item text-center text-muted py-4">Non hai ancora effettuato ordini.</div>';
        } else {
            ordini.forEach(o => {
                const tot = parseFloat(o.totale||0);
                const cons = parseFloat(o.costoConsegna||0);
                const cibo = tot - cons;
                const data = new Date(o.dataCreazione).toLocaleDateString();
                
                let badgeClass = 'bg-secondary';
                if(o.stato === 'in_coda') badgeClass = 'bg-warning text-dark';
                if(o.stato === 'in_preparazione') badgeClass = 'bg-primary';
                if(o.stato === 'consegnato') badgeClass = 'bg-success';
                
                const infoConsegna = o.tipoConsegna === 'domicilio' 
                    ? `<span class="text-danger small">+€${cons.toFixed(2)} sped.</span>` 
                    : '<span class="text-success small">Ritiro</span>';

                div.innerHTML += `
                <div class="list-group-item list-group-item-action">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-1 text-dark">${o.ristoranteNome || 'Ristorante'}</h5>
                        <span class="badge ${badgeClass}">${o.stato.replace('_',' ').toUpperCase()}</span>
                    </div>
                    <p class="mb-1 small text-muted text-truncate">
                        ${o.piatti.map(p=>p.nome||p.strMeal).join(', ')}
                    </p>
                    <div class="d-flex justify-content-between align-items-center mt-2 border-top pt-2">
                        <small class="text-secondary">${data} • ${(o.tempoPreparazione||15)+(o.tempoViaggio||0)} min</small>
                        <div class="text-end">
                            <small class="d-block text-muted" style="font-size:0.85em;">Cibo: €${cibo.toFixed(2)} ${infoConsegna}</small>
                            <span class="text-primary fw-bold">Totale: €${tot.toFixed(2)}</span>
                        </div>
                    </div>
                </div>`;
            });
        }
    } catch(e) {
        console.error(e);
        showToast("Errore caricamento dati", "danger");
    }
});

async function aggiorna() {
    const nome = document.getElementById('nome').value;
    const cognome = document.getElementById('cognome').value;
    const pref = [document.getElementById('categoriaPreferita').value];
    
    try {
        const res = await fetch(`${API_URL}/cliente/${id}`, {
            method: 'PUT', 
            headers: {'Content-Type':'application/json'}, 
            body: JSON.stringify({nome, cognome, preferenze: pref})
        });
        
        if(res.ok) showToast('Profilo aggiornato con successo!', 'success');
        else showToast('Errore durante l\'aggiornamento', 'warning');
    } catch(e) { 
        showToast("Errore di connessione", "danger"); 
    }
}

async function elimina() {
    if(!confirm('SEI SICURO?\nQuesta azione cancellerà definitivamente il tuo account.')) return;
    
    try {
        const res = await fetch(`${API_URL}/cliente/${id}`, {method:'DELETE'});
        if(res.ok) {
            showToast('Account eliminato. Arrivederci!', 'success');
            localStorage.clear();
            setTimeout(() => location.href='login.html', 1500);
        } else {
            showToast('Impossibile eliminare l\'account', 'danger');
        }
    } catch(e) { 
        showToast("Errore di connessione", "danger"); 
    }
}