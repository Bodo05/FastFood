const rId = localStorage.getItem('_id');
if (!rId || localStorage.getItem('userType') !== 'ristoratore') {
    alert('Login richiesto');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', caricaMenu);

async function caricaMenu() {
    const container = document.getElementById('menuContainer');
    
    try {
        const risposta = await fetch(API_URL + '/ristoratore/' + rId + '/piatti');
        
        if (!risposta.ok) {
            throw new Error('Errore server');
        }

        const piatti = await risposta.json();
        container.innerHTML = '';

        if (piatti.length === 0) {
            container.innerHTML = '<div class="col-12 text-center"><h5>Nessun piatto nel menu.</h5><p>Clicca "Aggiungi Piatto" per iniziare.</p></div>';
            return;
        }

        piatti.forEach(function(p) {
            const nome = p.nome || p.strMeal || "Senza nome";
            const immagine = p.thumb || p.strMealThumb || 'https://via.placeholder.com/150';
            const prezzo = p.prezzo ? '€' + parseFloat(p.prezzo).toFixed(2) : 'N/D';

            const card = document.createElement('div');
            card.className = 'col-md-3 mb-3';
            card.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <img src="${immagine}" class="card-img-top" style="height:150px; object-fit:cover">
                    <div class="card-body">
                        <h6 class="card-title">${nome}</h6>
                        <p class="text-primary">${prezzo}</p>
                    </div>
                    <div class="card-footer bg-white">
                        <a href="creapiatto.html?piattoId=${p._id}" class="btn btn-sm btn-outline-primary w-100">Modifica</a>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (errore) {
        console.error("Errore:", errore);
        container.innerHTML = '<div class="alert alert-danger">Impossibile caricare i dati. Il server è acceso?</div>';
    }
}