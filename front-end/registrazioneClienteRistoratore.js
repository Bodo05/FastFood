let userType = 'cliente';
let mealsData = [];
let categorie = [];
const selectedMeals = new Map();

function setType(type) {
  userType = type;
  document.getElementById('tabCliente').classList.toggle('tab-active', type==='cliente');
  document.getElementById('tabRistoratore').classList.toggle('tab-active', type==='ristoratore');
  document.getElementById('clienteFields').style.display = type==='cliente' ? 'block' : 'none';
  document.getElementById('ristoratoreFields').style.display = type==='ristoratore' ? 'block' : 'none';
}

async function loadCategorie() {
  try {
    const res = await fetch('http://localhost:3000/categorie');
    categorie = await res.json();
    
    const catSelectCliente = document.getElementById('categoriaCliente');
    catSelectCliente.innerHTML = '<option value="">-- Seleziona Categoria --</option>';
    categorie.forEach(cat => {
      const o = document.createElement('option');
      o.value = cat;
      o.textContent = cat;
      catSelectCliente.appendChild(o);
    });
    
    const catSelectRistoratore = document.getElementById('categoriaRistoratore');
    catSelectRistoratore.innerHTML = '<option value="">-- Seleziona Categoria --</option>';
    categorie.forEach(cat => {
      const o = document.createElement('option');
      o.value = cat;
      o.textContent = cat;
      catSelectRistoratore.appendChild(o);
    });
  } catch (err) {
    console.error('Errore caricamento categorie:', err);
    alert('Errore nel caricamento delle categorie');
  }
}

async function loadMeals() {
  try {
    const res = await fetch('http://localhost:3000/meals');
    mealsData = await res.json();
  } catch (err) {
    console.error('Errore caricamento meals:', err);
    alert('Errore nel caricamento dei piatti');
  }
}

document.getElementById('categoriaRistoratore').addEventListener('change', function() {
  const cat = this.value;
  const container = document.getElementById('piattiContainer');
  container.innerHTML = '';
  if (!cat) return;
  
  const list = mealsData.filter(m => m.strCategory === cat);
  list.forEach(m => {
    const selected = selectedMeals.get(m._id);
    
    const card = document.createElement('div');
    card.className = 'col-md-3 mb-3';
    card.innerHTML = `
      <div class="card h-100">
        <img src="${m.strMealThumb || ''}" style="height:120px;object-fit:cover" class="card-img-top">
        <div class="card-body">
          <h6 class="card-title">${m.strMeal}</h6>
          <div class="mb-2">
            <label class="form-label small">Prezzo (€)*</label>
            <input type="number" class="form-control form-control-sm prezzo" 
                   value="${selected ? selected.prezzo : ''}" 
                   step="0.01" min="0" placeholder="0.00" required>
          </div>
          <div class="mb-2">
            <label class="form-label small">Tempo prep. (min)*</label>
            <input type="number" class="form-control form-control-sm tempo" 
                   value="${selected ? selected.tempo : ''}" 
                   min="1" placeholder="30" required>
          </div>
          <button type="button" class="btn btn-sm ${selected ? 'btn-danger' : 'btn-success'} w-100 btn-aggiungi">
            ${selected ? 'Rimuovi' : 'Aggiungi'}
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
    
    const btn = card.querySelector('.btn-aggiungi');
    const prezzoInput = card.querySelector('.prezzo');
    const tempoInput = card.querySelector('.tempo');
    
    btn.addEventListener('click', () => {
      const prezzo = parseFloat(prezzoInput.value);
      const tempo = parseInt(tempoInput.value);
      
      if (!prezzo || !tempo) {
        alert('Inserisci prezzo e tempo di preparazione');
        return;
      }
      
      if (selectedMeals.has(m._id)) {
        selectedMeals.delete(m._id);
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-success');
        btn.textContent = 'Aggiungi';
      } else {
        selectedMeals.set(m._id, {
          id: m._id,
          nome: m.strMeal,
          thumb: m.strMealThumb,
          prezzo: prezzo,
          tempo: tempo,
          categoria: m.strCategory,
          ingredienti: m.strIngredient1 || '',
          allergeni: m.strAllergeni || ''
        });
        btn.classList.remove('btn-success');
        btn.classList.add('btn-danger');
        btn.textContent = 'Rimuovi';
      }
      aggiornaMenuSelezionato();
    });
  });
});

function aggiornaMenuSelezionato() {
  const container = document.getElementById('menuSelezionato');
  container.innerHTML = '';
  
  if (selectedMeals.size === 0) {
    container.innerHTML = '<p class="text-muted">Nessun piatto selezionato</p>';
    return;
  }
  
  selectedMeals.forEach((meal, id) => {
    const card = document.createElement('div');
    card.className = 'col-md-4 mb-2';
    card.innerHTML = `
      <div class="card">
        <img src="${meal.thumb}" style="height:80px;object-fit:cover" class="card-img-top">
        <div class="card-body p-2">
          <h6 class="card-title">${meal.nome}</h6>
          <p class="card-text small mb-1">€${meal.prezzo} - ${meal.tempo}min</p>
          <p class="card-text small text-muted">${meal.categoria}</p>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function Registrati() {
  console.log('Funzione Registrati chiamata');
  
  const email = (document.getElementById('email').value || '').trim();
  const password = (document.getElementById('password').value || '');
  const conferma = (document.getElementById('confermaPassword').value || '');
  
  if (!email || !password) { 
    alert('Inserisci email e password'); 
    return; 
  }
  if (password !== conferma) { 
    alert('Le password non coincidono'); 
    return; 
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { 
    alert('Email non valida'); 
    return; 
  }
  if (password.length < 4) { 
    alert('Password troppo corta'); 
    return; 
  }

  let payload = { email, password };

  if (userType === 'cliente') {
    const nome = (document.getElementById('nome').value || '').trim();
    const cognome = (document.getElementById('cognome').value || '').trim();
    const categoriaPreferita = document.getElementById('categoriaCliente').value;
    const preferenze = categoriaPreferita ? [categoriaPreferita] : [];

    if (!nome || !cognome || !categoriaPreferita) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    payload = { ...payload, nome, cognome, preferenze };
  } else {
    const nomeRistorante = (document.getElementById('nomeRistorante').value || '').trim();
    const piva = (document.getElementById('piva').value || '').trim();
    const telefono = (document.getElementById('telefono').value || '').trim();
    const indirizzo = (document.getElementById('indirizzo').value || '').trim();

    const piatti = Array.from(selectedMeals.values());

    if (!nomeRistorante || !piva || !telefono || !indirizzo) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    if (piatti.length === 0) {
      alert('Seleziona almeno un piatto per il tuo menu');
      return;
    }

    payload = { ...payload, nomeRistorante, piva, telefono, indirizzo, piatti };
  }

  const endpoint = userType === 'cliente' ? '/cliente' : '/ristoratore';
  try {
    console.log('Invio richiesta a:', endpoint);
    const res = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const json = await res.json();
    console.log('Risposta server:', json);
    
    if (res.ok && json._id) {
      alert('Registrazione completata! Effettua il login.');
      window.location.href = 'login.html';
    } else {
      alert('Errore registrazione: ' + (json.message || 'Errore sconosciuto'));
    }
  } catch (err) {
    console.error('Errore fetch:', err);
    alert('Errore di connessione al server: ' + err.message);
  }
}

Promise.all([loadCategorie(), loadMeals()]).catch(err => {
  console.error('Errore inizializzazione:', err);
  alert('Errore nel caricamento dei dati iniziali');
});