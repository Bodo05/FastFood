const CLIENT_ID = localStorage.getItem('_id');
if (!CLIENT_ID || localStorage.getItem('userType') !== 'cliente') {
  window.location.href = 'login.html';
}

window.onload = async () => {
  try {
    const clienteRes = await fetch(`http://localhost:3000/cliente/${CLIENT_ID}`);
    if (!clienteRes.ok) throw new Error('Errore caricamento dati cliente');
    const cliente = await clienteRes.json();
    const preferenze = cliente.preferenze || [];

    const mealsRes = await fetch('http://localhost:3000/meals');
    if (!mealsRes.ok) throw new Error('Errore caricamento meals');
    const meals = await mealsRes.json();

    let consigliati = meals;
    if (preferenze.length > 0) {
        const preferiti = meals.filter(m => preferenze.some(p => (m.categoria || '').includes(p)));
        if (preferiti.length > 0) consigliati = preferiti;
    }

    const container = document.getElementById('piattiContainer');
    container.innerHTML = '';

    if (consigliati.length === 0) {
      container.innerHTML = '<div class="col-12"><div class="alert alert-info">Non ci sono ancora piatti attivi.</div></div>';
      return;
    }

    const titolo = document.querySelector('h4');
    if(titolo) titolo.textContent = preferenze.length > 0 ? `Consigliati per te (${preferenze.join(', ')})` : 'Tutti i Piatti del Momento';

    consigliati.forEach(p => {
      const img = p.thumb || 'https://via.placeholder.com/300x200?text=No+Image';
      const prezzo = p.prezzo ? `€${p.prezzo.toFixed(2)}` : 'Prezzo N/D';
      const ristorante = p.ristoranteNome || 'Ristorante Sconosciuto';
      const tempo = p.tempo ? `${p.tempo} min` : 'N/A';
      const categoria = p.categoria || 'Generale';
      const rId = p.ristoranteId || ''; 

      const card = document.createElement('div');
      card.className = 'col-md-4 mb-4';
      card.innerHTML = `
        <div class="card shadow-sm h-100 border-0">
          <div class="position-relative">
             <img src="${img}" class="card-img-top" style="height:200px;object-fit:cover" alt="${p.nome}">
             <span class="position-absolute top-0 end-0 badge bg-warning text-dark m-2">${categoria}</span>
          </div>
          <div class="card-body d-flex flex-column">
            <h5 class="card-title mb-1">${p.nome}</h5>
            <p class="text-muted small mb-2"><i class="bi bi-shop"></i> Venduto da: <strong>${ristorante}</strong></p>
            
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="h5 mb-0 text-primary">${prezzo}</span>
                <small class="text-muted">⏱ ${tempo}</small>
            </div>

            <p class="card-text small text-secondary text-truncate">${p.ingredienti || ''}</p>

            <div class="mt-auto">
              <button class="btn btn-outline-primary w-100" 
                onclick="aggiungiCarrello('${p._id}', '${(p.nome||'').replace(/'/g, "\\'")}', ${p.prezzo || 0}, '${img}', '${categoria}', '${rId}', '${ristorante.replace(/'/g, "\\'")}')">
                Aggiungi al Carrello
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error('Errore:', err);
  }
};

function aggiungiCarrello(idMeal, strMeal, price, strMealThumb, strCategory, ristoranteId, ristoranteNome) {
  let carrello = JSON.parse(localStorage.getItem('carrello') || '[]');
  const piattoEsistente = carrello.find(item => item.idMeal === idMeal);
  
  if (piattoEsistente) {
    piattoEsistente.quantita += 1;
  } else {
    carrello.push({
      idMeal, strMeal, strMealThumb, price, strCategory, ristoranteId, ristoranteNome, quantita: 1
    });
  }
  localStorage.setItem('carrello', JSON.stringify(carrello));
  
  // --- QUI USA LA NUOVA NOTIFICA BOOTSTRAP ---
  if(typeof showToast === 'function') {
      showToast(`<strong>${strMeal}</strong> aggiunto al carrello!`, 'success');
  } else {
      alert(`${strMeal} aggiunto al carrello!`);
  }
}