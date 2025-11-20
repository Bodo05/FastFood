const CLIENT_ID = localStorage.getItem('_id');
if (!CLIENT_ID || localStorage.getItem('userType') !== 'cliente') {
  window.location.href = 'login.html';
}

function logout() {
  localStorage.clear();
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

    const consigliati = meals.filter(m => preferenze.includes(m.strCategory));

    const container = document.getElementById('piattiContainer');
    container.innerHTML = '';

    if (consigliati.length === 0) {
      container.innerHTML = '<div class="col-12"><div class="alert alert-info">Nessun piatto trovato per le tue preferenze. Modifica le tue preferenze nella pagina di gestione account.</div></div>';
      return;
    }

    consigliati.forEach(p => {
      const card = document.createElement('div');
      card.className = 'col-md-4 mb-4';
      card.innerHTML = `
        <div class="card shadow-sm h-100">
          <img src="${p.strMealThumb}" class="card-img-top" style="height:200px;object-fit:cover" alt="${p.strMeal}">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${p.strMeal}</h5>
            <p class="card-text">
              <strong>Categoria:</strong> ${p.strCategory || 'N/A'}<br>
              <strong>Prezzo:</strong> €${p.price || 'N/A'}<br>
              <strong>Tempo preparazione:</strong> ${p.prepTime || 'N/A'} min
            </p>
            <div class="mt-auto">
              <button class="btn btn-primary w-100" onclick="aggiungiCarrello('${p._id}', '${p.strMeal.replace(/'/g, "\\'")}', ${p.price || 0}, '${p.strMealThumb}', '${p.strCategory}')">
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
    alert('Errore nel caricamento della pagina');
  }
};

function aggiungiCarrello(idMeal, strMeal, price, strMealThumb, strCategory) {
  let carrello = JSON.parse(localStorage.getItem('carrello') || '[]');
  const piattoEsistente = carrello.find(item => item.idMeal === idMeal);
  if (piattoEsistente) {
    piattoEsistente.quantita += 1;
  } else {
    carrello.push({
      idMeal,
      strMeal,
      strMealThumb,
      price,
      strCategory,
      quantita: 1
    });
  }
  localStorage.setItem('carrello', JSON.stringify(carrello));
  
  const toast = document.createElement('div');
  toast.className = 'position-fixed bottom-0 end-0 m-3 alert alert-success';
  toast.innerHTML = `${strMeal} aggiunto al carrello!`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}