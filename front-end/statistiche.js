        function showToast(message, type = 'danger') {
            const container = document.getElementById('toastPlaceHolder');
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

        const rId = localStorage.getItem('_id');
        if(!rId) location.href='login.html';

        async function loadStats() {
            try {
                const res = await fetch(`http://localhost:3000/ristoratore/${rId}/statistiche`);
                const data = await res.json();

                document.getElementById('totaleGuadagni').innerText = data.totaleGuadagni.toFixed(2);
                document.getElementById('numeroOrdini').innerText = data.numeroOrdini;

                const list = document.getElementById('listaPopolari');
                list.innerHTML = '';
                
                if(data.classificaPiatti.length === 0) {
                    list.innerHTML = '<li class="list-group-item text-muted">Nessun dato disponibile.</li>';
                } else {
                    data.classificaPiatti.forEach((p, i) => {
                        const badge = i === 0 ? '🥇' : (i === 1 ? '🥈' : '🥉');
                        const li = document.createElement('li');
                        li.className = 'list-group-item d-flex justify-content-between align-items-center';
                        li.innerHTML = `<span>${i < 3 ? badge : ''} <strong>${p.nome}</strong></span> 
                                        <span class="badge bg-primary rounded-pill">${p.quantita} venduti</span>`;
                        list.appendChild(li);
                    });
                }
            } catch(e) { 
                console.error(e); 
                showToast("Errore caricamento statistiche", "danger");
            }
        }
        loadStats();