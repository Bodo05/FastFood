let loginType = 'cliente';

function setLoginType(type) {
  loginType = type;
  document.getElementById('btnCliente').classList.toggle('btn-primary', type === 'cliente');
  document.getElementById('btnCliente').classList.toggle('btn-outline-primary', type !== 'cliente');
  document.getElementById('btnRistoratore').classList.toggle('btn-secondary', type === 'ristoratore');
  document.getElementById('btnRistoratore').classList.toggle('btn-outline-secondary', type !== 'ristoratore');
}

async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    alert("Inserisci email e password");
    return;
  }

  const url = loginType === 'cliente' 
    ? 'http://localhost:3000/cliente/login' 
    : 'http://localhost:3000/ristoratore/login';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.status === 401) {
      alert('Credenziali errate');
      return;
    }
    
    if (!res.ok) {
      const error = await res.json();
      alert('Errore login: ' + (error.message || 'Errore sconosciuto'));
      return;
    }

    const data = await res.json();
    localStorage.setItem('_id', data._id);
    localStorage.setItem('userType', loginType);
    localStorage.setItem('email', email);

    window.location.href = loginType === 'cliente' ? 'cliente.html' : 'ristoratore.html';

  } catch (err) {
    console.error(err);
    alert('Errore di connessione al server');
  }
}