const rId = localStorage.getItem('_id');
if(!rId || localStorage.getItem('userType') !== 'ristoratore') { 
    // Fallback se showToast non esiste ancora (es. redirect immediato)
    alert('Login richiesto'); 
    location.href='login.html'; 
}

async function loadMenu(){
  try {
    const res = await fetch(`http://localhost:3000/ristoratore/${rId}`);
    if(!res.ok) { 
        if(typeof showToast === 'function') showToast('Errore caricamento menu', 'danger');
        return; 
    }
    const r = await res.json();
    const cont = document.getElementById('menuContainer'); 
    if(!cont) return; // Se non siamo nella pagina giusta

    cont.innerHTML = '';
    (r.piatti || []).forEach(p => {
      const card = document.createElement('div'); card.className='card m-2'; card.style.width='180px';
      card.innerHTML = `<img src="${p.thumb||''}" style="height:100px;object-fit:cover" class="card-img-top">
        <div class="card-body p-2"><strong>${p.nome}</strong><div>€${p.price ?? '-'}</div><div>${p.prepTime ?? '-'} min</div></div>`;
      cont.appendChild(card);
    });
  } catch (err) { 
    console.error(err); 
    if(typeof showToast === 'function') showToast('Errore caricamento', 'danger');
  }
}
// Chiamata automatica solo se necessario, ma meglio gestirla nell'HTML specifico
// loadMenu();