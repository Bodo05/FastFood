let carrello = JSON.parse(localStorage.getItem("carrello")) || [];

window.onload = () => {
    aggiornaCarrello();
};

function aggiornaCarrello() {
    const container = document.getElementById("carrelloContainer");
    const totaleElement = document.getElementById("totale");
    container.innerHTML = "";
    if (carrello.length === 0) {
        container.innerHTML = '<p class="text-muted">Il carrello è vuoto</p>';
        totaleElement.innerText = "0.00";
        return;
    }
    let totale = 0;
    carrello.forEach((piatto, index) => {
        const subtotale = (piatto.price || 0) * piatto.quantita;
        totale += subtotale;
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <img src="${piatto.strMealThumb}" class="img-fluid rounded" style="height:80px;object-fit:cover" alt="${piatto.strMeal}">
                    </div>
                    <div class="col-md-6">
                        <h5>${piatto.strMeal}</h5>
                        <p class="mb-1">Categoria: ${piatto.strCategory || 'N/A'}</p>
                        <p class="mb-0">Prezzo: €${piatto.price || '0'}</p>
                    </div>
                    <div class="col-md-2">
                        <div class="input-group">
                            <button class="btn btn-outline-secondary" type="button" onclick="modificaQuantita(${index}, -1)">-</button>
                            <input type="number" class="form-control text-center" value="${piatto.quantita}" min="1" readonly>
                            <button class="btn btn-outline-secondary" type="button" onclick="modificaQuantita(${index}, 1)">+</button>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <p class="mb-1"><strong>Subtotale: €${subtotale.toFixed(2)}</strong></p>
                        <button class="btn btn-danger btn-sm" onclick="rimuoviDalCarrello(${index})">Rimuovi</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    totaleElement.innerText = totale.toFixed(2);
}

function modificaQuantita(index, variazione) {
    carrello[index].quantita += variazione;
    if (carrello[index].quantita < 1) {
        carrello[index].quantita = 1;
    }
    localStorage.setItem("carrello", JSON.stringify(carrello));
    aggiornaCarrello();
}

function rimuoviDalCarrello(index) {
    if (confirm(`Sei sicuro di voler rimuovere ${carrello[index].strMeal} dal carrello?`)) {
        carrello.splice(index, 1);
        localStorage.setItem("carrello", JSON.stringify(carrello));
        aggiornaCarrello();
    }
}

function svuotaCarrello() {
    if (confirm("Sei sicuro di voler svuotare tutto il carrello?")) {
        localStorage.removeItem("carrello");
        carrello = [];
        aggiornaCarrello();
    }
}

function procediAllOrdine() {
    if (carrello.length === 0) {
        alert("Il carrello è vuoto!");
        return;
    }
    alert("Funzionalità di ordine da implementare");
}