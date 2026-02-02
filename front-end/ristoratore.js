const rId = localStorage.getItem('_id');
const API_URL = 'http://localhost:3000';

if(!rId || localStorage.getItem('userType') !== 'ristoratore') { 
    alert('Login richiesto'); 
    location.href='login.html'; 
}

async function loadMenu() {
    const cont = document.getElementById('menuContainer');
    if (!cont) return;

    try {
        const res = await fetch(`${API_URL}/ristoratore/${rId}/piatti`);
        
        if (!res.ok) throw new Error('Errore server');

        const piatti = await res.json();
        
        cont.innerHTML = '';

        if (!piatti || piatti.length === 0) {
            cont.innerHTML = '<div class="col-12 text-center"><h5>Nessun piatto trovato nel menu.</h5></div>';
            return;
        }

        piatti.forEach(p => {
            const card = document.createElement('div');
            card.className = 'col-md-3 mb-3';
            
            const nome = p.nome || p.strMeal || "Senza nome";
            const img = p.thumb || p.strMealThumb || 'https://via.placeholder.com/150';
            const prezzo = p.prezzo ? `€${parseFloat(p.prezzo).toFixed(2)}` : 'N/D';

            card.innerHTML = `
                <div class="card h-100 shadow-sm border-0">
                    <img src="${img}" class="card-img-top" style="height:150px; object-fit:cover"
                         onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
                    <div class="card-body">
                        <h6 class="card-title fw-bold">${nome}</h6>
                        <p class="card-text text-primary">${prezzo}</p>
                    </div>
                    <div class="card-footer bg-white border-0 d-grid pb-3">
                        <a href="creapiatto.html?piattoId=${p._id}" class="btn btn-sm btn-outline-primary">Modifica</a>
                    </div>
                </div>`;
            cont.appendChild(card);
        });

    } catch (err) {
        console.error("Errore:", err);
        cont.innerHTML = '<div class="alert alert-danger">Impossibile caricare i dati. Il server è acceso?</div>';
    }
}

document.addEventListener('DOMContentLoaded', loadMenu);