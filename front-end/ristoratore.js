const rId = localStorage.getItem('_id');
if(!rId || localStorage.getItem('userType') !== 'ristoratore') { alert('Login richiesto'); location.href='login.html'; }
function logout(){ localStorage.clear(); location.href='login.html'; }

async function loadMenu(){
  try {
    const res = await fetch(`http://localhost:3000/ristoratore/${rId}`);
    if(!res.ok) { alert('Errore'); return; }
    const r = await res.json();
    const cont = document.getElementById('menuContainer'); cont.innerHTML = '';
    (r.piatti || []).forEach(p => {
      const card = document.createElement('div'); card.className='card m-2'; card.style.width='180px';
      card.innerHTML = `<img src="${p.thumb||''}" style="height:100px;object-fit:cover" class="card-img-top">
        <div class="card-body p-2"><strong>${p.nome}</strong><div>€${p.price ?? '-'}</div><div>${p.prepTime ?? '-'} min</div></div>`;
      cont.appendChild(card);
    });
  } catch (err) { console.error(err); alert('Errore caricamento'); }
}
loadMenu();
